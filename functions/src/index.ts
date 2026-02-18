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
// MAILERSEND HELPERS
// ============================================
const resolveMailerSendToken = () => {
  let envConfig: { mailersend?: { api_token?: string } } = {};
  if (process.env.FUNCTIONS_CONFIG) {
    try {
      envConfig = JSON.parse(process.env.FUNCTIONS_CONFIG) as {
        mailersend?: { api_token?: string };
      };
    } catch {
      envConfig = {};
    }
  }
  return (
    process.env.MAILERSEND_API_TOKEN || envConfig?.mailersend?.api_token || ''
  );
};

const hasMailerSendToken = () => !!resolveMailerSendToken();

const getMailerSendToken = () => {
  const token = resolveMailerSendToken();
  if (!token) {
    throw new Error('MAILERSEND_API_TOKEN not configured');
  }
  return token;
};

const sendMailerSendEmail = async (payload: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}) => {
  const token = getMailerSendToken();

  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      from: { email: 'contato@avigestao.com.br', name: 'AviGestao' },
      to: [{ email: payload.to }],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`MailerSend error: ${response.status} ${errorBody}`);
  }
};

const APP_URL = 'https://avigestao.com.br';
const SUPPORT_EMAIL = 'contato@avigestao.com.br';

const getUserContactInfo = async (
  userId: string | null,
  fallbackEmail?: string | null,
): Promise<{ email: string | null; name: string }> => {
  if (!userId) {
    return { email: fallbackEmail ?? null, name: 'Criador' };
  }

  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.exists ? userDoc.data() : undefined;

  const settingsDoc = await db
    .collection('users')
    .doc(userId)
    .collection('settings')
    .doc('preferences')
    .get();
  const settingsData = settingsDoc.exists ? settingsDoc.data() : undefined;

  const email =
    (userData?.email as string | undefined) ||
    (settingsData?.breederEmail as string | undefined) ||
    (fallbackEmail ?? null);
  const name =
    (settingsData?.breederName as string | undefined) ||
    (userData?.breederName as string | undefined) ||
    'Criador';

  return { email: email ?? null, name };
};

type TransactionalTemplateType =
  | 'welcome'
  | 'welcome-pro'
  | 'payment-success'
  | 'payment-failed'
  | 'subscription-canceled'
  | 'subscription-cancel-scheduled';

