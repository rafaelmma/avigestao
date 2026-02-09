import React, { useState, useEffect } from 'react';
import {
  Info,
  Sparkles,
  Zap,
  Heart,
  ShieldCheck,
  TrendingUp,
  MapPin,
  AlertTriangle,
  CalendarCheck,
  Trophy,
} from 'lucide-react';

type TipCategory =
  | 'dashboard'
  | 'birds'
  | 'breeding'
  | 'meds'
  | 'finance'
  | 'movements'
  | 'tasks'
  | 'tournaments'
  | 'settings';

interface Tip {
  text: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const TIPS_DB: Record<TipCategory, Tip[]> = {
  dashboard: [
    {
      text: 'Mantenha seus dados sempre atualizados. O backup automático depende da consistência das informações.',
      icon: <Zap />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Verifique o painel diariamente para não perder prazos de medicamentos ou renovações do IBAMA.',
      icon: <Info />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Use o resumo financeiro para identificar rapidamente onde estão seus maiores gastos mensais.',
      icon: <TrendingUp />,
      color: 'bg-emerald-500',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Exporte seus relatórios mensalmente para ter histórico seguro de todas as operações.',
      icon: <Zap />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Acompanhe o desempenho do plantel usando os gráficos e estatísticas disponíveis no dashboard.',
      icon: <TrendingUp />,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      text: 'Configure alertas para não esquecer de tarefas críticas como vacinações e registros no IBAMA.',
      icon: <AlertTriangle />,
      color: 'bg-amber-600',
      bgGradient: 'from-amber-50 to-yellow-50',
    },
  ],
  birds: [
    {
      text: 'A quarentena é essencial para novas aves. Mantenha-as isoladas por pelo menos 40 dias antes de juntar ao plantel.',
      icon: <ShieldCheck />,
      color: 'bg-rose-500',
      bgGradient: 'from-rose-50 to-red-50',
    },
    {
      text: 'Troque a água dos bebedouros diariamente e use água filtrada para evitar contaminações.',
      icon: <Info />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Aves de canto precisam de estímulos visuais e auditivos, mas evite o estresse excessivo pré-torneio.',
      icon: <Sparkles />,
      color: 'bg-amber-500',
      bgGradient: 'from-amber-50 to-orange-50',
    },
    {
      text: 'Mantenha o registro de anilhas sempre conferido com o sistema do SISPASS.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Observe o comportamento das aves diariamente para detectar doenças nos primeiros sintomas.',
      icon: <Info />,
      color: 'bg-red-500',
      bgGradient: 'from-red-50 to-rose-50',
    },
    {
      text: 'Forneça alimentos variados e de qualidade: frutas, vegetais e sementes especializadas conforme a espécie.',
      icon: <Sparkles />,
      color: 'bg-green-500',
      bgGradient: 'from-green-50 to-lime-50',
    },
    {
      text: 'Evite mudanças bruscas de ambiente ou temperatura. As aves são sensíveis a alterações repentinas.',
      icon: <AlertTriangle />,
      color: 'bg-orange-500',
      bgGradient: 'from-orange-50 to-amber-50',
    },
    {
      text: 'Mantenha a gaiola sempre limpa, mas sem produtos químicos agressivos que possam prejudicar as aves.',
      icon: <ShieldCheck />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Registre o peso das aves periodicamente. Perda ou ganho anormal pode indicar problemas de saúde.',
      icon: <Info />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Evite superlotação nas gaiolas. Espaço adequado reduz o estresse e melhora a saúde geral.',
      icon: <Heart />,
      color: 'bg-rose-600',
      bgGradient: 'from-rose-50 to-pink-50',
    },
  ],
  breeding: [
    {
      text: 'Aumente a oferta de cálcio e vitamina E para as fêmeas 30 dias antes do início da temporada.',
      icon: <Heart />,
      color: 'bg-rose-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      text: 'Mantenha a umidade do ambiente controlada (entre 60-70%) para facilitar a eclosão dos ovos.',
      icon: <Info />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Evite mexer no ninho nos primeiros dias de vida dos filhotes para não estressar a mãe.',
      icon: <ShieldCheck />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Anote a data exata da postura para prever o nascimento e evitar perdas por ovo virado.',
      icon: <CalendarCheck size={18} />,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      text: 'Realize a troca de anilhas no 6º dia de vida para a maioria das espécies de pequenos pássaros.',
      icon: <CalendarCheck size={18} />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Forneça ninho adequado ao tamanho da espécie. Um ninho errado reduz o sucesso reprodutivo.',
      icon: <Heart />,
      color: 'bg-pink-500',
      bgGradient: 'from-pink-50 to-rose-50',
    },
    {
      text: 'Controle a luz artificial para estimular o acasalamento. 14 horas de luz costuma ser ideal.',
      icon: <Zap />,
      color: 'bg-amber-600',
      bgGradient: 'from-amber-50 to-yellow-50',
    },
    {
      text: 'Não retire filhotes da gaiola antes deles ficarem independentes na alimentação (geralmente 25-35 dias).',
      icon: <Info />,
      color: 'bg-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Ofereça pasta de criação enriquecida em proteína para os filhotes durante a fase de desenvolvimento.',
      icon: <Heart />,
      color: 'bg-rose-600',
      bgGradient: 'from-rose-50 to-red-50',
    },
    {
      text: 'Descarte ovos inférteis após a primeira semana de incubação para evitar contaminações.',
      icon: <AlertTriangle />,
      color: 'bg-red-500',
      bgGradient: 'from-red-50 to-rose-50',
    },
    {
      text: 'Mantenha um registro genealógico para evitar consanguinidade excessiva na criação.',
      icon: <TrendingUp />,
      color: 'bg-purple-600',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      text: 'A temperatura ideal para incubação varia por espécie. Pesquise os parâmetros específicos.',
      icon: <Info />,
      color: 'bg-slate-500',
      bgGradient: 'from-slate-50 to-gray-50',
    },
  ],
  meds: [
    {
      text: 'Nunca use medicamentos vencidos. O princípio ativo pode perder eficácia ou se tornar tóxico.',
      icon: <AlertTriangle size={18} />,
      color: 'bg-red-500',
      bgGradient: 'from-red-50 to-rose-50',
    },
    {
      text: 'A prevenção com probióticos é mais barata e segura do que o tratamento com antibióticos.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-500',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Sempre complete o ciclo do antibiótico, mesmo que a ave aparente melhora, para evitar resistência bacteriana.',
      icon: <Info />,
      color: 'bg-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Mantenha um kit de primeiros socorros sempre à mão com antidiarreicos, anti-inflamatórios e desinfetantes.',
      icon: <ShieldCheck />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Evite automedicar. Consulte um veterinário especialista em aves antes de aplicar qualquer medicamento.',
      icon: <AlertTriangle />,
      color: 'bg-orange-500',
      bgGradient: 'from-orange-50 to-amber-50',
    },
    {
      text: 'Armazene medicamentos em local fresco, seco e longe da luz solar direta para manter sua eficácia.',
      icon: <Info />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'A desinfecção das gaiolas com hipoclorito (água sanitária) deve ser feita mensalmente para evitar doenças.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Vacinação anual é recomendada para aves que participam de torneios e eventos públicos.',
      icon: <Zap />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Observe sinais de doença como espojamento anormal, falta de apetite ou movimento errático.',
      icon: <AlertTriangle />,
      color: 'bg-red-600',
      bgGradient: 'from-red-50 to-rose-50',
    },
  ],
  finance: [
    {
      text: 'Calcule o custo mensal por ave (Ração + Meds / Nº Aves) para precificar corretamente seus filhotes.',
      icon: <TrendingUp />,
      color: 'bg-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Registre até os pequenos gastos como areia e sementes avulsas. No fim do ano, fazem diferença.',
      icon: <Info />,
      color: 'bg-slate-500',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Mantenha um fundo de reserva para emergências veterinárias ou oportunidades de compra de matrizes.',
      icon: <Sparkles />,
      color: 'bg-amber-500',
      bgGradient: 'from-amber-50 to-yellow-50',
    },
    {
      text: 'Compare preços de ração de diferentes fornecedores periodicamente para otimizar custos.',
      icon: <TrendingUp />,
      color: 'bg-green-500',
      bgGradient: 'from-green-50 to-lime-50',
    },
    {
      text: 'Documente todas as vendas e compras para fins fiscais e tributários.',
      icon: <Info />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Calcule a margem de lucro considerando custos de criação, tempo investido e despesas gerais.',
      icon: <TrendingUp />,
      color: 'bg-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Negocie pagamento em lote com fornecedores para conseguir melhores preços em ração e medicamentos.',
      icon: <Sparkles />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Mantenha notas fiscais de todas as compras para comprovar despesas em caso de auditoria.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-500',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Monitore o retorno sobre investimento (ROI) em cada linhagem de aves que você cria.',
      icon: <TrendingUp />,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
  ],
  movements: [
    {
      text: 'Sempre emita a GTR (Guia de Transporte) antes de levar a ave para torneios ou veterinário.',
      icon: <MapPin />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Ao vender uma ave, confirme se o comprador possui cadastro ativo no SISPASS para evitar bloqueios.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-500',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Mantenha o histórico de óbitos justificado com laudos veterinários sempre que possível.',
      icon: <Info />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Transporte as aves em caixas arejadas e adequadas ao tamanho para não causar lesões.',
      icon: <Heart />,
      color: 'bg-rose-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      text: 'Registre toda e qualquer movimentação de aves (compra, venda, doação, óbito) no SISPASS.',
      icon: <ShieldCheck />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Evite transportar aves em dias muito quentes ou frios para não expor a temperatura extrema.',
      icon: <AlertTriangle />,
      color: 'bg-orange-600',
      bgGradient: 'from-orange-50 to-amber-50',
    },
    {
      text: 'Forneça hidratação ao animal durante o transporte em viagens longas.',
      icon: <Info />,
      color: 'bg-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Mantenha comprovantes de despesas com veterinário e transporte para controle financeiro.',
      icon: <TrendingUp />,
      color: 'bg-green-600',
      bgGradient: 'from-green-50 to-lime-50',
    },
  ],
  tasks: [
    {
      text: 'Crie uma rotina de limpeza: fundos de gaiola diários, poleiros semanais e desinfecção geral mensal.',
      icon: <CalendarCheck size={18} />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Agende a troca de anilhas dos filhotes para o 5º ou 6º dia de vida, dependendo da espécie.',
      icon: <Info />,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      text: 'Verifique as unhas das aves periodicamente para evitar acidentes nas grades.',
      icon: <ShieldCheck />,
      color: 'bg-rose-500',
      bgGradient: 'from-rose-50 to-red-50',
    },
    {
      text: 'Mantenha um calendário com datas de vacinação, vermifugação e trocas de anilhas.',
      icon: <CalendarCheck size={18} />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Realize a limpeza das gaiolas sempre no início da manhã para causar menor estresse.',
      icon: <Info />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Revise e reposicione os ninhos antes da estação de reprodução para preparar o ambiente.',
      icon: <Heart />,
      color: 'bg-pink-500',
      bgGradient: 'from-pink-50 to-rose-50',
    },
    {
      text: 'Registre o consumo de ração para identificar desvios que possam indicar problemas de saúde.',
      icon: <TrendingUp />,
      color: 'bg-green-500',
      bgGradient: 'from-green-50 to-lime-50',
    },
    {
      text: 'Substitua poleiros gastos regularmente para evitar inflamações nas patas das aves.',
      icon: <ShieldCheck />,
      color: 'bg-slate-700',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Agende revisão veterinária semestral mesmo que as aves aparentem estar saudáveis.',
      icon: <Info />,
      color: 'bg-blue-600',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Mantenha uma agenda com as tarefas recorrentes para não esquecer de responsabilidades importantes.',
      icon: <CalendarCheck size={18} />,
      color: 'bg-purple-600',
      bgGradient: 'from-purple-50 to-pink-50',
    },
  ],
  tournaments: [
    {
      text: 'Chegue cedo ao local do torneio para que a ave se ambiente à temperatura e iluminação.',
      icon: <MapPin />,
      color: 'bg-amber-600',
      bgGradient: 'from-amber-50 to-yellow-50',
    },
    {
      text: 'Treine o pássaro na capa e no transporte semanas antes do evento oficial.',
      icon: <Sparkles />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Evite mudar a alimentação da ave nos dias que antecedem o torneio para evitar distúrbios digestivos.',
      icon: <Info />,
      color: 'bg-red-500',
      bgGradient: 'from-red-50 to-rose-50',
    },
    {
      text: 'Documente a participação com fotos e certificados para construir histórico de conquistas.',
      icon: <Trophy />,
      color: 'bg-amber-500',
      bgGradient: 'from-amber-50 to-yellow-50',
    },
    {
      text: 'Mantenha a ave em condição física ideal com exercício e alimentação adequada 2 meses antes da competição.',
      icon: <Heart />,
      color: 'bg-rose-500',
      bgGradient: 'from-rose-50 to-pink-50',
    },
    {
      text: 'Familiarize-se com as regras da competição e critérios de avaliação da sua modalidade.',
      icon: <Info />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Prepare uma gaiola de transporte confortável e sem barulhos para manter a ave calma.',
      icon: <ShieldCheck />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Leve documentação completa: anilha, GTR, comprovante de saúde e inscrição.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Após o torneio, analise o desempenho para identificar pontos de melhoria na criação.',
      icon: <TrendingUp />,
      color: 'bg-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
    },
    {
      text: 'Repouso adequado após competição é essencial para recuperação do animal.',
      icon: <Info />,
      color: 'bg-indigo-600',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
  ],
  settings: [
    {
      text: 'Faça backup dos seus dados regularmente exportando os relatórios.',
      icon: <Zap />,
      color: 'bg-slate-700',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Mantenha seu Certificado Digital atualizado para garantir acesso ao sistema do governo.',
      icon: <ShieldCheck />,
      color: 'bg-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
    },
    {
      text: 'Personalize as cores do sistema para tornar o uso diário mais agradável aos seus olhos.',
      icon: <Sparkles />,
      color: 'bg-pink-500',
      bgGradient: 'from-pink-50 to-rose-50',
    },
    {
      text: 'Atualize seus dados de criador regularmente no SISPASS para manter cadastro válido.',
      icon: <Info />,
      color: 'bg-blue-500',
      bgGradient: 'from-blue-50 to-cyan-50',
    },
    {
      text: 'Configure notificações para não perder prazos importantes de vencimentos e licenças.',
      icon: <AlertTriangle />,
      color: 'bg-orange-500',
      bgGradient: 'from-orange-50 to-amber-50',
    },
    {
      text: 'Revise suas configurações de privacidade se compartilha dados com outros criadores.',
      icon: <ShieldCheck />,
      color: 'bg-slate-600',
      bgGradient: 'from-slate-50 to-gray-50',
    },
    {
      text: 'Mantenha uma cópia local dos seus dados exportados como medida de segurança adicional.',
      icon: <Zap />,
      color: 'bg-indigo-500',
      bgGradient: 'from-indigo-50 to-blue-50',
    },
    {
      text: 'Utilize senhas fortes e únicas para proteger o acesso ao seu criador digital.',
      icon: <ShieldCheck />,
      color: 'bg-red-500',
      bgGradient: 'from-red-50 to-rose-50',
    },
  ],
};

interface TipCarouselProps {
  category: TipCategory;
  defaultOpen?: boolean;
  compact?: boolean;
}

const TipCarousel: React.FC<TipCarouselProps> = ({
  category,
  defaultOpen = false,
  compact = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const tips = TIPS_DB[category] || TIPS_DB.dashboard;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % tips.length);
        setIsAnimating(false);
      }, 500);
    }, 10000);

    return () => clearInterval(interval);
  }, [category, tips.length]);

  const currentTip = tips[currentIndex];

  if (!isOpen) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div
            className={`h-8 w-8 rounded-lg text-white flex items-center justify-center ${currentTip.color}`}
          >
            {currentTip.icon}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Dica rápida
            </p>
            <p className="text-xs font-semibold text-slate-700">Clique para ver uma dica</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
        >
          Mostrar
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${
        currentTip.bgGradient
      } rounded-xl border border-slate-200 shadow-sm ${
        compact ? 'p-4' : 'p-6'
      } group transition-all duration-500 hover:shadow-md`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-9 w-9 rounded-xl text-white flex items-center justify-center shadow-sm ${currentTip.color}`}
            >
              {currentTip.icon}
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Dica de manejo
              </h4>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
          >
            Ocultar
          </button>
        </div>

        <div
          className={`transition-all duration-500 transform ${
            isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <p
            className={`font-medium text-slate-800 leading-relaxed ${
              compact ? 'text-xs line-clamp-2' : 'text-sm'
            }`}
          >
            {currentTip.text}
          </p>
        </div>

        <div className="flex gap-1.5 mt-3 justify-center">
          {tips.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer hover:opacity-70 ${
                idx === currentIndex ? `w-6 ${currentTip.color}` : 'w-1.5 bg-slate-300'
              }`}
            ></button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TipCarousel;
