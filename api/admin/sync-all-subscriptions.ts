// Supabase removed. This admin endpoint previously bulk-synced Stripe subscriptions
// into Supabase. If you need the same functionality, implement it using the
// Firebase Admin SDK and Firestore. For now this endpoint is a safe stub.

export default async function handler(req: any, res: any) {
  res.status(501).json({
    error:
      'admin/sync-all-subscriptions: supabase removed. Implement with Firebase Admin if needed.',
  });
}