const buildTransactionalTemplate = (type: TransactionalTemplateType, data: { name: string }) => {
  const base = {
    footer: `Se precisar de ajuda, fale com a gente: ${SUPPORT_EMAIL}`,
    appUrl: APP_URL,
  };

  switch (type) {
    case 'welcome':
      return {
        subject: 'Bem-vindo ao AviGestao!',
        text: `Ola ${data.name}, sua conta foi verificada com sucesso. Acesse ${base.appUrl} para comecar.\n\n${base.footer}`,
        html: `
          <h2>Bem-vindo ao AviGestao!</h2>
          <p>Ola <strong>${data.name}</strong>, sua conta foi verificada com sucesso.</p>
          <p>Acesse <a href="${base.appUrl}">AviGestao</a> para comecar.</p>
          <p>${base.footer}</p>
        `,
      };
    case 'welcome-pro':
      return {
        subject: 'Bem-vindo ao Plano Profissional!',
        text: `Ola ${data.name}, seu plano Profissional esta ativo. Acesse ${base.appUrl} para aproveitar todos os recursos.\n\n${base.footer}`,
        html: `
          <h2>Bem-vindo ao Plano Profissional!</h2>
          <p>Ola <strong>${data.name}</strong>, seu plano Profissional esta ativo.</p>
          <p>Acesse <a href="${base.appUrl}">AviGestao</a> para aproveitar todos os recursos.</p>
          <p>${base.footer}</p>
        `,
      };
    case 'payment-success':
      return {
        subject: 'Pagamento confirmado',
        text: `Ola ${data.name}, seu pagamento foi confirmado. Seu acesso esta ativo.\n\n${base.footer}`,
        html: `
          <h2>Pagamento confirmado</h2>
          <p>Ola <strong>${data.name}</strong>, seu pagamento foi confirmado.</p>
          <p>Seu acesso esta ativo e liberado.</p>
          <p>${base.footer}</p>
        `,
      };
    case 'payment-failed':
      return {
        subject: 'Falha no pagamento',
        text: `Ola ${data.name}, houve uma falha no pagamento. Por favor, atualize seus dados no painel.\n\n${base.footer}`,
        html: `
          <h2>Falha no pagamento</h2>
          <p>Ola <strong>${data.name}</strong>, tivemos uma falha no pagamento.</p>
          <p>Atualize seus dados no painel para evitar interrupcao.</p>
          <p>${base.footer}</p>
        `,
      };
    case 'subscription-cancel-scheduled':
      return {
        subject: 'Cancelamento agendado',
        text: `Ola ${data.name}, seu cancelamento foi agendado. Seu acesso segue ativo ate o fim do periodo.\n\n${base.footer}`,
        html: `
          <h2>Cancelamento agendado</h2>
          <p>Ola <strong>${data.name}</strong>, seu cancelamento foi agendado.</p>
          <p>Seu acesso segue ativo ate o fim do periodo.</p>
          <p>${base.footer}</p>
        `,
      };
    case 'subscription-canceled':
      return {
        subject: 'Assinatura cancelada',
        text: `Ola ${data.name}, sua assinatura foi cancelada. Se quiser reativar, acesse ${base.appUrl}.\n\n${base.footer}`,
        html: `
          <h2>Assinatura cancelada</h2>
          <p>Ola <strong>${data.name}</strong>, sua assinatura foi cancelada.</p>
          <p>Se quiser reativar, acesse <a href="${base.appUrl}">AviGestao</a>.</p>
          <p>${base.footer}</p>
        `,
      };
    default:
      return {
        subject: 'Atualizacao da sua conta',
        text: `Ola ${data.name}, houve uma atualizacao na sua conta.\n\n${base.footer}`,
        html: `
          <h2>Atualizacao da sua conta</h2>
          <p>Ola <strong>${data.name}</strong>, houve uma atualizacao na sua conta.</p>
          <p>${base.footer}</p>
        `,
      };
  }
};

// ============================================
// CONTACT FORM EMAIL
// ============================================
export const contactFormEmail = functions
  .region('southamerica-east1')
  .runWith({ secrets: ['MAILERSEND_API_TOKEN'] })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { name, email, message, phone, subject: contactSubject } = req.body || {};

      if (!name || !email || !message) {
        res.status(400).json({ error: 'Missing name, email, or message' });
        return;
      }

      if (!hasMailerSendToken()) {
        const hasEnv = !!process.env.MAILERSEND_API_TOKEN;
        const hasFunctionsConfig = !!process.env.FUNCTIONS_CONFIG;
        console.warn('contactFormEmail: MailerSend token missing', {
          hasEnv,
          hasFunctionsConfig,
        });
        res.status(503).json({ error: 'Email service not configured' });
        return;
      }

      const subject = `Contato do site: ${name}${contactSubject ? ` - ${contactSubject}` : ''}`;
      const text = `Nome: ${name}\nEmail: ${email}\nTelefone: ${phone || '-'}\nAssunto: ${contactSubject || '-'}\n\nMensagem:\n${message}`;
      const html = `
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefone:</strong> ${phone || '-'}</p>
        <p><strong>Assunto:</strong> ${contactSubject || '-'}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${String(message).replace(/\n/g, '<br />')}</p>
      `;

      try {
        await sendMailerSendEmail({
          to: 'contato@avigestao.com.br',
          subject,
          text,
          html,
          replyTo: email,
        });
        res.status(200).json({ ok: true });
      } catch (err: any) {
        console.error('contactFormEmail error:', err?.message || err);
        res.status(500).json({ error: 'Email send failed' });
      }
    });
  });

