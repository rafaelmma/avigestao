// Supabase removed. Admin promotion previously updated the Supabase `users`
// table. Implement a secure admin promotion flow using Firebase Admin SDK
// and Firestore if you need to keep this functionality.

export default async function handler(req: any, res: any) {
  res
    .status(501)
    .json({ error: 'admin/promote: supabase removed. Implement with Firebase Admin if needed.' });
}
