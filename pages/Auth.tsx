
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle2, Zap, ShieldCheck, Star } from 'lucide-react';
import { BreederSettings } from '../types';
import { APP_LOGO } from '../constants';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onLogin: (settings?: Partial<BreederSettings>) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        setIsLoading(false);
        if (error) return alert(error.message);
        if (data?.user?.id) {
          onLogin({ userId: data.user.id });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        setIsLoading(false);
        if (error) return alert(error.message);
        alert('Conta criada! Verifique seu e-mail.');
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
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-8 p-3">
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
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Bem-vindo de volta!' : 'Teste grátis por 7 dias'}
            </h2>
            <p className="text-slate-500 mt-2">
              {isLogin ? 'Acesse o painel para gerenciar suas aves.' : 'Comece com todos os recursos do Plano Profissional liberados.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Nome do Criatório</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: Criatório Canto Mestre" 
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  required 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest">Senha</label>
                {!isLogin && <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Star size={10}/> Mínimo 8 caracteres</span>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  required 
                  type="password" 
                  placeholder="Digite sua senha" 
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 transition-all focus:ring-4 focus:ring-brand/5"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

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
                  {isLogin ? 'Entrar' : 'Criar conta'} <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <span>{isLogin ? 'Ainda não tem conta?' : 'Já tem conta?'}</span>
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-black text-brand uppercase tracking-widest">
                {isLogin ? 'Criar grátis' : 'Fazer login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
