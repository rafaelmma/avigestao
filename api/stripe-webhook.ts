import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-12-15.clover' as any,
});

const db = admin.firestore();

// Disable body parser (Vercel)
export const config = {
  api: { bodyParser: false },
};

type VercelReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterator<Buffer>;
};

type VercelRes = {
  status: (code: number) => VercelRes;
  json: (data: any) => void;
  send: (data: any) => void;
};

// Set user as Pro in Firestore
const setUserAsPro = async (userId: string | null | undefined, customerId?: string | null) => {
  if (!userId) return;
  try {
    const proPayload = {
      plan: 'Profissional',
      trialEndDate: null,
      stripeCustomerId: customerId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(userId).set(proPayload, { merge: true });
    await Promise.all([
      db.collection('users').doc(userId).collection('settings').doc('preferences').set(proPayload, { merge: true }),
      db.collection('users').doc(userId).collection('settings').doc('general').set(proPayload, { merge: true }),
    ]);
  } catch (e) {
    console.error('Failed to mark user as PRO:', e);
  }
};

// Resolve userId from Stripe customer or subscription
const resolveUserIdFromStripe = async (params: {
  customerId?: string | null;
  subscriptionId?: string | null;
}) => {
  const { customerId, subscriptionId } = params;

  if (customerId) {
    const usersSnapshot = await db
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return usersSnapshot.docs[0].id;
    }
  }

  if (subscriptionId) {
    const usersSnapshot = await db
      .collection('users')
      .where('subscription.stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      return usersSnapshot.docs[0].id;
    }
  }

  return null;
};

// Record billing metrics
const recordBillingMetric = async (payload: {
  eventType: string;
  userId: string | null;
  subscriptionId: string | null;
  amount?: number | null;
  currency?: string | null;
  rawEvent: Stripe.Event;
}) => {
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
};

const handleCheckoutCompleted = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = (session.metadata?.userId || session.metadata?.user_id || null) as string | null;

  if (session.mode === 'subscription' && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

    // Save subscription to user document in Firestore
    if (userId) {
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
    }
  }

  await recordBillingMetric({
    eventType: 'checkout.session.completed',
    userId,
    subscriptionId: (session.subscription as string) ?? null,
    rawEvent: event,
  });
};

const handleSubscriptionUpdated = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;
  const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? null;

  // Find user by subscription ID
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
};

const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any)?.subscription ?? null;

  if (subId) {
    const userId = await resolveUserIdFromStripe({ subscriptionId: subId });

    if (userId) {
      await db
        .collection('users')
        .doc(userId)
        .set(
          {
            subscription: {
              status: 'past_due',
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
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
};

const handleInvoicePaymentSucceeded = async (event: Stripe.Event) => {
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
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const userId = await resolveUserIdFromStripe({ subscriptionId: subscription.id });

  if (userId) {
    await db
      .collection('users')
      .doc(userId)
      .set(
        {
          subscription: {
            status: 'canceled',
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const signature = Array.isArray(sig) ? sig[0] : sig;

  if (!signature) {
    return res.status(400).send('Missing Stripe signature');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err: any) {
    console.error('❌ Webhook signature error:', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        await handleInvoicePaymentSucceeded(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      default:
        // ignore other events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Webhook handler error:', err);
    return res.status(500).send('Webhook handler failed');
  }
}