// ============================================
// TRANSACTIONAL EMAIL (AUTH REQUIRED)
// ============================================
export const sendTransactionalEmail = functions
  .region('southamerica-east1')
  .runWith({ secrets: ['MAILERSEND_API_TOKEN'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const subject = String(data?.subject || '').trim();
    const html = data?.html ? String(data.html) : undefined;
    const text = data?.text ? String(data.text) : undefined;
    const to = data?.to ? String(data.to) : context.auth.token.email;

    if (!to || !subject || (!html && !text)) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing email content');
    }

    // Segurança: só permite enviar para o próprio email (a menos que seja admin via custom claim)
    const isAdmin = !!context.auth.token.admin;
    if (!isAdmin && to !== context.auth.token.email) {
      throw new functions.https.HttpsError('permission-denied', 'Not allowed to email this recipient');
    }

    await sendMailerSendEmail({ to, subject, html, text });
    return { ok: true };
  });

export const sendWelcomeEmailIfNeeded = functions
  .region('southamerica-east1')
  .runWith({ secrets: ['MAILERSEND_API_TOKEN'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    if (!hasMailerSendToken()) {
      console.warn('MAILERSEND_API_TOKEN not configured; skipping welcome email.');
      return { ok: true, skipped: true, reason: 'missing-mailer-token' };
    }

    const optIn = data?.optIn !== false;
    if (!optIn) {
      return { ok: true, skipped: true, reason: 'opt-out' };
    }

    const userId = context.auth.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data()?.welcomeEmailSent) {
      return { ok: true, skipped: true, reason: 'already-sent' };
    }

    const contact = await getUserContactInfo(userId, context.auth.token.email ?? null);
    if (!contact.email) {
      throw new functions.https.HttpsError('failed-precondition', 'Missing email');
    }

    const template = buildTransactionalTemplate('welcome', { name: contact.name });
    await sendMailerSendEmail({ to: contact.email, ...template });

    await userRef.set(
      {
        welcomeEmailSent: true,
        welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  });

// ============================================
// COMMUNITY POSTS AGGREGATION
// Increment author's community post counter on create, decrement on delete
// ============================================
export const onCommunityPostCreate = functions
  .region('southamerica-east1')
  .firestore.document('community_posts/{postId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const authorId = data?.authorId;
    if (!authorId) return null;

    const userRef = db.collection('users').doc(authorId);
    await userRef.set(
      {
        communityStats: {
          postCount: admin.firestore.FieldValue.increment(1),
        },
      },
      { merge: true },
    );
    return null;
  });

export const onCommunityPostDelete = functions
  .region('southamerica-east1')
  .firestore.document('community_posts/{postId}')
  .onDelete(async (snap, context) => {
    const data = snap.data();
    const authorId = data?.authorId;
    if (!authorId) return null;

    const userRef = db.collection('users').doc(authorId);
    await userRef.set(
      {
        communityStats: {
          postCount: admin.firestore.FieldValue.increment(-1),
        },
      },
      { merge: true },
    );
    return null;
  });

// ============================================
// COMMUNITY MESSAGES NOTIFICATION
// ============================================
export const onCommunityMessageCreate = functions
  .region('southamerica-east1')
  .firestore.document('community_messages/{messageId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    const toUserId = data?.toUserId as string | undefined;
    const fromName = (data?.fromName as string | undefined) || 'Criador';
    const text = (data?.text as string | undefined) || '';

    if (!toUserId) return null;

    const contact = await getUserContactInfo(toUserId, null);

    const subject = 'Nova mensagem na comunidade';
    const preview = text.length > 140 ? `${text.slice(0, 140)}...` : text;
    const textBody = `Ola ${contact.name},\n\nVoce recebeu uma nova mensagem de ${fromName} na comunidade do AviGestao.\n\nMensagem:\n${preview}\n\nAcesse ${APP_URL} para responder.\n\n${SUPPORT_EMAIL}`;
    const htmlBody = `
      <p>Ola <strong>${contact.name}</strong>,</p>
      <p>Voce recebeu uma nova mensagem de <strong>${fromName}</strong> na comunidade do AviGestao.</p>
      <p><strong>Mensagem:</strong></p>
      <p>${String(preview).replace(/\n/g, '<br />')}</p>
      <p>Acesse <a href="${APP_URL}">${APP_URL}</a> para responder.</p>
      <p>${SUPPORT_EMAIL}</p>
    `;

    if (hasMailerSendToken() && contact.email) {
      try {
        await sendMailerSendEmail({
          to: contact.email,
          subject,
          text: textBody,
          html: htmlBody,
        });
      } catch (err: any) {
        console.error('onCommunityMessageCreate email error:', err?.message || err);
      }
    } else {
      console.warn('onCommunityMessageCreate: email skipped (missing token or recipient email)');
    }

    try {
      const userDoc = await db.collection('users').doc(toUserId).get();
      const userData = userDoc.exists ? userDoc.data() : undefined;
      const tokens = (userData?.fcmTokens as string[] | undefined) || [];
      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: 'Nova mensagem na comunidade',
            body: `${fromName}: ${preview}`,
          },
          data: {
            type: 'community_message',
          },
        });
      }
    } catch (err: any) {
      console.error('onCommunityMessageCreate push error:', err?.message || err);
    }

    return null;
  });

