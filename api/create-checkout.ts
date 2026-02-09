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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const db = admin.firestore();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || typeof auth !== 'string') {
      return res.status(401).json({ error: 'Missing auth token' });
    }

    const token = auth.replace('Bearer ', '');

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'Missing priceId' });
    }

    // Check if customer already exists
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: decodedToken.email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID to Firestore
      await db.collection('users').doc(userId).set(
        {
          stripeCustomerId: customerId,
        },
        { merge: true },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${
        process.env.FRONTEND_URL || 'https://avigestao-cf5fe.web.app'
      }/settings?success=true`,
      cancel_url: `${
        process.env.FRONTEND_URL || 'https://avigestao-cf5fe.web.app'
      }/settings?canceled=true`,
      metadata: { userId },
    });

    return res.status(200).json({ url: session.url, customerId });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
