
import React from 'react';
import { HelpCircle, Book, MessageCircle, ShieldQuestion, ExternalLink, Zap } from 'lucide-react';

const HelpCenter: React.FC = () => {
  const faqs = [
    { q: 'Como cadastrar um novo pássaro?', a: 'Vá na aba "Plantel" e clique no botão "Nova Ave". Preencha os dados e anilha.' },
    { q: 'Como funciona o controle de pedigree?', a: 'O sistema vincula automaticamente pais e mães que já estejam no seu plantel quando você cadastra um filhote.' },
    { q: 'O que é o limite do Plano Básico?', a: 'No plano básico você pode ter até 5 aves ativas. Para mais aves, é necessário o plano Profissional.' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Ajuda & Suporte</h2>
        <p className="text-slate-500 font-medium">Tudo o que você precisa para dominar o AviGestão.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Book size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Manuais</h3>
          <p className="text-xs text-slate-400 font-medium mb-4">Aprenda a configurar seu criatório do zero.</p>
          <button className="text-[10px] font-black uppercase text-brand tracking-widest flex items-center gap-2 mx-auto">
            Acessar <ExternalLink size={12} />
          </button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Comunidade</h3>
          <p className="text-xs text-slate-400 font-medium mb-4">Troque experiências com outros criadores.</p>
          <button className="text-[10px] font-black uppercase text-brand tracking-widest flex items-center gap-2 mx-auto">
            Entrar no Grupo <ExternalLink size={12} />
          </button>
        </div>

        <div className="bg-[#0F172A] p-8 rounded-[32px] text-white shadow-xl text-center relative overflow-hidden">
          <Zap size={80} className="absolute -bottom-4 -right-4 text-amber-500 opacity-20 rotate-12" fill="currentColor" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <ShieldQuestion size={24} />
            </div>
            <h3 className="font-bold mb-2">Suporte PRO</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Atendimento prioritário via WhatsApp para assinantes.</p>
            <button className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2 mx-auto">
              Falar com Suporte <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3">
          <HelpCircle className="text-brand" />
          <h3 className="text-xl font-black text-slate-800">Perguntas Frequentes</h3>
        </div>
        <div className="p-8 space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="pb-6 border-b border-slate-50 last:border-0 last:pb-0">
              <h4 className="font-bold text-slate-800 mb-2">{faq.q}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