// ============================================
// ADMIN: Delete community post (safe)
// Callable by admins only. Deletes post doc, comments, reports and storage attachments.
// ============================================
export const adminDeleteCommunityPost = functions
  .region('southamerica-east1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const callerUid = context.auth.uid;

    // Quick check for admin custom claim
    const isAdminClaim = !!context.auth.token?.admin;

    let isAdmin = isAdminClaim;
    if (!isAdmin) {
      const userDoc = await db.collection('users').doc(callerUid).get();
      isAdmin = !!(userDoc.exists && userDoc.data()?.isAdmin);
    }

    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }

    const postId = String(data?.postId || '').trim();
    if (!postId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing postId');
    }

    const postRef = db.collection('community_posts').doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Post not found');
    }

    const postData = postSnap.data() || {};
    const attachments: string[] = Array.isArray(postData.attachments) ? postData.attachments : [];

    // Delete attachments from Storage (best-effort)
    const bucket = admin.storage().bucket();
    for (const url of attachments) {
      try {
        // Attempt to parse a Google Storage download URL and extract object path
        // URL form: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
        const m = String(url).match(/\/o\/([^?]+)/);
        const objectPath = m ? decodeURIComponent(m[1]) : null;
        if (objectPath) {
          await bucket.file(objectPath).delete().catch((err) => {
            console.warn('[adminDeleteCommunityPost] failed delete file', objectPath, err?.message || err);
          });
        } else {
          // Fallback: try to find the known prefix
          const idx = String(url).indexOf('/community_posts/attachments/');
          if (idx >= 0) {
            const path = decodeURIComponent(url.slice(idx + 1));
            await bucket.file(path).delete().catch(() => {});
          }
        }
      } catch (err) {
        console.error('[adminDeleteCommunityPost] attachment delete error', err);
      }
    }

    // Delete reports & comments subcollections (batched best-effort)
    const deletes: Promise<any>[] = [];

    const reportsSnap = await postRef.collection('reports').get();
    reportsSnap.forEach((r) => deletes.push(postRef.collection('reports').doc(r.id).delete()));

    const commentsSnap = await postRef.collection('comments').get();
    commentsSnap.forEach((c) => deletes.push(postRef.collection('comments').doc(c.id).delete()));

    try {
      await Promise.all(deletes);
    } catch (err) {
      console.warn('[adminDeleteCommunityPost] subcollection deletes had errors', err);
    }

    // Finally remove the post document

    
    await postRef.delete();

    return { ok: true };
  });

