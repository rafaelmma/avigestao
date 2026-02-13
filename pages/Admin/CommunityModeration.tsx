import React, { useEffect, useState } from 'react';
import { db, functions } from '../../lib/firebase';
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

type ReportRow = {
  reportId: string;
  postId: string;
  reporterId: string | null;
  reporterName: string | null;
  reason?: string | null;
  createdAt?: any;
};

const CommunityModeration: React.FC<{ currentUserId?: string | null }> = ({ currentUserId }) => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [postsMap, setPostsMap] = useState<Record<string, any>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugPosts, setDebugPosts] = useState<any[] | null>(null);

  useEffect(() => {
    const q = query(collectionGroup(db, 'reports'), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        const rows: ReportRow[] = [];
        const postIds = new Set<string>();
        snap.forEach((r) => {
          const path = r.ref.path; // community_posts/{postId}/reports/{reportId}
          const parts = path.split('/');
          const postId = parts.length >= 2 ? parts[1] : '';
          rows.push({
            reportId: r.id,
            postId,
            reporterId: (r.data() as any).reporterId || null,
            reporterName: (r.data() as any).reporterName || null,
            reason: (r.data() as any).reason || null,
            createdAt: (r.data() as any).createdAt || null,
          });
          if (postId) postIds.add(postId);
        });

        setReports(rows);

        // Fetch post documents for the unique postIds
        const map: Record<string, any> = {};
        await Promise.all(
          Array.from(postIds).map(async (pid) => {
            try {
              const pd = await getDoc(doc(db, 'community_posts', pid));
              if (pd.exists()) map[pid] = pd.data();
            } catch (err) {
              console.warn('Failed load post', pid, err);
            }
          }),
        );

        setPostsMap(map);
        setLoading(false);
      },
      (err) => {
        console.error('reports snapshot error', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Remover post permanentemente? Essa ação não pode ser desfeita.')) return;
    setActionLoading((s) => ({ ...s, [postId]: true }));
    try {
      const deleteFn = httpsCallable(functions, 'adminDeleteCommunityPost');
      const res = await deleteFn({ postId });
      if ((res as any)?.data?.ok) {
        alert('Post removido com sucesso');
        // remove post from local map and reports
        setPostsMap((m) => {
          const copy = { ...m };
          delete copy[postId];
          return copy;
        });
        setReports((rs) => rs.filter((r) => r.postId !== postId));
      } else {
        alert('Remoção concluída, mas sem confirmação explícita. Verifique o console.');
      }
    } catch (err: any) {
      console.error('delete post error', err);
      alert('Falha ao remover post: ' + (err?.message || err));
    } finally {
      setActionLoading((s) => ({ ...s, [postId]: false }));
    }
  };

  const handleCloseReports = async (postId: string) => {
    if (!confirm('Fechar todos os relatórios deste post? Isso apenas remove os relatórios, mantendo o post.')) return;
    setActionLoading((s) => ({ ...s, [postId]: true }));
    try {
      const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
      const reportsCol = collection(db, 'community_posts', postId, 'reports');
      const snaps = await getDocs(reportsCol);
      const deletes: Promise<any>[] = [];
      snaps.forEach((d: any) => {
        deletes.push(deleteDoc(d.ref));
      });
      await Promise.all(deletes);
      setReports((rs) => rs.filter((r) => r.postId !== postId));
      alert('Relatórios fechados com sucesso.');
    } catch (err) {
      console.error('close reports error', err);
      alert('Falha ao fechar relatórios: ' + (err as any)?.message || err);
    } finally {
      setActionLoading((s) => ({ ...s, [postId]: false }));
    }
  };

  const grouped = reports.reduce<Record<string, ReportRow[]>>((acc, r) => {
    acc[r.postId] = acc[r.postId] || [];
    acc[r.postId].push(r);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Moderação da Comunidade</h2>
      <p className="text-sm text-slate-500">Relatórios recentes (coleção `reports`). Use <strong>Remover Post</strong> para deletar permanentemente um post ou <strong>Fechar relatórios</strong> para marcar os relatórios como resolvidos (mantendo o post).</p>

      <div className="mt-4">
        <button
          onClick={async () => {
            try {
              setDebugLoading(true);
              setDebugPosts(null);
              const fn = httpsCallable(functions, 'debugListCommunityPosts');
              const res = await fn({});
              setDebugPosts((res as any).data?.posts || []);
            } catch (err: any) {
              console.error('debugListCommunityPosts error', err);
              alert('Falha ao listar posts: ' + (err?.message || err));
            } finally {
              setDebugLoading(false);
            }
          }}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
        >
          {debugLoading ? 'Carregando...' : 'Listar posts (debug)'}
        </button>
        {debugPosts && (
          <div className="mt-3 p-3 bg-slate-50 rounded-md text-sm">
            <div className="font-semibold mb-2">Resultados (últimos {debugPosts.length} posts)</div>
            <div className="space-y-2 max-h-60 overflow-auto">
              {debugPosts.map((p: any) => (
                <div key={p.id} className="border p-2 rounded">
                  <div className="text-xs text-slate-500">{p.id} • {p.createdAt}</div>
                  <div className="font-medium">{p.snippet}</div>
                  <div className="text-[12px] text-slate-400">author: {p.authorId} • visibility: {p.visibility}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <div className="mt-4 text-sm text-slate-500">Carregando...</div>}

      {!loading && Object.keys(grouped).length === 0 && (
        <div className="mt-4 text-sm text-slate-500">Nenhum relatório recente.</div>
      )}

      <div className="mt-4 space-y-4">
        {Object.entries(grouped).map(([postId, repRows]) => {
          const post = postsMap[postId];
          return (
            <div key={postId} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500">Post ID: {postId}</div>
                  <div className="mt-2 font-semibold text-slate-900">
                    {post?.authorName || '— Usuário —'}
                  </div>
                  <div className="text-sm text-slate-700 mt-2">{post?.content || '— sem texto —'}</div>
                  {post?.attachments && Array.isArray(post.attachments) && (
                    <div className="mt-3 flex gap-2">
                      {post.attachments.map((a: string, i: number) => (
                        <img key={i} src={a} alt={`anexo-${i}`} className="h-20 w-20 object-cover rounded-md" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-slate-500">{post?.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                  <button
                    onClick={() => handleDeletePost(postId)}
                    disabled={!!actionLoading[postId]}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm"
                  >
                    {actionLoading[postId] ? 'Removendo...' : 'Remover Post'}
                  </button>
                  <button
                    onClick={() => handleCloseReports(postId)}
                    disabled={!!actionLoading[postId]}
                    className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm mt-2"
                  >
                    {actionLoading[postId] ? 'Processando...' : 'Fechar relatórios'}
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-slate-50 p-3 rounded-lg">
                <div className="text-sm font-semibold">Relatórios ({repRows.length})</div>
                <div className="mt-2 space-y-2">
                  {repRows.map((r) => (
                    <div key={r.reportId} className="text-sm text-slate-700">
                      <div className="font-medium">{r.reporterName || r.reporterId || 'Anônimo'}</div>
                      <div className="text-slate-600">{r.reason || 'Sem motivo'}</div>
                      <div className="text-[12px] text-slate-400">{r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityModeration;
