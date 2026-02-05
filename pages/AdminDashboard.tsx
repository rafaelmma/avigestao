import React, { useEffect, useState } from 'react';
// import { supabase } from '../supabaseClient'; // REMOVIDO - Firebase only
const supabase = null as any;

const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const res = await fetch('/api/admin/metrics', {
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });
        if (!res.ok) throw new Error('Failed to load metrics');
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Loading admin metrics…</div>;
  if (!metrics) return <div className="p-6">No metrics available or access denied.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-black mb-4">Admin Dashboard</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-xs text-slate-500">MRR (30d)</p>
          <div className="text-2xl font-black">R$ {metrics.mrr?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-xs text-slate-500">Assinantes ativos</p>
          <div className="text-2xl font-black">{metrics.activeSubscribers}</div>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-xs text-slate-500">Churn (30d)</p>
          <div className="text-2xl font-black">{metrics.churnPercent}%</div>
        </div>
      </div>

      <div className="bg-white rounded p-4">
        <h3 className="font-bold mb-2">Últimos eventos Stripe</h3>
        <div className="space-y-2">
          {metrics.recentEvents.length === 0 && <div className="text-sm text-slate-500">Nenhum evento recente.</div>}
          {metrics.recentEvents.map((e: any) => (
            <div key={e.id} className="p-2 border rounded">
              <div className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</div>
              <div className="font-mono text-sm">{e.event_type} — {e.amount ? `R$ ${e.amount}` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded p-4 mt-6">
        <h3 className="font-bold mb-2">Promover usuário</h3>
        <div className="flex gap-2">
          <input
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 border p-2 rounded"
          />
          <button
            disabled={!promoteEmail || promoting}
            onClick={async () => {
              setPromoting(true);
              try {
                const session = await supabase.auth.getSession();
                const res = await fetch('/api/admin/promote', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.data.session?.access_token}`,
                  },
                  body: JSON.stringify({ email: promoteEmail }),
                });
                if (!res.ok) throw new Error('Falha ao promover');
                alert('Usuário promovido para admin');
                setPromoteEmail('');
              } catch (err) {
                console.error(err);
                alert('Erro ao promover usuário');
              } finally {
                setPromoting(false);
              }
            }}
            className="px-4 py-2 bg-emerald-500 text-white rounded"
          >
            Promover
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
