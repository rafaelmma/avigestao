
import React, { useState, useEffect } from 'react';
import { Lightbulb, Info, Sparkles, Zap, Heart, ShieldCheck, TrendingUp, MapPin } from 'lucide-react';

type TipCategory = 'dashboard' | 'birds' | 'breeding' | 'meds' | 'finance' | 'movements' | 'tasks' | 'tournaments' | 'settings';

interface Tip {
  text: string;
  icon: React.ReactNode;
  color: string;
}

const TIPS_DB: Record<TipCategory, Tip[]> = {
  dashboard: [
    { text: "Mantenha seus dados sempre atualizados. O backup automático depende da consistência das informações.", icon: <Zap />, color: "bg-indigo-500" },
    { text: "Verifique o painel diariamente para não perder prazos de medicamentos ou renovações do IBAMA.", icon: <Info />, color: "bg-slate-600" },
    { text: "Use o resumo financeiro para identificar rapidamente onde estão seus maiores gastos mensais.", icon: <TrendingUp />, color: "bg-emerald-500" }
  ],
  birds: [
    { text: "A quarentena é essencial para novas aves. Mantenha-as isoladas por pelo menos 40 dias antes de juntar ao plantel.", icon: <ShieldCheck />, color: "bg-rose-500" },
    { text: "Troque a água dos bebedouros diariamente e use água filtrada para evitar contaminações.", icon: <Info />, color: "bg-blue-500" },
    { text: "Aves de canto precisam de estímulos visuais e auditivos, mas evite o estresse excessivo pré-torneio.", icon: <Sparkles />, color: "bg-amber-500" },
    { text: "Mantenha o registro de anilhas sempre conferido com o sistema do SISPASS.", icon: <ShieldCheck />, color: "bg-emerald-600" }
  ],
  breeding: [
    { text: "Aumente a oferta de cálcio e vitamina E para as fêmeas 30 dias antes do início da temporada.", icon: <Heart />, color: "bg-rose-500" },
    { text: "Mantenha a umidade do ambiente controlada (entre 60-70%) para facilitar a eclosão dos ovos.", icon: <Info />, color: "bg-blue-500" },
    { text: "Evite mexer no ninho nos primeiros dias de vida dos filhotes para não estressar a mãe.", icon: <ShieldCheck />, color: "bg-slate-600" },
    { text: "Anote a data exata da postura para prever o nascimento e evitar perdas por ovo virado.", icon: <CalendarCheck size={18} />, color: "bg-purple-500" }
  ],
  meds: [
    { text: "Nunca use medicamentos vencidos. O princípio ativo pode perder eficácia ou se tornar tóxico.", icon: <AlertTriangle size={18} />, color: "bg-red-500" },
    { text: "A prevenção com probióticos é mais barata e segura do que o tratamento com antibióticos.", icon: <ShieldCheck />, color: "bg-emerald-500" },
    { text: "Sempre complete o ciclo do antibiótico, mesmo que a ave aparente melhora, para evitar resistência bacteriana.", icon: <Info />, color: "bg-blue-600" }
  ],
  finance: [
    { text: "Calcule o custo mensal por ave (Ração + Meds / Nº Aves) para precificar corretamente seus filhotes.", icon: <TrendingUp />, color: "bg-emerald-600" },
    { text: "Registre até os pequenos gastos como areia e sementes avulsas. No fim do ano, fazem diferença.", icon: <Info />, color: "bg-slate-500" },
    { text: "Mantenha um fundo de reserva para emergências veterinárias ou oportunidades de compra de matrizes.", icon: <Sparkles />, color: "bg-amber-500" }
  ],
  movements: [
    { text: "Sempre emita a GTR (Guia de Transporte) antes de levar a ave para torneios ou veterinário.", icon: <MapPin />, color: "bg-indigo-500" },
    { text: "Ao vender uma ave, confirme se o comprador possui cadastro ativo no SISPASS para evitar bloqueios.", icon: <ShieldCheck />, color: "bg-emerald-500" },
    { text: "Mantenha o histórico de óbitos justificado com laudos veterinários sempre que possível.", icon: <Info />, color: "bg-slate-600" }
  ],
  tasks: [
    { text: "Crie uma rotina de limpeza: fundos de gaiola diários, poleiros semanais e desinfecção geral mensal.", icon: <CalendarCheck size={18} />, color: "bg-blue-500" },
    { text: "Agende a troca de anilhas dos filhotes para o 5º ou 6º dia de vida, dependendo da espécie.", icon: <Info />, color: "bg-purple-500" },
    { text: "Verifique as unhas das aves periodicamente para evitar acidentes nas grades.", icon: <ShieldCheck />, color: "bg-rose-500" }
  ],
  tournaments: [
    { text: "Chegue cedo ao local do torneio para que a ave se ambiente à temperatura e iluminação.", icon: <MapPin />, color: "bg-amber-600" },
    { text: "Treine o pássaro na capa e no transporte semanas antes do evento oficial.", icon: <Sparkles />, color: "bg-indigo-500" },
    { text: "Evite mudar a alimentação da ave nos dias que antecedem o torneio para evitar distúrbios digestivos.", icon: <Info />, color: "bg-red-500" }
  ],
  settings: [
    { text: "Faça backup dos seus dados regularmente exportando os relatórios.", icon: <Zap />, color: "bg-slate-700" },
    { text: "Mantenha seu Certificado Digital atualizado para garantir acesso ao sistema do governo.", icon: <ShieldCheck />, color: "bg-emerald-600" },
    { text: "Personalize as cores do sistema para tornar o uso diário mais agradável aos seus olhos.", icon: <Sparkles />, color: "bg-pink-500" }
  ]
};

import { AlertTriangle, CalendarCheck } from 'lucide-react';

interface TipCarouselProps {
  category: TipCategory;
}

const TipCarousel: React.FC<TipCarouselProps> = ({ category }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const tips = TIPS_DB[category] || TIPS_DB.dashboard;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % tips.length);
        setIsAnimating(false);
      }, 500); // Metade do tempo da transição para trocar o texto invisível
    }, 10000); // Troca a cada 10 segundos

    return () => clearInterval(interval);
  }, [category, tips.length]);

  const currentTip = tips[currentIndex];

  return (
    <div className="relative overflow-hidden bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 group">
       {/* Background Decoration */}
       <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-colors duration-500 ${currentTip.color}`}></div>
       <div className={`absolute -left-6 -bottom-6 w-32 h-32 rounded-full opacity-5 transition-colors duration-500 ${currentTip.color}`}></div>

       <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <div className={`p-2 rounded-xl text-white shadow-sm transition-colors duration-500 ${currentTip.color}`}>
                <Lightbulb size={18} fill="currentColor" className="opacity-90" />
             </div>
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Dica de Manejo</h4>
          </div>
          
          <div className={`transition-all duration-500 transform ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
             <p className="text-sm font-bold text-slate-700 leading-relaxed min-h-[60px]">
               "{currentTip.text}"
             </p>
          </div>

          <div className="flex gap-1.5 mt-4 justify-end">
            {tips.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentIndex ? `w-6 ${currentTip.color.replace('bg-', 'bg-opacity-80 bg-')}` : 'w-1.5 bg-slate-200'}`}
              ></div>
            ))}
          </div>
       </div>
    </div>
  );
};

export default TipCarousel;
