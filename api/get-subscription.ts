// Supabase removed. If you need to fetch subscriptions, implement this
// endpoint using Firebase Admin + Firestore as the source of truth.

export default async function handler(req: any, res: any) {
  res.status(501).json({
    error: 'get-subscription: supabase removed. Implement with Firebase Admin if needed.',
  });
}
