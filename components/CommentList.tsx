import React, { useEffect, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Comment {
  id: string;
  authorId: string;
  authorName?: string;
  text: string;
  createdAt?: string;
}

const CommentList: React.FC<{ postId: string }> = ({ postId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const commentsRef = collection(db, 'community_posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs: Comment[] = [];
      snap.forEach((d) => {
        const data: any = d.data();
        docs.push({ id: d.id, authorId: data.authorId, authorName: data.authorName, text: data.text, createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined });
      });
      setComments(docs);
      setLoading(false);
    }, (err) => {
      console.error('comments snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    const user = auth.currentUser;
    if (!user) return alert('Autentique-se para comentar');
    const commentsRef = collection(db, 'community_posts', postId, 'comments');
    await addDoc(commentsRef, {
      authorId: user.uid,
      authorName: user.displayName || user.email || 'Usuário',
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setText('');
  };

  return (
    <div>
      <div className="space-y-3">
        {loading && <div className="text-sm text-slate-500">Carregando comentários...</div>}
        {!loading && comments.length === 0 && <div className="text-sm text-slate-500">Seja o primeiro a comentar.</div>}
        {comments.map((c) => (
          <div key={c.id} className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{c.authorName || 'Usuário'}</p>
                <p className="text-[11px] text-slate-400">{c.createdAt}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-700">{c.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário..." className="flex-1 p-2 rounded-lg border border-slate-200" />
        <button type="submit" className="px-3 py-2 bg-emerald-600 text-white rounded-lg">Enviar</button>
      </form>
    </div>
  );
};

export default CommentList;