// ============================================
// STRIPE WEBHOOK - Cloud Function Handler Nativo
// ============================================
export const stripeWebhook = functions
  .region('southamerica-east1')
  .runWith({ secrets: ['MAILERSEND_API_TOKEN'] })
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

      console.log('Stripe Checkout Request:', { userId, priceId });

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

      console.log('Stripe Session Created:', { sessionId: session.id, url: session.url });
      res.status(200).json({ url: session.url, customerId });
    } catch (err: any) {
      console.error('Checkout error:', {
        message: err.message,
        stack: err.stack,
      });
      res.status(500).json({ 
        error: err.message || 'Erro ao criar checkout',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined 
      });
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

      // Get user email from Firebase
      const userRecord = await admin.auth().getUser(userId);
      const payerEmail = userRecord.email || decodedToken.email;

      if (!payerEmail) {
        res.status(400).json({ error: 'User email not found' });
        return;
      }

      const mp = getMercadoPagoClient();
      const preference = new Preference(mp);
      const frontendUrl = process.env.FRONTEND_URL || 'https://avigestao-cf5fe.web.app';
      const webhookUrl =
        process.env.MERCADOPAGO_WEBHOOK_URL ||
        'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net/mercadoPagoWebhook';

      console.log('MercadoPago Preference Request:', {
        planId,
        planLabel,
        price,
        months,
        payerEmail,
        useSandbox: process.env.MERCADOPAGO_USE_SANDBOX,
      });

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
          payer: { email: payerEmail },
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

      console.log('MercadoPago Preference Response:', {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
      });

      // Use sandbox_init_point if available (test mode), otherwise use init_point (production)
      const useSandbox = process.env.MERCADOPAGO_USE_SANDBOX === 'true';
      const checkoutUrl = useSandbox 
        ? (response.sandbox_init_point || response.init_point)
        : (response.init_point || response.sandbox_init_point);

      if (!checkoutUrl) {
        throw new Error('No checkout URL available from MercadoPago');
      }

      console.log('Checkout URL:', checkoutUrl);
      res.status(200).json({ url: checkoutUrl, preferenceId: response.id });
    } catch (err: any) {
      console.error('MercadoPago checkout error:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
      });
      res.status(500).json({ 
        error: err.message || 'Erro ao criar checkout',
        details: process.env.NODE_ENV === 'development' ? err.response?.data : undefined 
      });
    }
  });

// ============================================
// MERCADO PAGO - WEBHOOK
// ============================================
export const mercadoPagoWebhook = functions
  .region('southamerica-east1')
  .runWith({ secrets: ['MAILERSEND_API_TOKEN'] })
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

      const userId = (payment.metadata as any)?.userId || payment.external_reference;
      if (!userId) {
        console.error('MercadoPago payment missing userId/external_reference');
        res.status(200).send('missing_user');
        return;
      }

      const failureStatuses = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);
      if (failureStatuses.has(payment.status)) {
        try {
          const contact = await getUserContactInfo(String(userId), payment?.payer?.email);
          if (contact.email) {
            const template = buildTransactionalTemplate('payment-failed', { name: contact.name });
            await sendMailerSendEmail({ to: contact.email, ...template });
          }
        } catch (err: any) {
          console.error('mercadopago payment-failed email error:', err?.message || err);
        }

        res.status(200).send('failed');
        return;
      }

      if (payment.status !== 'approved') {
        res.status(200).send('pending');
        return;
      }
      const months = Number((payment.metadata as any)?.months || 1);

      if (userId) {
        const userRef = db.collection('users').doc(String(userId));
        const settingsRef = userRef.collection('settings').doc('preferences');
        const [userDoc, settingsDoc] = await Promise.all([userRef.get(), settingsRef.get()]);

        const existingPlan = settingsDoc.data()?.plan || userDoc.data()?.plan;
        const existingEnd =
          settingsDoc.data()?.subscriptionEndDate || userDoc.data()?.subscriptionEndDate;
        const now = new Date();
        const existingEndDate = existingEnd ? new Date(existingEnd) : null;
        const hadActive =
          existingPlan === 'Profissional' &&
          !!existingEndDate &&
          !isNaN(existingEndDate.getTime()) &&
          existingEndDate > now;
        let baseDate = existingEnd ? new Date(existingEnd) : now;
        if (isNaN(baseDate.getTime()) || baseDate < now) {
          baseDate = now;
        }

        const endDate = addMonths(baseDate, months);

        await userRef.set(
          {
            plan: 'Profissional',
            isProActive: true,
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
            isProActive: true,
            trialEndDate: admin.firestore.FieldValue.delete(),
            subscriptionEndDate: endDate.toISOString(),
            subscriptionCancelAtPeriodEnd: false,
            subscriptionStatus: payment.status || 'approved',
            subscriptionProvider: 'mercadopago',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        try {
          const contact = await getUserContactInfo(String(userId), payment?.payer?.email);
          if (contact.email) {
            const template = buildTransactionalTemplate(
              hadActive ? 'payment-success' : 'welcome-pro',
              { name: contact.name },
            );
            await sendMailerSendEmail({ to: contact.email, ...template });
          }
        } catch (err: any) {
          console.error('mercadopago payment-success email error:', err?.message || err);
        }
      }

      res.status(200).send('ok');
    } catch (err: any) {
      console.error('MercadoPago webhook error:', err);
      res.status(500).send('error');
    }
  });

