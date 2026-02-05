import React, { useState, useEffect } from 'react';
// import { supabase } from '../supabaseClient'; // REMOVIDO - Firebase only
const supabase = null as any;

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // 1. Verificar sessão
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        const email = sessionData?.session?.user?.email;

        // 2. Tentar carregar birds
        const { data: birds, error: birdsError } = await supabase
          .from('birds')
          .select('*')
          .eq('breeder_id', userId);

        // 3. Tentar carregar pairs
        const { data: pairs, error: pairsError } = await supabase
          .from('pairs')
          .select('*')
          .eq('user_id', userId);

        // 4. Verificar localStorage
        const cachedState = localStorage.getItem(`avigestao_state_${userId}`);

        setDiagnostics({
          loggedIn: !!userId,
          userId,
          email,
          birdsCount: birds?.length || 0,
          birdsError: birdsError?.message,
          pairsCount: pairs?.length || 0,
          pairsError: pairsError?.message,
          hasCachedState: !!cachedState,
          supabaseConnected: !birdsError && !pairsError,
        });
      } catch (err: any) {
        setDiagnostics({ error: err.message });
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, []);

  if (loading) return <div className="p-4">Carregando diagnóstico...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">🔍 Diagnóstico</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(diagnostics).map(([key, value]) => (
          <div key={key} className="p-3 bg-gray-100 rounded">
            <strong>{key}:</strong>
            <p className="text-sm text-gray-700">
              {typeof value === 'boolean' ? (value ? '✅' : '❌') : String(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-blue-100 rounded">
        <p className="text-sm">
          {diagnostics.loggedIn ? '✅ Usuário logado' : '❌ Não logado'}
        </p>
        <p className="text-sm">
          {diagnostics.birdsCount > 0 ? `✅ ${diagnostics.birdsCount} pássaros encontrados` : '❌ Nenhum pássaro'}
        </p>
        <p className="text-sm">
          {diagnostics.supabaseConnected ? '✅ Supabase conectado' : '❌ Erro na conexão'}
        </p>
      </div>
    </div>
  );
}
