import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isRequesterAdmin(token: string) {
  const { data: userData } = await supabase.auth.getUser(token);
  const email = (userData?.user?.email || '').toLowerCase();
  if (!email) return false;

  // Check users table first
  const { data: usr } = await supabase.from('users').select('role').eq('email', email).single();
  if (usr && usr.role === 'admin') return true;

  // Fallback to env
  const adminList = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return adminList.includes(email);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || typeof auth !== 'string') return res.status(401).json({ error: 'Missing token' });
    const token = auth.replace('Bearer ', '');

    const allowed = await isRequesterAdmin(token);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const body = req.body || {};
    const targetEmail = (body.email || '').toLowerCase();
    const targetId = body.userId;

    if (!targetEmail && !targetId) return res.status(400).json({ error: 'Provide email or userId' });

    if (targetId) {
      const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', targetId);
      if (error) throw error;
      return res.status(200).json({ promoted: true, id: targetId });
    }

    // Upsert by email
    const { error } = await supabase.from('users').upsert({ email: targetEmail, role: 'admin' }, { onConflict: 'email' });
    if (error) throw error;

    return res.status(200).json({ promoted: true, email: targetEmail });
  } catch (err: any) {
    console.error('admin/promote error:', err);
    return res.status(500).json({ error: err.message });
  }
}
