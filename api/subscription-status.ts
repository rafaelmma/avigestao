import * as admin from "firebase-admin";

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

const db = admin.firestore();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader && typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user's subscription from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.subscription) {
      return res.status(200).json({ isActive: false });
    }

    const subscription = userData.subscription;
    const isActive = subscription.status === "active" || subscription.status === "trialing";

    return res.status(200).json({
      isActive,
      status: subscription.status,
      current_period_end: subscription.currentPeriodEnd,
      cancel_at_period_end: subscription.cancelAtPeriodEnd || false,
      isTrial: subscription.status === "trialing",
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return res.status(500).json({ error: error.message });
  }
}