// DEBUG: list recent community posts (admin only)
export const debugListCommunityPosts = functions.region('southamerica-east1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }
  const uid = context.auth.uid;
  const userDoc = await db.collection('users').doc(uid).get();
  const isAdmin = userDoc.exists && (userDoc.data() as any).isAdmin === true;
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas admins podem usar esta função');
  }

  const snaps = await db.collection('community_posts').orderBy('createdAt', 'desc').limit(30).get();
  const rows: any[] = [];
  snaps.forEach((d) => {
    const data = d.data();
    rows.push({ id: d.id, authorId: data.authorId, visibility: data.visibility, createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null, snippet: (data.content || '').slice(0, 200) });
  });
  return { ok: true, count: rows.length, posts: rows };
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

const isBirdActive = (data?: any) => {
  if (!data) return false;
  return data.deleted !== true && !data.deletedAt;
};

const updateActiveBirdsCount = async (userId: string, delta: number) => {
  const userRef = db.collection('users').doc(userId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = Number(snap.data()?.activeBirdsCount || 0);
    const next = Math.max(0, current + delta);
    tx.set(userRef, { activeBirdsCount: next }, { merge: true });
  });
};

export const onBirdCreated = functions
  .region('southamerica-east1')
  .firestore.document('users/{userId}/birds/{birdId}')
  .onCreate(async (snap, context) => {
    if (isBirdActive(snap.data())) {
      await updateActiveBirdsCount(context.params.userId, 1);
    }
  });

export const onBirdUpdated = functions
  .region('southamerica-east1')
  .firestore.document('users/{userId}/birds/{birdId}')
  .onUpdate(async (snap, context) => {
    const beforeActive = isBirdActive(snap.before.data());
    const afterActive = isBirdActive(snap.after.data());
    if (beforeActive === afterActive) return;
    await updateActiveBirdsCount(context.params.userId, afterActive ? 1 : -1);
  });

export const onBirdDeleted = functions
  .region('southamerica-east1')
  .firestore.document('users/{userId}/birds/{birdId}')
  .onDelete(async (snap, context) => {
    if (isBirdActive(snap.data())) {
      await updateActiveBirdsCount(context.params.userId, -1);
    }
  });

export const syncExpiredProPlans = functions
  .region('southamerica-east1')
  .pubsub.schedule('every 12 hours')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const nowIso = new Date().toISOString();
    const usersSnap = await db
      .collection('users')
      .where('isProActive', '==', true)
      .where('subscriptionEndDate', '<', nowIso)
      .get();

    if (usersSnap.empty) return null;

    const batch = db.batch();
    usersSnap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          plan: 'Básico',
          isProActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const settingsRef = doc.ref.collection('settings').doc('preferences');
      batch.set(
        settingsRef,
        {
          plan: 'Básico',
          isProActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    await batch.commit();
    return null;
  });

export const syncActiveBirdCounts = functions
  .region('southamerica-east1')
  .pubsub.schedule('every 1 hours')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const usersSnap = await db
      .collection('users')
      .where('activeBirdsCount', '==', null)
      .get();

    if (usersSnap.empty) return null;

    for (const docSnap of usersSnap.docs) {
      const userId = docSnap.id;
      const birdsSnap = await db.collection('users').doc(userId).collection('birds').get();
      const activeCount = birdsSnap.docs.filter((doc) => isBirdActive(doc.data())).length;
      await db
        .collection('users')
        .doc(userId)
        .set({ activeBirdsCount: activeCount }, { merge: true });
    }

    return null;
  });


