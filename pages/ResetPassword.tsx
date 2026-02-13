import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { APP_LOGO } from '../constants';
import { auth } from '../lib/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';

const ResetPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      // Firebase usa o parâmetro 'oobCode' na URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('oobCode');

      if (!code) {
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
        setTokenError(true);
        setIsVerifying(false);
        return;
      }

      try {
        // Verifica se o código é válido
        await verifyPasswordResetCode(auth, code);
        setOobCode(code);
        setIsVerifying(false);
      } catch (err: unknown) {
        const messageProp =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message?: unknown }).message
            : undefined;
        const msg = typeof messageProp === 'string' ? messageProp : String(err);
        setError(msg || 'Link inválido ou expirado. Solicite um novo link.');
        setTokenError(true);
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (!oobCode) {
      setError('Código de verificação inválido');
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: unknown) {
      const messageProp =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: unknown }).message
          : undefined;
      const msg = typeof messageProp === 'string' ? messageProp : String(err);
      setError(msg || 'Erro ao redefinir senha');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="text-emerald-600" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Senha alterada com sucesso!</h2>
          <p className="text-slate-500">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-bold">Validando link de recuperação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 animate-in fade-in duration-700">
      {/* Lado Esquerdo - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-center items-center p-16 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10 text-center">
          <div className="w-56 h-56 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 p-1 shadow-2xl mx-auto border-4 border-white/20">
            <img src={APP_LOGO} className="w-full h-full object-contain" alt="AviGestão Logo" />
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 max-w-md">
            <ShieldCheck className="text-emerald-400 mb-4 mx-auto" size={48} />
            <h3 className="font-bold text-2xl mb-2">Segurança em Primeiro Lugar</h3>
            <p className="text-slate-400">Proteja sua conta com uma senha forte e única.</p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo para Mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-40 h-40 bg-white rounded-[2rem] flex items-center justify-center p-1 shadow-xl border-2 border-slate-200">
              <img src={APP_LOGO} className="w-full h-full object-contain" alt="AviGestão Logo" />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Redefinir sua senha
            </h2>
            <p className="text-slate-500 mt-2">
              Digite sua nova senha abaixo. Use uma senha forte e única.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-bold">
              {error}
              {tokenError && (
                <button
                  type="button"
                  onClick={() => (window.location.href = '/')}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Voltar para o login e solicitar novo link
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-xs font-black uppercase text-slate-400 tracking-widest"
              >
                Nova Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  required
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  id="newPassword"
                  name="newPassword"
                  autoComplete="new-password"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmNewPassword"
                className="text-xs font-black uppercase text-slate-400 tracking-widest"
              >
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  required
                  type="password"
                  placeholder="Digite a senha novamente"
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  autoComplete="new-password"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || tokenError}
              className="w-full py-4 bg-[#0F172A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <CheckCircle2 size={18} className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  Redefinir senha <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <span>Lembrou a senha?</span>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                className="font-black text-brand uppercase tracking-widest"
              >
                Fazer login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
