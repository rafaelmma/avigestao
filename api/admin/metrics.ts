// Supabase removed. Admin metrics previously relied on Supabase tables.
// Implement metrics aggregation using Firestore / BigQuery / your preferred
// backend and the Firebase Admin SDK if you need server-side metrics.

export default async function handler(req: any, res: any) {
  res
    .status(501)
    .json({ error: 'admin/metrics: supabase removed. Implement with Firebase Admin if needed.' });
}
