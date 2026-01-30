
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Zap, ShieldCheck, Star } from 'lucide-react';
import { BreederSettings } from '../types';
import { APP_LOGO } from '../constants';
import { signIn, signUp, resetPassword } from '../services/authService';

interface AuthProps {
  onLogin: (settings?: Partial<BreederSettings>) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
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
        alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
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
        const { user, error } = await signUp(email, password);
        setIsLoading(false);
        if (error) return alert(error);
        // Passa o breederName para criar as settings na primeira vez
        if (user?.uid) {
          onLogin({ userId: user.uid, breederName: name });
        }
        // Mostra mensagem melhorada
        alert('Conta criada com sucesso!\n\nVocê já pode começar a usar o sistema.');
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (err: any) {
      setIsLoading(false);
      alert(err?.message || 'Erro no login');
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 animate-in fade-in duration-700">
      {/* Lado Esquerdo - Marketing / Visual (Oculto em Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-between p-16 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10">
          {/* Logo Grande e Destacada */}
          <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center mb-8 p-4 shadow-2xl shadow-black/40 border-4 border-white/20">
            <img src={APP_LOGO} className="w-full h-full object-contain" alt="AviGestão Logo" />
          </div>
          <h1 className="text-5xl font-black tracking-tight leading-tight mb-6">
            Gestão profissional <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-300">para seu criatório.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            Controle genealogia, financeiro, manejo sanitário e reprodutivo em um só lugar. Feito para criadores exigentes.
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
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center p-3 shadow-xl border-2 border-slate-200">
              <img src={APP_LOGO} className="w-full h-full object-contain" alt="AviGestão Logo" />
            </div>
          </div>
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isForgotPassword ? 'Recuperar senha' : isLogin ? 'Bem-vindo de volta!' : 'Teste grátis por 7 dias'}
            </h2>
            <p className="text-slate-500 mt-2">
              {isForgotPassword 
                ? 'Digite seu email para receber o link de recuperação.' 
                : isLogin 
                ? 'Acesse o painel para gerenciar suas aves.' 
                : 'Comece com todos os recursos do Plano Profissional liberados.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <label htmlFor="breederName" className="text-xs font-black uppercase text-slate-400 tracking-widest">Nome do Criatório</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
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
              <label htmlFor="email" className="text-xs font-black uppercase text-slate-400 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
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
                  <label htmlFor="password" className="text-xs font-black uppercase text-slate-400 tracking-widest">Senha</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPassword(true)}
                      className="text-[10px] text-brand font-bold hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                  {!isLogin && <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Star size={10}/> Mínimo 8 caracteres</span>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
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
                  {isForgotPassword ? 'Enviar email' : isLogin ? 'Entrar' : 'Criar conta'} <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              {isForgotPassword ? (
                <>
                  <span>Lembrou a senha?</span>
                  <button type="button" onClick={() => setIsForgotPassword(false)} className="font-black text-brand uppercase tracking-widest">
                    Fazer login
                  </button>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}</span>
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-black text-brand uppercase tracking-widest">
                    {isLogin ? 'Criar grátis' : 'Fazer login'}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
