import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Star,
  Trophy,
  Bird as BirdIcon,
} from 'lucide-react';
import { BreederSettings } from '../types';
import { APP_LOGO } from '../constants';
import { signIn, signUp, resetPassword } from '../services/authService';

interface AuthProps {
  onLogin: (settings?: Partial<BreederSettings>) => void;
  onNavigateToPublicTournaments?: () => void;
  onNavigateToResults?: () => void;
  onNavigateToPublicBirds?: () => void;
}

const Auth: React.FC<AuthProps> = ({
  onLogin,
  onNavigateToPublicTournaments,
  onNavigateToResults,
  onNavigateToPublicBirds,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        setIsLoading(false);
        if (error) return alert(error);
        alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setIsForgotPassword(false);
        return;
      }

      if (isLogin) {
        const { user, error } = await signIn(email, password);
        setIsLoading(false);
        if (error) return alert(error);
        if (user?.uid) {
          onLogin({ userId: user.uid });
        }
      } else {
        const { user, error } = await signUp(email, password, name);
        setIsLoading(false);
        if (error) return alert(error);

        // Ao criar conta, o onAuthStateChanged do App.tsx vai detectar o usuário
        // e mostrar a tela de verificação de e-mail automaticamente.
        if (user?.uid) {
          onLogin({ userId: user.uid, breederName: name });
        }
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const messageProp =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: unknown }).message
          : undefined;
      const msg = typeof messageProp === 'string' ? messageProp : String(err);
      alert(msg || 'Erro no login');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 animate-in fade-in duration-700">
      {/* Lado Esquerdo - Marketing / Visual (Oculto em Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#020617] relative overflow-hidden flex-col justify-between p-16 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>

        <div className="relative z-10">
          {/* Logo Circular e Elegante */}
          <div className="w-44 h-44 bg-white rounded-full overflow-hidden flex items-center justify-center mb-10 p-4 shadow-[0_0_50px_rgba(79,70,229,0.3)] border-2 border-indigo-500/20 group hover:scale-105 transition-transform duration-500">
            <img src={APP_LOGO} className="w-auto h-32 object-contain" alt="AviGestão Logo" />
          </div>
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-6">
            Gestão profissional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
              para seu criatório.
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Controle genealogia, financeiro, manejo sanitário e reprodutivo em um só lugar. Feito
            para criadores exigentes.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10">
            <ShieldCheck className="text-emerald-400 mb-4" size={32} />
            <h3 className="font-bold text-lg mb-1">SISPASS Seguro</h3>
            <p className="text-sm text-slate-400">Dados organizados para conformidade legal.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10">
            <Zap className="text-amber-400 mb-4" size={32} />
            <h3 className="font-bold text-lg mb-1">Alta Performance</h3>
            <p className="text-sm text-slate-400">Ferramentas para maximizar resultados.</p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo para Mobile (visível apenas em telas pequenas) */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-40 h-40 bg-white rounded-full overflow-hidden flex items-center justify-center p-4 shadow-xl border-2 border-indigo-100">
              <img src={APP_LOGO} className="w-auto h-32 object-contain" alt="AviGestão Logo" />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isForgotPassword
                ? 'Recuperar senha'
                : isLogin
                ? 'Bem-vindo de volta!'
                : 'Teste grátis por 7 dias'}
            </h2>
            <p className="text-slate-500 mt-2">
              {isForgotPassword
                ? 'Digite seu e-mail para receber o link de recuperação.'
                : isLogin
                ? 'Acesse o painel para gerenciar suas aves.'
                : 'Comece com todos os recursos do Plano Profissional liberados.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <label
                  htmlFor="breederName"
                  className="text-xs font-black uppercase text-slate-400 tracking-widest"
                >
                  Nome do Criatório
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    required
                    type="text"
                    placeholder="Ex: Criatório Canto Mestre"
                    id="breederName"
                    name="breederName"
                    autoComplete="organization"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-black uppercase text-slate-400 tracking-widest"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
                <input
                  required
                  type="email"
                  placeholder="seu@email.com"
                  id="email"
                  name="email"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="text-xs font-black uppercase text-slate-400 tracking-widest"
                  >
                    Senha
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] text-brand font-bold hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                  {!isLogin && (
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Star size={10} /> Mínimo 8 caracteres
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                  <input
                    required
                    type="password"
                    placeholder="Digite sua senha"
                    id="password"
                    name="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#0F172A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <CheckCircle2 size={18} className="animate-spin" /> Processando...
                </>
              ) : (
                <>
                  {isForgotPassword ? 'Enviar e-mail' : isLogin ? 'Entrar' : 'Criar conta'}{' '}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              {isForgotPassword ? (
                <>
                  <span>Lembrou a senha?</span>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="font-black text-brand uppercase tracking-widest"
                  >
                    Fazer login
                  </button>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}</span>
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="font-black text-brand uppercase tracking-widest"
                  >
                    {isLogin ? 'Criar grátis' : 'Fazer login'}
                  </button>
                </>
              )}
            </div>

            {/* Link para Torneios Públicos */}
            {(onNavigateToPublicTournaments || onNavigateToResults) && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                {onNavigateToPublicTournaments && (
                  <button
                    type="button"
                    onClick={onNavigateToPublicTournaments}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy size={20} />
                    Ver Torneios Públicos (sem login)
                  </button>
                )}
                {onNavigateToResults && (
                  <button
                    type="button"
                    onClick={onNavigateToResults}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Trophy size={20} />
                    Resultados e Classificações (sem login)
                  </button>
                )}
                {onNavigateToPublicBirds && (
                  <button
                    type="button"
                    onClick={onNavigateToPublicBirds}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <BirdIcon size={20} />
                    Galeria de Pássaros (sem login)
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
