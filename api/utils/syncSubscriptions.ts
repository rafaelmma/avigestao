// Supabase integration removed.
// If you need subscription sync with Stripe, implement an equivalent using
// Firebase Admin SDK + Firestore. This utility is intentionally left as a
// stub to avoid runtime errors while the project migrates away from Supabase.

export async function syncAllSubscriptionsFromStripe() {
  console.warn(
    'syncAllSubscriptionsFromStripe: supabase integration removed. Implement with Firebase Admin if needed.',
  );
  return;
}
