import React, { useEffect, useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
}

const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  'https://southamerica-east1-avigestao-cf5fe.cloudfunctions.net';

const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  defaultEmail,
}) => {
  const [name, setName] = useState(defaultName || '');
  const [email, setEmail] = useState(defaultEmail || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName || '');
      setEmail(defaultEmail || '');
      setSubject('');
      setMessage('');
      setStatus(null);
    }
  }, [isOpen, defaultName, defaultEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus('Preencha nome, email, assunto e mensagem.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/contactFormEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('Servico de email nao configurado.');
        }
        const text = await response.text();
        throw new Error(text || 'Falha ao enviar.');
      }

      setStatus('Mensagem enviada com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(msg || 'Falha ao enviar.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Contato</p>
            <h2 className="text-2xl font-black text-slate-900">Fale com a equipe</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Nome
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Email
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </label>
          </div>

          <label className="text-xs font-semibold text-slate-600">
            Assunto
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto da mensagem"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Mensagem
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem"
            />
          </label>

          {status && <p className="text-xs font-semibold text-slate-600">{status}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-60"
            >
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
