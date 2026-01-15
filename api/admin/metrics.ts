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

    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const userEmail = (userData.user.email || '').toLowerCase();
    if (!adminList.includes(userEmail)) return res.status(403).json({ error: 'Forbidden' });

    // Calculate MRR (approx): sum of billing_metrics.amount for invoice payments in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: mrrRows } = await supabase
      .from('billing_metrics')
      .select('amount')
      .gte('created_at', thirtyDaysAgo)
      .ilike('event_type', 'invoice.%');

    const mrr = (mrrRows || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

    // Active subscribers
    const { count: activeCount } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: false })
      .in('status', ['active', 'trialing']);

    // Churn: cancellations in last 30 days / (active + cancellations)
    const { data: cancellations } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('status', 'canceled')
      .gte('updated_at', thirtyDaysAgo);

    const canceledCount = (cancellations || []).length;
    const active = Number(activeCount || 0);
    const churn = active + canceledCount > 0 ? (canceledCount / (active + canceledCount)) * 100 : 0;

    // Recent events
    const { data: recent } = await supabase
      .from('billing_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      mrr,
      activeSubscribers: active,
      churnPercent: Number(churn.toFixed(2)),
      recentEvents: recent || [],
    });
  } catch (err: any) {
    console.error('Admin metrics error:', err);
    return res.status(500).json({ error: err.message });
  }
}