// ============================================
// WEBHOOK HANDLERS
// ============================================
async function setUserAsPro(
  userId: string | null,
  customerId?: string | null,
  status?: string | null,
) {
  if (!userId) {
    console.warn('setUserAsPro - userId is null, returning');
    return;
  }
  try {
    console.log('setUserAsPro - Setting user', userId, 'as PRO with customerId', customerId);
    const proPayload = {
      plan: 'Profissional',
      isProActive: true,
      trialEndDate: admin.firestore.FieldValue.delete(),
      stripeCustomerId: customerId || null,
      subscriptionProvider: 'stripe',
      subscriptionStatus: status || 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db
      .collection('users')
      .doc(userId)
      .set(
        proPayload,
        { merge: true },
      );
    await Promise.all([
      db.collection('users').doc(userId).collection('settings').doc('preferences').set(proPayload, { merge: true }),
      db.collection('users').doc(userId).collection('settings').doc('general').set(proPayload, { merge: true }),
    ]);
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
            subscriptionProvider: 'stripe',
            subscriptionStatus: subscription.status,
            subscriptionEndDate: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString()
              : '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

      await Promise.all([
        setUserAsPro(userId, session.customer as string, subscription.status),
        db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('preferences')
          .set(
            {
              subscriptionProvider: 'stripe',
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('general')
          .set(
            {
              subscriptionProvider: 'stripe',
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
      ]);
      console.log('✅ User', userId, 'marked as PRO');

      try {
        const contact = await getUserContactInfo(userId, session.customer_email ?? null);
        if (contact.email) {
          const template = buildTransactionalTemplate('welcome-pro', { name: contact.name });
          await sendMailerSendEmail({
            to: contact.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });
        }
      } catch (err) {
        console.error('welcome-pro email failed:', err);
      }
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
          subscriptionProvider: 'stripe',
          subscriptionStatus: subscription.status,
          subscriptionEndDate: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    if (subscription.status === 'active' || subscription.status === 'trialing') {
      await Promise.all([
        setUserAsPro(userId, (subscription as any)?.customer, subscription.status),
        db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('preferences')
          .set(
            {
              subscriptionProvider: 'stripe',
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('general')
          .set(
            {
              subscriptionProvider: 'stripe',
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
      ]);
    } else {
      await Promise.all([
        db
          .collection('users')
          .doc(userId)
          .set(
            {
              plan: 'Básico',
              isProActive: false,
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        db
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('preferences')
          .set(
            {
              plan: 'Básico',
              isProActive: false,
              subscriptionStatus: subscription.status,
              subscriptionEndDate: currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : '',
              subscriptionCancelAtPeriodEnd: cancelAtPeriodEnd,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
      ]);
    }

    if (cancelAtPeriodEnd) {
      try {
        const contact = await getUserContactInfo(userId, null);
        if (contact.email) {
          const template = buildTransactionalTemplate('subscription-cancel-scheduled', {
            name: contact.name,
          });
          await sendMailerSendEmail({
            to: contact.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });
        }
      } catch (err) {
        console.error('subscription-cancel-scheduled email failed:', err);
      }
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

      try {
        const contact = await getUserContactInfo(userId, (invoice as any)?.customer_email ?? null);
        if (contact.email) {
          const template = buildTransactionalTemplate('payment-failed', { name: contact.name });
          await sendMailerSendEmail({
            to: contact.email,
            subject: template.subject,
            text: template.text,
            html: template.html,
          });
        }
      } catch (err) {
        console.error('payment-failed email failed:', err);
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
    await setUserAsPro(userId, customerId, 'active');

    try {
      const contact = await getUserContactInfo(userId, (invoice as any)?.customer_email ?? null);
      if (contact.email) {
        const template = buildTransactionalTemplate('payment-success', { name: contact.name });
        await sendMailerSendEmail({
          to: contact.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
      }
    } catch (err) {
      console.error('payment-success email failed:', err);
    }
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
        isProActive: false,
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
          isProActive: false,
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

    try {
      const contact = await getUserContactInfo(userId, null);
      if (contact.email) {
        const template = buildTransactionalTemplate('subscription-canceled', { name: contact.name });
        await sendMailerSendEmail({
          to: contact.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
      }
    } catch (err) {
      console.error('subscription-canceled email failed:', err);
    }
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

// ============================================
// DEBUG LOOKUP USER BY EMAIL (TEMPORARY)
// ============================================
export const debugFindUserByEmail = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (token !== 'debug123456') {
      res.status(403).send('Unauthorized');
      return;
    }

    const email = (req.query.email || req.body.email) as string | undefined;
    if (!email) {
      res.status(400).send('Missing email');
      return;
    }

    try {
      const usersSnapshot = await db
        .collection('users')
        .where('email', '==', email)
        .limit(5)
        .get();

      if (usersSnapshot.empty) {
        res.status(404).json({ found: false, email });
        return;
      }

      const results = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const settingsDoc = await db
            .collection('users')
            .doc(doc.id)
            .collection('settings')
            .doc('preferences')
            .get();
          const settings = settingsDoc.exists ? settingsDoc.data() : undefined;
          return {
            userId: doc.id,
            userPlan: data?.plan ?? null,
            userTrialEndDate: data?.trialEndDate ?? null,
            settingsPlan: settings?.plan ?? null,
            settingsTrialEndDate: settings?.trialEndDate ?? null,
            subscriptionStatus: data?.subscription?.status ?? null,
          };
        }),
      );

      res.status(200).json({ found: true, email, results });
    } catch (err: any) {
      console.error('debugFindUserByEmail error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ============================================
// DEBUG LOOKUP AUTH USER BY EMAIL (TEMPORARY)
// ============================================
export const debugFindAuthUserByEmail = functions
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const token = req.query.token || req.body.token;
    if (token !== 'debug123456') {
      res.status(403).send('Unauthorized');
      return;
    }

    const email = (req.query.email || req.body.email) as string | undefined;
    if (!email) {
      res.status(400).send('Missing email');
      return;
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      const userId = userRecord.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.exists ? userDoc.data() : undefined;
      const settingsDoc = await db
        .collection('users')
        .doc(userId)
        .collection('settings')
        .doc('preferences')
        .get();
      const settingsData = settingsDoc.exists ? settingsDoc.data() : undefined;

      res.status(200).json({
        found: true,
        email,
        userId,
        auth: {
          uid: userRecord.uid,
          email: userRecord.email,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
        },
        firestore: {
          userPlan: userData?.plan ?? null,
          userTrialEndDate: userData?.trialEndDate ?? null,
          settingsPlan: settingsData?.plan ?? null,
          settingsTrialEndDate: settingsData?.trialEndDate ?? null,
          subscriptionStatus: userData?.subscription?.status ?? null,
        },
      });
    } catch (err: any) {
      console.error('debugFindAuthUserByEmail error:', err);
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
  .https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
      }

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
        const breederName = req.body?.breederName ?? '';

        // Safety check: do not initialize if user already has a plan/subscription or an existing trial
        const userRef = db.collection('users').doc(String(userId));
        const preferencesRef = db
          .collection('users')
          .doc(String(userId))
          .collection('settings')
          .doc('preferences');
        const generalRef = db
          .collection('users')
          .doc(String(userId))
          .collection('settings')
          .doc('general');

        const [userDoc, prefDoc] = await Promise.all([userRef.get(), preferencesRef.get()]);
        const userData = userDoc.exists ? userDoc.data() : undefined;
        const prefData = prefDoc.exists ? prefDoc.data() : undefined;

        if (
          (userData && (userData.plan === 'Profissional' || (userData.subscription && ['active','trialing'].includes(userData.subscription.status)))) ||
          (prefData && (prefData.plan === 'Profissional' || !!prefData.trialEndDate))
        ) {
          console.log('initializeNewUser - already provisioned or has active subscription/trial, skipping for', userId);
          res.status(200).json({ skipped: true, reason: 'already_provisioned' });
          return;
        }

        // Calculate trial end date (7 days from now)
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const trialEndDate = trialEnd.toISOString().split('T')[0]; // YYYY-MM-DD format

        const settingsData = {
          plan: 'Básico',
          trialEndDate: trialEndDate,
          breederName,
          communityOptIn: false,
          communityShowProfile: false,
          communityShowResults: false,
          communityAllowContact: false,
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
          registrationDate: '',
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
          onboardingDismissed: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await Promise.all([
          preferencesRef.set(settingsData, { merge: true }),
          generalRef.set(settingsData, { merge: true }),
        ]);

        // Always write trial fields on main user doc (merge)
        await userRef.set(
          {
            plan: 'Básico',
            trialEndDate: trialEndDate,
            breederName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

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
