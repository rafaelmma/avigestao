// Supabase removed. Implement admin checks using Firebase Admin SDK and your
// own user records in Firestore if required. This endpoint is a stub.

export default async function handler(req: any, res: any) {
  res
    .status(501)
    .json({ error: 'admin/check: supabase removed. Implement with Firebase Admin if needed.' });
}
