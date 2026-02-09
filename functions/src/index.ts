import * as functions from 'firebase-functions/v1';
import admin from 'firebase-admin';
import Stripe from 'stripe';
import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const getMercadoPagoClient = () => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN not configured');
  }
  return new MercadoPagoConfig({ accessToken });
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

// CORS middleware for uploadLogo
const corsHandler = cors({
  origin: ['https://avigestao.com.br', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// ============================================
// STRIPE WEBHOOK - Cloud Function Handler Nativo
// ============================================
export const stripeWebhook = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('URL:', req.url);
    console.log('req.headers content-type:', req.headers['content-type']);
    console.log(
      'req.rawBody type:',
      typeof req.rawBody,
      'is Buffer:',
      Buffer.isBuffer(req.rawBody),
    );

    if (req.method !== 'POST') {
      console.log('Rejecting non-POST request');
      res.status(405).send('Method not allowed');
      return;
    }

    // ⚠️ CRÍTICO: Usar req.rawBody como BUFFER, não como string!
    // Stripe assinou com esses bytes específicos - não pode converter para string
    if (!req.rawBody) {
      console.error('❌ req.rawBody não fornecido pelo Firebase');
      console.error('req.body type:', typeof req.body);
      res.status(400).send('rawBody not available');
      return;
    }

    // Converter para Buffer se for string (Firebase pode enviar ambos)
    const rawBodyBuffer: Buffer = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.from(req.rawBody, 'utf-8');

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      console.error('Missing Stripe signature header');
      res.status(400).send('Missing Stripe signature');
      return;
    }

    let event: Stripe.Event;

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured!');
        res.status(500).send('Webhook secret not configured');
        return;
      }

      console.log('✅ Raw body length:', rawBodyBuffer.length, 'bytes');
      console.log('✅ Signature found, first 50 chars:', sig.substring(0, 50));
      console.log('✅ Webhook secret first 10 chars:', webhookSecret.substring(0, 10));

      // Stripe.webhooks.constructEvent REQUER Buffer exato ou string exato
      // NÃO fazer conversões que alteram bytes!
      event = getStripe().webhooks.constructEvent(rawBodyBuffer, sig, webhookSecret);
      console.log('🎉🎉🎉 EVENT VERIFIED!!! Type:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook signature error:', err?.message);
      console.error('❌ Error code:', err?.code);
      res.status(400).send(`Webhook Error: ${err?.message}`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Processing checkout.session.completed');
          await handleCheckoutCompleted(event);
          break;
        case 'customer.subscription.updated':
          console.log('Processing customer.subscription.updated');
          await handleSubscriptionUpdated(event);
          break;
        case 'invoice.payment_failed':
          console.log('Processing invoice.payment_failed');
          await handleInvoicePaymentFailed(event);
          break;
        case 'invoice.payment_succeeded':
        case 'invoice.paid':
          console.log('Processing invoice.payment_succeeded');
          await handleInvoicePaymentSucceeded(event);
          break;
        case 'customer.subscription.deleted':
          console.log('Processing customer.subscription.deleted');
          await handleSubscriptionDeleted(event);
          break;
        default:
          console.log('Unhandled event type:', event.type);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('❌ Webhook handler error:', err);
      res.status(500).send('Webhook handler failed');
    }
  });

// Initialize Stripe (lazy load para evitar erro se apiKey vazio)
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripe = new Stripe(apiKey, {
      apiVersion: '2025-12-15.clover' as any,
    });
  }
  return stripe;
}

