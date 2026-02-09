// Supabase integration removed.
// This endpoint previously synced subscription data via Supabase.
// Project now uses Firebase; implement equivalent logic using Firebase Admin SDK
// and Firestore if you need server-side subscription syncing.

export default async function handler(req: any, res: any) {
  res.status(501).json({
    error: 'Supabase-based subscription sync removed. Implement with Firebase Admin if needed.',
  });
}
