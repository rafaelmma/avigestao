import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || typeof auth !== 'string') return res.status(401).json({ error: 'Missing token' });

    const token = auth.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Invalid token' });

    const userEmail = (userData.user.email || '').toLowerCase();

    // Prefer role stored in `users` table (if present)
    try {
      const { data: usr, error: usrErr } = await supabase
        .from('users')
        .select('role')
        .eq('email', userEmail)
        .single();

      if (!usrErr && usr && usr.role === 'admin') {
        return res.status(200).json({ isAdmin: true, email: userEmail });
      }
    } catch (e) {
      console.warn('users table check failed', e);
    }

    // Fallback: check ADMIN_EMAILS env var for backwards compatibility
    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const isAdmin = adminList.includes(userEmail);

    return res.status(200).json({ isAdmin, email: userData.user.email });
  } catch (err: any) {
    console.error('admin/check error:', err);
    return res.status(500).json({ error: err.message });
  }
}
