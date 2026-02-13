import React, { useEffect, useState } from 'react';
import Composer from './Composer';
import PostCard from './PostCard';
import { auth, db } from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore';

interface SimplePost {
  id: string;
  authorName: string;
  content: string;
  createdAt?: string;
  attachments?: string[];
  likeCount?: number;
}

const samplePosts: SimplePost[] = [
  { id: 'p1', authorName: 'Criador A', content: 'Boas práticas para preparação de torneios!', createdAt: '2h' },
  { id: 'p2', authorName: 'Criador B', content: 'Alguém recomenda suplemento para muda?', createdAt: '1d' },
];

const CommunityFeed: React.FC<{ userSettings?: any; hideHeader?: boolean }> = ({ userSettings, hideHeader }) => {
  const [posts, setPosts] = useState<SimplePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSamples, setShowSamples] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const postsRef = collection(db, 'community', 'posts');
      // Note: Firestore path as collectionGroup would be 'community/posts' if nested; using collection('community/posts') isn't valid.
      // We'll use top-level collection `community_posts` to simplify rules and queries.
    } catch (e) {
      // fallback to sample
    }

    // Use top-level `community_posts` collection for feed
    const postsRef = collection(db, 'community_posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));
    unsub = onSnapshot(
      q,
      (snap) => {
        const docs: SimplePost[] = [];
        console.debug('[CommunityFeed] snapshot received, docs:', snap.size);
        snap.forEach((d) => {
          const data: any = d.data();
          console.debug('[CommunityFeed] doc', d.id, data);
          docs.push({
            id: d.id,
            authorName: data.authorName || 'Usuário',
            content: data.content || '',
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined,
            attachments: data.attachments || [],
            likeCount: data.likeCount || 0,
          });
        });
        try {
          const me = auth.currentUser;
          console.debug('[CommunityFeed] currentUser:', me ? me.uid : null, 'userSettings.communityOptIn:', userSettings?.communityOptIn);
        } catch (e) {}
        setPosts(docs);
        setLoading(false);
      },
      async (err) => {
        console.error('Feed snapshot error', err);
        // Fallback: tentar um getDocs único para verificar leitura
        try {
          console.debug('[CommunityFeed] attempting getDocs fallback');
          const snap = await getDocs(q);
          const docs2: SimplePost[] = [];
          snap.forEach((d) => {
            const data: any = d.data();
            console.debug('[CommunityFeed][fallback] doc', d.id, data);
            docs2.push({
              id: d.id,
              authorName: data.authorName || 'Usuário',
              content: data.content || '',
              createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined,
              attachments: data.attachments || [],
              likeCount: data.likeCount || 0,
            });
          });
          setPosts(docs2);
        } catch (err2) {
          console.error('Feed getDocs fallback error', err2);
        } finally {
          setLoading(false);
        }
      },
    );

    return () => unsub?.();
  }, []);

  const handlePost = async (content: string, attachments?: string[]) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const postsRef = collection(db, 'community_posts');
    const payload: any = {
      authorId: user.uid,
      authorName: user.displayName || user.email || 'Usuário',
      content,
      createdAt: serverTimestamp(),
      visibility: 'public',
      likeCount: 0,
      commentCount: 0,
    };

    if (attachments && attachments.length) {
      payload.attachments = attachments;
    }

    try {
      await addDoc(postsRef, payload);
    } catch (err) {
      console.error('Erro ao criar post', err);
      throw err;
    }
  };

  return (
    <section className="space-y-6">
      {!hideHeader && <h3 className="text-lg font-black text-slate-800">Feed da Comunidade</h3>}

      {userSettings && !userSettings.communityOptIn && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          Seu perfil está oculto — ative em Configurações para publicar e comentar.
        </div>
      )}

      {userSettings && userSettings.communityOptIn && (
        <Composer onPost={handlePost} />
      )}

      <div className="space-y-4">
        {loading && <div className="text-slate-500">Carregando feed...</div>}
        {!loading && posts.length === 0 && !showSamples && (
          <div className="text-slate-500">
            Nenhuma publicação ainda. Seja o primeiro!{' '}
            <button
              onClick={() => setShowSamples(true)}
              className="ml-2 underline text-blue-600"
            >
              Ver exemplos
            </button>
            <div className="mt-2 text-sm text-slate-400">
              Se você já publicou e não vê sua publicação, verifique:
              <ul className="list-disc ml-5">
                <li>Se o seu perfil público está ativado em Configurações (Seu Perfil Público → Ativar).</li>
                <li>Se a visibilidade do post está definida como <strong>public</strong>.</li>
                <li>Se o anexo ultrapassa o limite de 5MB (anexos grandes são bloqueados).</li>
              </ul>
              <button onClick={() => { try { localStorage.setItem('avigestao_settings_tab', 'perfil'); } catch {} ; window.location.href = '/settings'; }} className="mt-2 inline-block text-blue-600 underline">Ir para Configurações</button>
            </div>
          </div>
        )}

        {!loading && posts.length === 0 && showSamples && (
          <div className="space-y-3">
            {samplePosts.map((p) => (
              <PostCard
                key={p.id}
                post={{ id: p.id, authorName: p.authorName, content: p.content, createdAt: p.createdAt }}
              />
            ))}
          </div>
        )}
        {!loading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityFeed;
