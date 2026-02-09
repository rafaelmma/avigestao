import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const user = auth.currentUser;
        const userId = user?.uid;
        const email = user?.email;

        if (!userId) {
          setDiagnostics({ loggedIn: false });
          setLoading(false);
          return;
        }

        // Try subcollection users/{userId}/birds
        let birdsCount = 0;
        let pairsCount = 0;
        let birdsError: string | undefined;
        let pairsError: string | undefined;

        try {
          const birdsRef = collection(db, 'users', userId, 'birds');
          const birdsSnap = await getDocs(birdsRef);
          birdsCount = birdsSnap.size;
        } catch (e) {
          birdsError = String(e);
        }

        try {
          const pairsRef = collection(db, 'users', userId, 'pairs');
          const pairsSnap = await getDocs(pairsRef);
          pairsCount = pairsSnap.size;
        } catch (e) {
          pairsError = String(e);
        }

        // Fallback: try global collections with breeder_id / user_id fields
        if (birdsCount === 0) {
          try {
            const q = query(collection(db, 'birds'), where('breeder_id', '==', userId));
            const snap = await getDocs(q);
            birdsCount = snap.size;
          } catch (e) {
            birdsError = birdsError || String(e);
          }
        }

        if (pairsCount === 0) {
          try {
            const q = query(collection(db, 'pairs'), where('user_id', '==', userId));
            const snap = await getDocs(q);
            pairsCount = snap.size;
          } catch (e) {
            pairsError = pairsError || String(e);
          }
        }

        const cachedState = localStorage.getItem(`avigestao_state_${userId}`);

        setDiagnostics({
          loggedIn: true,
          userId,
          email,
          birdsCount,
          birdsError,
          pairsCount,
          pairsError,
          hasCachedState: !!cachedState,
          firebaseConnected: true,
        });
      } catch (err: unknown) {
        const messageProp =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message?: unknown }).message
            : undefined;
        const msg = typeof messageProp === 'string' ? messageProp : String(err);
        setDiagnostics({ error: msg });
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
        <p className="text-sm">{diagnostics.loggedIn ? '✅ Usuário logado' : '❌ Não logado'}</p>
        <p className="text-sm">
          {Number(diagnostics.birdsCount || 0) > 0
            ? `✅ ${Number(diagnostics.birdsCount || 0)} pássaros encontrados`
            : '❌ Nenhum pássaro'}
        </p>
        <p className="text-sm">
          {diagnostics.firebaseConnected ? '✅ Firebase disponível' : '❌ Erro na conexão'}
        </p>
      </div>
    </div>
  );
}
