import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { APP_LOGO } from '../constants';
import { supabase } from '../supabaseClient';

const ResetPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    // Verifica se há um token de recuperação na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    
    if (errorCode === 'otp_expired') {
      setError('Link expirado. Solicite um novo link de recuperação.');
      setTokenError(true);
    } else if (errorDescription) {
      setError(decodeURIComponent(errorDescription));
      setTokenError(true);
    } else if (type !== 'recovery') {
      setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
      setTokenError(true);
    }
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

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao redefinir senha');
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

  return (
    <div className="min-h-screen flex bg-slate-50 animate-in fade-in duration-700">
      {/* Lado Esquerdo - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-center items-center p-16 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 text-center">
          <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mb-8 p-4 shadow-2xl mx-auto">
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
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center p-3 shadow-xl border-2 border-slate-200">
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
                  onClick={() => window.location.href = '/'}
                  className="mt-2 text-xs underline hover:no-underline"
                >
                  Voltar para o login e solicitar novo link
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  required 
                  type="password" 
                  placeholder="Mínimo 8 caracteres" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  required 
                  type="password" 
                  placeholder="Digite a senha novamente" 
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
                onClick={() => window.location.href = '/'}
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
