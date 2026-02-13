import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  updateDoc,
  doc,
  writeBatch,
  limit,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { MailOpen, Mail, Trash2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import WizardShell from '../components/WizardShell';

interface InboxMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  text: string;
  createdAt?: string;
  read?: boolean;
}

const CommunityInbox: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [replyTarget, setReplyTarget] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'community_messages');
    const q = query(
      messagesRef,
      where('toUserId', '==', currentUserId),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: InboxMessage[] = [];
        snap.forEach((d) => {
          const data: any = d.data();
          docs.push({
            id: d.id,
            fromUserId: data.fromUserId,
            fromName: data.fromName || 'Criador',
            text: data.text,
            createdAt: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleString() : undefined,
            read: data.read || false,
          });
        });
        setMessages(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar mensagens', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [currentUserId]);

  const unreadMessages = useMemo(() => messages.filter((m) => !m.read), [messages]);

  const markAllAsRead = async () => {
    if (!currentUserId) return;
    if (unreadMessages.length === 0) return;
    setMarking(true);
    try {
      const batch = writeBatch(db);
      unreadMessages.forEach((msg) => {
        const msgRef = doc(db, 'community_messages', msg.id);
        batch.update(msgRef, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Erro ao marcar mensagens como lidas', err);
      alert('Falha ao marcar como lidas.');
    } finally {
      setMarking(false);
    }
  };

  const markOneAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'community_messages', messageId), { read: true });
    } catch (err) {
      console.error('Erro ao marcar mensagem como lida', err);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const confirmed = window.confirm('Deseja apagar esta mensagem?');
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'community_messages', messageId));
    } catch (err) {
      console.error('Erro ao apagar mensagem', err);
      alert('Falha ao apagar mensagem.');
    }
  };

  const sendReply = async () => {
    if (!replyTarget) return;
    const user = auth.currentUser;
    if (!user || !currentUserId) {
      alert('Faça login para responder.');
      return;
    }
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await addDoc(collection(db, 'community_messages'), {
        fromUserId: currentUserId,
        fromName: user.displayName || user.email || 'Criador',
        toUserId: replyTarget.fromUserId,
        toName: replyTarget.fromName || 'Criador',
        text: replyText.trim(),
        replyToMessageId: replyTarget.id,
        createdAt: serverTimestamp(),
        read: false,
      });
      setReplyText('');
      setReplyTarget(null);
    } catch (err) {
      console.error('Erro ao enviar resposta', err);
      alert('Falha ao enviar resposta.');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <WizardShell title="Inbox da Comunidade">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MailOpen size={22} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Inbox da Comunidade</h1>
          </div>
          <button
            onClick={markAllAsRead}
            disabled={marking || unreadMessages.length === 0}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              marking || unreadMessages.length === 0
                ? 'bg-slate-200 text-slate-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {marking ? 'Marcando...' : 'Marcar tudo como lido'}
          </button>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
          {loading && (
            <div className="p-6 text-sm text-slate-500">Carregando mensagens...</div>
          )}
          {!loading && messages.length === 0 && (
            <div className="p-6 text-sm text-slate-500">Nenhuma mensagem recebida ainda.</div>
          )}
          {!loading && messages.length > 0 && (
            <div className="divide-y divide-slate-100">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 flex gap-3 items-start ${msg.read ? 'bg-white' : 'bg-blue-50/40'}`}
                  onMouseEnter={() => {
                    if (!msg.read) markOneAsRead(msg.id);
                  }}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${msg.read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                    <Mail size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">{msg.fromName}</p>
                      <div className="flex items-center gap-3">
                        <p className="text-[11px] text-slate-400">{msg.createdAt || 'agora'}</p>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="text-slate-400 hover:text-red-600"
                          title="Apagar mensagem"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{msg.text}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => {
                          setReplyTarget(msg);
                          setReplyText('');
                        }}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        Responder
                      </button>
                    </div>
                    {!msg.read && (
                      <span className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        Não lido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {replyTarget && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Responder para {replyTarget.fromName}</h3>
              <button
                onClick={() => setReplyTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Digite sua resposta..."
              className="mt-3 w-full min-h-[120px] rounded-xl border border-slate-200 p-3 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setReplyTarget(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={sendReply}
                disabled={sendingReply}
                className={`px-3 py-2 rounded-lg text-white text-sm ${sendingReply ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {sendingReply ? 'Enviando...' : 'Enviar resposta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
};

export default CommunityInbox;