// ============================================
// CREATE CHECKOUT SESSION
// ============================================
export const createCheckoutSession = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        res.status(401).json({ error: 'Missing auth token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { priceId } = req.body;
      if (!priceId) {
        res.status(400).json({ error: 'Missing priceId' });
        return;
      }

      // Check if customer already exists
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      let customerId = userData?.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await getStripe().customers.create({
          email: decodedToken.email,
          metadata: { userId },
        });
        customerId = customer.id;

        await db.collection('users').doc(userId).set(
          {
            stripeCustomerId: customerId,
          },
          { merge: true },
        );
      }

      const session = await getStripe().checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `https://avigestao.com.br/settings?success=true`,
        cancel_url: `https://avigestao.com.br/settings?canceled=true`,
        metadata: { userId },
      });

      res.status(200).json({ url: session.url, customerId });
    } catch (err: any) {
      console.error('Checkout error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// CREATE PORTAL SESSION
// ============================================
export const createPortalSession = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        res.status(401).json({ error: 'Missing auth token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      const customerId = userDoc.data()?.stripeCustomerId;

      if (!customerId) {
        res.status(400).json({ error: 'No Stripe customer found' });
        return;
      }

      const session = await getStripe().billingPortal.sessions.create({
        customer: customerId,
        return_url: `https://avigestao.com.br/settings`,
      });

      res.status(200).json({ url: session.url });
    } catch (err: any) {
      console.error('Portal error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// MERCADO PAGO - CREATE CHECKOUT (PIX)
// ============================================
export const createMercadoPagoCheckout = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        res.status(401).json({ error: 'Missing auth token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      if (!userId) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      const { planId, planLabel, price, months } = req.body || {};
      if (!planId || !price || !months) {
        res.status(400).json({ error: 'Missing plan data' });
        return;
      }

      const mp = getMercadoPagoClient();
      const preference = new Preference(mp);
      const frontendUrl = process.env.FRONTEND_URL || 'https://avigestao-cf5fe.web.app';
      const webhookUrl =
        process.env.MERCADOPAGO_WEBHOOK_URL ||
        'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/mercadoPagoWebhook';

      const payerEmail = (req.body?.payerEmail || process.env.MERCADOPAGO_TEST_PAYER_EMAIL) as
        | string
        | undefined;

      const response = await preference.create({
        body: {
          items: [
            {
              id: String(planId),
              title: `Plano Profissional - ${planLabel || planId}`,
              quantity: 1,
              unit_price: Number(price),
              currency_id: 'BRL',
            },
          ],
          ...(payerEmail ? { payer: { email: payerEmail } } : {}),
          external_reference: userId,
          notification_url: webhookUrl,
          back_urls: {
            success: `${frontendUrl}/settings?success=true`,
            pending: `${frontendUrl}/settings?pending=true`,
            failure: `${frontendUrl}/settings?canceled=true`,
          },
          auto_return: 'approved',
          metadata: {
            userId,
            planId,
            planLabel,
            months: Number(months),
          },
        },
      });

      const useSandbox = process.env.MERCADOPAGO_USE_SANDBOX === 'true';
      const checkoutUrl = useSandbox ? response.sandbox_init_point : response.init_point;

      res.status(200).json({ url: checkoutUrl, preferenceId: response.id });
    } catch (err: any) {
      console.error('MercadoPago checkout error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// MERCADO PAGO - WEBHOOK
// ============================================
export const mercadoPagoWebhook = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    try {
      if (req.method !== 'POST' && req.method !== 'GET') {
        res.status(405).send('Method not allowed');
        return;
      }

      const rawId = (req.body?.data?.id || req.query['data.id'] || req.query?.id) as
        | string
        | undefined;
      const topic = (req.body?.type || req.query?.type || req.query?.topic) as string | undefined;
      const resource = (req.body?.resource || req.query?.resource) as string | undefined;

      console.log('MercadoPago webhook received', {
        topic,
        rawId,
        resource,
      });

      const parseId = () => {
        if (rawId && /^\d+$/.test(rawId)) return rawId;
        if (resource) {
          const match = resource.match(/\/(payments|merchant_orders)\/(\d+)/);
          if (match?.[2]) return match[2];
        }
        return undefined;
      };

      const dataId = parseId();

      if (!dataId) {
        res.status(200).send('ignored');
        return;
      }

      const mp = getMercadoPagoClient();
      const paymentApi = new Payment(mp);
      let paymentId: string | number | undefined = dataId;

      if (topic === 'merchant_order') {
        const merchantOrderApi = new MerchantOrder(mp);
        const merchantOrder = await (merchantOrderApi as any).get({ id: dataId });
        const orderPayment = (merchantOrder as any)?.payments?.find(
          (p: any) => p?.status === 'approved' || p?.status === 'pending',
        );
        paymentId = orderPayment?.id;
        if (!paymentId) {
          res.status(200).send('pending');
          return;
        }
      }

      let payment: any;
      try {
        payment = await paymentApi.get({ id: paymentId as any });
      } catch (err: any) {
        if (err?.status === 404) {
          res.status(200).send('pending');
          return;
        }
        throw err;
      }

      if (!payment) {
        res.status(200).send('not_found');
        return;
      }

      console.log('MercadoPago payment fetched', {
        id: payment?.id,
        status: payment?.status,
        status_detail: payment?.status_detail,
        external_reference: payment?.external_reference,
        metadata: payment?.metadata,
      });

      if (payment.status !== 'approved') {
        res.status(200).send('pending');
        return;
      }

      const userId = (payment.metadata as any)?.userId || payment.external_reference;
      if (!userId) {
        console.error('MercadoPago payment missing userId/external_reference');
        res.status(200).send('missing_user');
        return;
      }
      const months = Number((payment.metadata as any)?.months || 1);

      if (userId) {
        const userRef = db.collection('users').doc(String(userId));
        const settingsRef = userRef.collection('settings').doc('preferences');
        const [userDoc, settingsDoc] = await Promise.all([userRef.get(), settingsRef.get()]);

        const existingEnd =
          settingsDoc.data()?.subscriptionEndDate || userDoc.data()?.subscriptionEndDate;
        const now = new Date();
        let baseDate = existingEnd ? new Date(existingEnd) : now;
        if (isNaN(baseDate.getTime()) || baseDate < now) {
          baseDate = now;
        }

        const endDate = addMonths(baseDate, months);

        await userRef.set(
          {
            plan: 'Profissional',
            trialEndDate: null,
            subscriptionEndDate: endDate.toISOString(),
            subscriptionCancelAtPeriodEnd: false,
            subscriptionStatus: payment.status || 'approved',
            subscriptionProvider: 'mercadopago',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        await settingsRef.set(
          {
            plan: 'Profissional',
            trialEndDate: admin.firestore.FieldValue.delete(),
            subscriptionEndDate: endDate.toISOString(),
            subscriptionCancelAtPeriodEnd: false,
            subscriptionStatus: payment.status || 'approved',
            subscriptionProvider: 'mercadopago',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      res.status(200).send('ok');
    } catch (err: any) {
      console.error('MercadoPago webhook error:', err);
      res.status(500).send('error');
    }
  });

// ============================================
// SUBSCRIPTION STATUS
// ============================================
export const getSubscriptionStatus = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string') {
        res.status(401).json({ error: 'Missing auth token' });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (!userData?.subscription) {
        res.status(200).json({ isActive: false });
        return;
      }

      const subscription = userData.subscription;
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';

      res.status(200).json({
        isActive,
        status: subscription.status,
        current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: subscription.cancelAtPeriodEnd || false,
        isTrial: subscription.status === 'trialing',
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

// ============================================
// WEBHOOK HANDLERS
// ============================================
async function setUserAsPro(userId: string | null, customerId?: string | null) {
  if (!userId) {
    console.warn('setUserAsPro - userId is null, returning');
    return;
  }
  try {
    console.log('setUserAsPro - Setting user', userId, 'as PRO with customerId', customerId);
    await db
      .collection('users')
      .doc(userId)
      .set(
        {
          plan: 'Profissional',
          trialEndDate: admin.firestore.FieldValue.delete(), // APAGAR o campo trialEndDate
          stripeCustomerId: customerId || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    console.log('✅ setUserAsPro - Successfully marked', userId, 'as PRO');
  } catch (e) {
    console.error('❌ Failed to mark user as PRO:', e);
  }
}

async function resolveUserIdFromStripe(params: {
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const { customerId, subscriptionId } = params;

  if (customerId) {
    const snapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    if (!snapshot.empty) return snapshot.docs[0].id;
  }

  if (subscriptionId) {
    const snapshot = await db
      .collection('users')
      .where('subscription.stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();
    if (!snapshot.empty) return snapshot.docs[0].id;
  }

  return null;
}

async function recordBillingMetric(payload: {
  eventType: string;
  userId: string | null;
  subscriptionId: string | null;
  amount?: number | null;
  currency?: string | null;
  rawEvent: Stripe.Event;
}) {
  try {
    await db.collection('billing_metrics').add({
      eventType: payload.eventType,
      userId: payload.userId,
      subscriptionId: payload.subscriptionId,
      amount: payload.amount ?? null,
      currency: payload.currency ?? null,
      rawEvent: JSON.parse(JSON.stringify(payload.rawEvent)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error(`Failed to write billing metric for ${payload.eventType}`, e);
  }
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = (session.metadata?.userId || session.metadata?.user_id || null) as string | null;

  console.log('handleCheckoutCompleted - session metadata:', session.metadata);
  console.log('handleCheckoutCompleted - extracted userId:', userId);
  console.log('handleCheckoutCompleted - session.mode:', session.mode);
  console.log('handleCheckoutCompleted - session.subscription:', session.subscription);

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
    const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

    console.log('handleCheckoutCompleted - subscription retrieved, status:', subscription.status);

    if (userId) {
      console.log('handleCheckoutCompleted - Updating user', userId, 'to PRO');
      await db
        .collection('users')
        .doc(userId)
        .set(
          {
            email: session.customer_email ?? null,
            stripeCustomerId: session.customer ?? null,
            subscription: {
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
              cancelAtPeriodEnd: false,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      await setUserAsPro(userId, session.customer as string);
      console.log('✅ User', userId, 'marked as PRO');
    } else {
      console.warn('⚠️ handleCheckoutCompleted - userId is null! Cannot update user');
    }
  } else {
    console.log('handleCheckoutCompleted - Not a subscription or no subscription ID');
  }

  await recordBillingMetric({
    eventType: 'checkout.session.completed',
    userId,
    subscriptionId: (session.subscription as string) ?? null,
    rawEvent: event,
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;
  const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? null;

  const userId = await resolveUserIdFromStripe({ subscriptionId: subscription.id });

  if (userId) {
    await db
      .collection('users')
      .doc(userId)
      .set(
        {
          subscription: {
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
            cancelAtPeriodEnd: cancelAtPeriodEnd,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await setUserAsPro(userId, (subscription as any)?.customer);
    }
  }
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any)?.subscription ?? null;

  if (subId) {
    const userId = await resolveUserIdFromStripe({ subscriptionId: subId });

    if (userId) {
      console.log('⚠️ Payment failed for user:', userId);

      // Mark subscription as past_due
      await db
        .collection('users')
        .doc(userId)
        .update({
          subscription: { status: 'past_due' },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Also update settings subcollection
      try {
        await db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('preferences')
          .update({
            subscription: { status: 'past_due' },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      } catch (err) {
        console.log("Settings doc doesn't exist yet, skipping");
      }
    }
  }

  const customerId = (invoice as any)?.customer ?? null;
  const userId = await resolveUserIdFromStripe({ customerId, subscriptionId: subId });

  await recordBillingMetric({
    eventType: 'invoice.payment_failed',
    userId,
    subscriptionId: subId,
    amount: invoice.amount_due ?? null ? Number((invoice.amount_due as number) / 100) : null,
    currency: invoice.currency ?? null,
    rawEvent: event,
  });
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any)?.subscription ?? null;
  const customerId = (invoice as any)?.customer ?? null;

  const userId = await resolveUserIdFromStripe({ customerId, subscriptionId: subId });

  await recordBillingMetric({
    eventType: 'invoice.payment_succeeded',
    userId,
    subscriptionId: subId,
    amount: invoice.amount_paid ?? null ? Number((invoice.amount_paid as number) / 100) : null,
    currency: invoice.currency ?? null,
    rawEvent: event,
  });

  const invoicePaid = invoice.status === 'paid' || (invoice as any)?.paid;
  if (userId && invoicePaid) {
    await setUserAsPro(userId, customerId);
  }
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromStripe({ subscriptionId: subscription.id });

  if (userId) {
    console.log('🗑️ Subscription deleted for user:', userId);

    // Downgrade user to Básico
    await db
      .collection('users')
      .doc(userId)
      .update({
        plan: 'Básico',
        subscription: { status: 'canceled' },
        trialEndDate: admin.firestore.FieldValue.delete(),
        subscriptionEndDate: '',
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Also update settings subcollection
    try {
      await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences')
        .update({
          plan: 'Básico',
          subscription: { status: 'canceled' },
          trialEndDate: admin.firestore.FieldValue.delete(),
          subscriptionEndDate: '',
          subscriptionCancelAtPeriodEnd: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
      console.log("Settings doc doesn't exist yet, skipping");
    }

    console.log('✅ User downgraded to Básico after subscription deletion');
  }
}

// ============================================
// DEBUG CLEANUP FUNCTION (TEMPORARY)
// ============================================
export const debugReadUser = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (token !== 'debug123456') {
      res.status(403).send('Unauthorized');
      return;
    }

    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      const userDoc = await db
        .collection('users')
        .doc(userId as string)
        .get();

      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const allData = userDoc.data();

      console.log('==== FIRESTORE USER DOCUMENT ====');
      console.log('User ID:', userId);
      console.log('All fields:', JSON.stringify(allData, null, 2));
      console.log('Document exists:', userDoc.exists);
      console.log('==================================');

      // Force DELETE trialEndDate if it exists
      let deleteResult: any = { attempted: false, success: false, error: null };
      if (allData?.trialEndDate !== undefined) {
        try {
          await db
            .collection('users')
            .doc(userId as string)
            .update({
              trialEndDate: admin.firestore.FieldValue.delete(),
            });
          deleteResult = { attempted: true, success: true, error: null };
          console.log('✅ DELETED trialEndDate');
        } catch (deleteErr) {
          deleteResult = { attempted: true, success: false, error: String(deleteErr) };
          console.log('❌ DELETE FAILED:', deleteErr);
        }
      }

      // Re-read after deletion
      const updatedDoc = await db
        .collection('users')
        .doc(userId as string)
        .get();
      const updatedData = updatedDoc.data();

      res.status(200).json({
        userFound: true,
        beforeDelete: {
          allFields: allData,
          trialEndDate: allData?.trialEndDate,
          trialEndDateExists: allData?.trialEndDate !== undefined,
          plan: allData?.plan,
        },
        deleteOperation: deleteResult,
        afterDelete: {
          allFields: updatedData,
          trialEndDate: updatedData?.trialEndDate,
          trialEndDateExists: updatedData?.trialEndDate !== undefined,
          plan: updatedData?.plan,
        },
      });
    } catch (err: any) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

export const forcePROStatus = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (token !== 'pro789') {
      res.status(403).send('Unauthorized');
      return;
    }

    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      console.log('FORCING PRO STATUS for:', userId);

      // ===== DELETE FROM users/{userId} =====
      const userRef = db.collection('users').doc(userId as string);
      const userDoc = await userRef.get();
      const before_user = userDoc.data();

      await userRef.update({
        plan: 'Profissional',
        trialEndDate: admin.firestore.FieldValue.delete(),
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ===== DELETE FROM users/{userId}/settings/preferences =====
      const settingsRef = db
        .collection('users')
        .doc(userId as string)
        .collection('settings')
        .doc('preferences');
      const settingsDoc = await settingsRef.get();
      const before_settings = settingsDoc.data();

      if (settingsDoc.exists) {
        await settingsRef.update({
          plan: 'Profissional',
          trialEndDate: admin.firestore.FieldValue.delete(),
          subscriptionCancelAtPeriodEnd: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Re-read both
      const after_user = await userRef.get();
      const after_settings = await settingsRef.get();

      console.log('✅ FORCE PRO completed');
      console.log('User doc before:', before_user?.plan, before_user?.trialEndDate);
      console.log('Settings doc before:', before_settings?.plan, before_settings?.trialEndDate);
      console.log('User doc after:', after_user.data()?.plan, after_user.data()?.trialEndDate);
      console.log(
        'Settings doc after:',
        after_settings.data()?.plan,
        after_settings.data()?.trialEndDate,
      );

      res.status(200).json({
        success: true,
        message: 'PRO status forced on both docs',
        userDoc: {
          before: {
            plan: before_user?.plan,
            trialEndDate: before_user?.trialEndDate,
          },
          after: {
            plan: after_user.data()?.plan,
            trialEndDate: after_user.data()?.trialEndDate,
          },
        },
        settingsDoc: {
          before: {
            plan: before_settings?.plan,
            trialEndDate: before_settings?.trialEndDate,
          },
          after: {
            plan: after_settings.data()?.plan,
            trialEndDate: after_settings.data()?.trialEndDate,
          },
        },
      });
    } catch (err: any) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

export const debugCleanupTrial = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (token !== 'debug123456') {
      res.status(403).send('Unauthorized');
      return;
    }

    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      console.log('DEBUG: Force cleanup trial for user:', userId);

      // Force delete any trial-related fields
      await db
        .collection('users')
        .doc(userId as string)
        .update({
          plan: 'Profissional',
          trialEndDate: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Verify
      const updatedDoc = await db
        .collection('users')
        .doc(userId as string)
        .get();

      res.status(200).json({
        success: true,
        message: 'Trial cleanup completed',
        finalState: updatedDoc.data(),
      });
    } catch (err: any) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// INITIALIZE NEW USER WITH 7-DAY TRIAL
// ============================================
export const initializeNewUser = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).send('Unauthorized');
      return;
    }

    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      console.log('🆕 Initializing new user:', userId);

      // Calculate trial end date (7 days from now)
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const trialEndDate = trialEnd.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Create settings subcollection with trial
      const settingsRef = db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences');

      await settingsRef.set(
        {
          plan: 'Básico',
          trialEndDate: trialEndDate,
          breederName: 'Meu Criatório',
          cpfCnpj: '',
          breederCategory: '',
          responsibleName: '',
          speciesRaised: '',
          breederEmail: '',
          breederPhone: '',
          breederMobile: '',
          breederWebsite: '',
          addressCep: '',
          addressStreet: '',
          addressNumber: '',
          addressNeighborhood: '',
          addressCity: '',
          addressState: '',
          addressComplement: '',
          sispassNumber: '',
          registrationDate: admin.firestore.FieldValue.serverTimestamp(),
          renewalDate: '',
          lastRenewalDate: '',
          certificate: {
            issuer: '',
            expiryDate: '',
            installed: false,
            type: 'A1 (Arquivo)',
          },
          logoUrl: '/logo.png',
          primaryColor: '#10B981',
          accentColor: '#F59E0B',
          subscriptionEndDate: '',
          subscriptionCancelAtPeriodEnd: false,
          subscriptionStatus: '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Also create main user doc if doesn't exist
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set(
          {
            plan: 'Básico',
            trialEndDate: trialEndDate,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      console.log('✅ User initialized with 7-day trial until:', trialEndDate);

      res.status(200).json({
        success: true,
        userId,
        trialEndDate,
        message: `User initialized with 7-day trial until ${trialEndDate}`,
      });
    } catch (err: any) {
      console.error('Error initializing user:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// DOWNGRADE USER FROM PRO TO BASIC (AFTER SUBSCRIPTION EXPIRES)
// ============================================
export const downgradeExpiredSubscription = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).send('Unauthorized');
      return;
    }

    const userId = req.query.userId || req.body.userId;
    if (!userId) {
      res.status(400).send('Missing userId');
      return;
    }

    try {
      console.log('📉 Downgrading user:', userId);

      // Update main user doc
      await db.collection('users').doc(userId).update({
        plan: 'Básico',
        trialEndDate: admin.firestore.FieldValue.delete(),
        subscriptionEndDate: '',
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update settings subcollection
      await db.collection('users').doc(userId).collection('settings').doc('preferences').update({
        plan: 'Básico',
        trialEndDate: admin.firestore.FieldValue.delete(),
        subscriptionEndDate: '',
        subscriptionCancelAtPeriodEnd: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('✅ User downgraded to Básico');

      res.status(200).json({
        success: true,
        userId,
        newPlan: 'Básico',
        message: 'User downgraded to Básico',
      });
    } catch (err: any) {
      console.error('Error downgrading user:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// UPLOAD LOGO - Firebase Functions v2 with CORS
// ============================================
export const uploadLogo = functions.region('southamerica-east1').https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const token = req.headers.authorization?.replace('Bearer ', '')?.trim();
      if (!token) {
        return res.status(401).json({ error: 'No token' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      const { fileData, fileName } = req.body;
      if (!fileData || !fileName) {
        return res.status(400).json({ error: 'Missing data' });
      }

      const buffer = Buffer.from(fileData, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'File too large' });
      }

      const bucket = admin.storage().bucket();
      const filePath = `logos/${userId}/${Date.now()}_${fileName}`;
      const file = bucket.file(filePath);

      await file.save(buffer, {
        metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
      });

      await file.makePublic();
      const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      await db.collection('users').doc(userId).update({
        logoUrl: downloadUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ success: true, downloadUrl });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      return res.status(500).json({ error: err.message });
    }
  });
});
