import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import CommentList from './CommentList';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Post {
  id: string;
  authorName: string;
  content: string;
  createdAt?: string;
  attachments?: string[];
  likeCount?: number;
}

interface PreviewComment {
  id: string;
  authorName?: string;
  text: string;
  createdAt?: string;
}

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  const [previewComments, setPreviewComments] = useState<PreviewComment[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    const checkLiked = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const likeRef = doc(db, 'community_posts', post.id, 'likes', user.uid);
        const snap = await getDoc(likeRef);
        setLiked(snap.exists());
      } catch (err) {
        console.error('Erro ao checar like', err);
      }
    };
    checkLiked();
  }, [post.id]);

  useEffect(() => {
    const commentsRef = collection(db, 'community_posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(2));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: PreviewComment[] = [];
        snap.forEach((d) => {
          const data: any = d.data();
          docs.push({
            id: d.id,
            authorName: data.authorName,
            text: data.text,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined,
          });
        });
        setPreviewComments(docs.reverse());
        setPreviewLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar prévia de comentários', err);
        setPreviewLoading(false);
      },
    );
    return () => unsub();
  }, [post.id]);

  const toggleLike = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Faça login para curtir.');
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, 'community_posts', post.id);
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists()) throw new Error('Post não encontrado');
        const current = postSnap.data().likeCount || 0;
        const likeRef = doc(db, 'community_posts', post.id, 'likes', user.uid);
        const likeSnap = await transaction.get(likeRef);
        if (likeSnap.exists()) {
          transaction.update(postRef, { likeCount: current - 1 });
          transaction.delete(likeRef);
          setLiked(false);
          setLikeCount((c) => Math.max(0, c - 1));
        } else {
          transaction.update(postRef, { likeCount: current + 1 });
          transaction.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          setLiked(true);
          setLikeCount((c) => c + 1);
        }
      });
    } catch (err) {
      console.error('Erro ao atualizar like', err);
      alert('Falha ao atualizar like. Tente novamente.');
    }
  };

  const handleShare = async () => {
    try {
      const link = `${window.location.origin}/?post=${post.id}`;
      if (navigator.share) {
        await navigator.share({ title: 'Publicação AviGestão', text: post.content, url: link });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        alert('Link copiado para a área de transferência');
      } else {
        window.prompt('Copie o link abaixo:', link);
      }
    } catch (err) {
      console.error('Erro ao compartilhar', err);
      alert('Falha ao compartilhar.');
    }
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700">A</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{post.authorName}</p>
              <p className="text-[11px] text-slate-400">{post.createdAt || 'agora'}</p>
            </div>
          </div>

          <div className="mt-3 text-sm text-slate-700">
            {post.content}
          </div>

          {post.attachments && post.attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {post.attachments.map((url, idx) => (
                <img key={idx} src={url} alt={`anexo-${idx}`} className="w-full rounded-lg object-cover max-h-60 max-w-full" />
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2">
            {previewLoading && (
              <div className="text-xs text-slate-400">Carregando comentários...</div>
            )}
            {!previewLoading && previewComments.length === 0 && (
              <div className="text-xs text-slate-400">Nenhum comentário ainda.</div>
            )}
            {previewComments.map((c) => (
              <div key={c.id} className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <span className="font-semibold text-slate-700">{c.authorName || 'Usuário'}:</span>{' '}
                <span>{c.text}</span>
              </div>
            ))}
            {previewComments.length > 0 && (
              <button
                onClick={() => setShowComments(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Ver todos os comentários
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-4 text-slate-500">
            <button onClick={toggleLike} className={`flex items-center gap-2 text-sm ${liked ? 'text-rose-600' : 'hover:text-rose-500'}`}>
              <Heart size={14} /> <span className="text-[13px]">Curtir • {likeCount}</span>
            </button>
            <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-2 text-sm hover:text-blue-600">
              <MessageCircle size={14} /> <span className="text-[13px]">Comentar</span>
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 text-sm hover:text-slate-700">
              <Share2 size={14} /> <span className="text-[13px]">Compartilhar</span>
            </button>
            <button
              onClick={async () => {
                const reason = window.prompt('Informe o motivo do reporte (ex: conteúdo impróprio):');
                if (!reason) return;
                const user = auth.currentUser;
                if (!user) {
                  alert('Faça login para reportar.');
                  return;
                }
                try {
                  await addDoc(collection(db, 'community_posts', post.id, 'reports'), {
                    reporterId: user.uid,
                    reporterName: user.displayName || user.email || null,
                    reason: reason.trim().slice(0, 1000),
                    createdAt: serverTimestamp(),
                  });
                  alert('Report enviado. Obrigado — nossa equipe irá revisar.');
                } catch (err) {
                  console.error('Erro ao enviar report', err);
                  alert('Falha ao enviar report. Tente novamente.');
                }
              }}
              className="ml-2 text-sm text-red-600 hover:text-red-700"
            >
              Reportar
            </button>
          </div>

          {showComments && <div className="mt-4"><CommentList postId={post.id} /></div>}
        </div>
      </div>
    </article>
  );
};

export default PostCard;
