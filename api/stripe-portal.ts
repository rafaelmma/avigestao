// Supabase removed. Implement Stripe Portal logic using your preferred
// server-side storage (Firestore + Firebase Admin) if needed.

export default async function handler(req: any, res: any) {
  res.status(501).json({
    error:
      'Stripe portal endpoint removed Supabase dependency. Implement with Firebase Admin + Firestore.',
  });
}
