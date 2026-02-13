import React, { useMemo, useState } from 'react';
import {
  HelpCircle,
  Book,
  MessageCircle,
  ShieldQuestion,
  ExternalLink,
  Zap,
  Sparkles,
  Send,
  X,
  Trophy,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import WizardShell from '../components/WizardShell';

// Mock functions para compatibilidade
const askAI = async () => {
  throw new Error('Assistente AI temporariamente indisponível. Em breve via backend!');
};
const isAIAvailable = () => false;

const HelpCenter: React.FC = () => {
  const faqs = [
    {
      q: 'Como configurar meu criatório do zero?',
      a: 'Siga estes passos: 1. Vá em "Configurações" e preencha seu Nome, CPF/CNPJ e SISPASS. 2. Suba o logotipo do seu criatório. 3. Vá em "Plantel" e cadastre suas aves. 4. Em "Manejo", crie seus Casais para começar o controle reprodutivo.',
    },
    {
      q: 'Como cadastrar uma nova ave?',
      a: 'Vá em "Gestão de Aves" > "Plantel" > "Nova Ave", preencha anilha, sexo, status e foto. Salve para que a ave apareça na sua lista ativa.',
    },
    {
      q: 'Como registrar nascimentos e posturas?',
      a: 'No menu "Manejo & Produtividade", acesse "Reprodução/Posturas". Selecione o casal, registre a data da postura e, posteriormente, a data de nascimento para gerar automaticamente o registro do filhote.',
    },
    {
      q: 'Como participar de torneios públicos?',
      a: 'Acesse o menu "Comunidade" > "Torneios Públicos". Escolha um torneio aberto, clique em "Detalhes" e depois em "Inscrever Ave". Selecione a ave do seu plantel que deseja inscrever.',
    },
    {
      q: 'Como tornar minha galeria de pássaros pública?',
      a: 'No menu "Plantel", selecione a ave e marque a opção "Público". Para que seu perfil de criador apareça na comunidade, vá em "Comunidade" > "Estatísticas" e ative "Meu Perfil Público".',
    },
    {
      q: 'Como restaurar itens da lixeira?',
      a: 'A maioria das telas possui uma aba "Lixeira". Os itens permanecem por 30 dias. Clique em "Restaurar" para voltarem ao estado ativo ou "Apagar" para exclusão permanente.',
    },
    {
      q: 'Como gerar certificados de pássaros?',
      a: 'No card da ave em "Plantel", clique no ícone de certificado. Você poderá visualizar e imprimir a ficha completa com genealogia e dados técnicos.',
    },
    {
      q: 'Onde verifico meu saldo financeiro?',
      a: 'No "Dashboard" principal você vê o resumo. Para detalhes, acesse "Gestão" > "Financeiro", onde pode filtrar por categoria, data e tipo de lançamento (Receita/Despesa).',
    },
    {
      q: 'Como trocar minha senha?',
      a: 'Vá em "Configurações" > "Segurança" ou faça logout e utilize a opção "Esqueci minha senha" na tela de login para receber um link de redefinição por e-mail.',
    },
  ];

  const manuals = [
    {
      title: 'Guia Rápido: Do Zero ao Primeiro Filhote',
      description: 'Aprenda a configurar o sistema, cadastrar plantel e registrar a primeira ninhada.',
      steps: [
        'Configurar perfil do criador (Logo e SISPASS)',
        'Cadastrar aves machos e fêmeas iniciais',
        'Formar casais no módulo de manejo',
        'Registrar posturas e controle de ovos',
        'Validar anilhamento de filhotes'
      ],
      icon: <Zap className="text-amber-500" />
    },
    {
      title: 'Manual de Torneios e Resultados',
      description: 'Como organizar ou participar de competições usando o AviGestão.',
      steps: [
        'Encontrar torneios abertos na comunidade',
        'Inscrever aves em categorias específicas',
        'Acompanhar classificações em tempo real',
        'Imprimir resultados e súmulas'
      ],
      icon: <Trophy className="text-indigo-500" />
    }
  ];

  const [search, setSearch] = useState('');
  const [selectedManual, setSelectedManual] = useState<typeof manuals[0] | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const openContactModal = () => {
    window.dispatchEvent(new Event('open-contact-modal'));
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;

    setIsAILoading(true);
    setAiError('');
    setAiResponse('');

    try {
      const response = await askAI();
      setAiResponse(response);
    } catch (error: any) {
      setAiError(error.message || 'Erro ao consultar assistente');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleCloseAI = () => {
    setShowAIChat(false);
    setAiQuestion('');
    setAiResponse('');
    setAiError('');
  };

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const term = search.toLowerCase();
    return faqs.filter(
      (item) => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term),
    );
  }, [faqs, search]);

  return (
    <WizardShell title="Ajuda & FAQ" description="Central de ajuda e respostas rápidas.">
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Canais de Suporte</h2>
            <p className="text-slate-500 font-medium">
              Escolha como prefere ser atendido ou aprenda por conta própria.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap relative z-10">
            {isAIAvailable() && (
              <button
                onClick={() => setShowAIChat(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-200 transition-all active:scale-95"
              >
                <Sparkles size={16} /> Assistente IA
              </button>
            )}
            <button
              onClick={openContactModal}
              className="px-6 py-2.5 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
            >
              <MessageCircle size={16} /> Abrir Ticket
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:border-indigo-200 group">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Book size={28} />
            </div>
            <h3 className="font-black text-xl text-slate-800 mb-2">Manuais Detalhados</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Guias passo a passo para configurar e usar cada módulo.
            </p>
            <button 
              onClick={() => setSelectedManual(manuals[0])}
              className="text-xs font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all"
            >
              Ver Manuais <ChevronRight size={14} />
            </button>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:border-emerald-200 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <MessageCircle size={28} />
            </div>
            <h3 className="font-black text-xl text-slate-800 mb-2">Comunidade VIP</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Troque experiências e dicas com outros criadores da plataforma.
            </p>
            <button className="text-xs font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
              Entrar no Grupo <ExternalLink size={14} />
            </button>
          </div>

          <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            <Zap
              size={120}
              className="absolute -bottom-6 -right-6 text-amber-500 opacity-5 -rotate-12 group-hover:scale-110 transition-transform duration-700"
              fill="currentColor"
            />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                <ShieldQuestion size={28} />
              </div>
              <h3 className="font-black text-xl mb-2">Suporte Prioritário</h3>
              <p className="text-sm text-slate-400 font-medium mb-6">
                Assinantes Profissional têm fila exclusiva e resposta em até 2h.
              </p>
              <button className="text-xs font-black uppercase text-amber-500 tracking-widest flex items-center gap-2 group-hover:gap-3 transition-all">
                Falar com Consultor <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
            <div className="p-8 border-b border-slate-50 flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                  <HelpCircle className="text-indigo-600" size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dúvidas Frequentes</h3>
              </div>
              <div className="w-full md:w-80 relative">
                <input
                  type="text"
                  placeholder="Ex: Como cadastrar ave..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl outline-none text-sm text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium"
                />
                <HelpCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              </div>
            </div>
            <div className="p-8 space-y-2">
              {filteredFaqs.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle size={40} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-medium">
                    Nenhum resultado para &quot;{search}&quot;. <br /> Tente buscar por palavras como "ave", "plano" ou "financeiro".
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                {filteredFaqs.map((faq, i) => (
                  <div 
                    key={i} 
                    className="p-6 rounded-3xl border border-slate-50 bg-slate-50/30 hover:bg-indigo-50/30 hover:border-indigo-100 transition-all group"
                  >
                    <h4 className="font-black text-slate-800 mb-3 flex items-start gap-3">
                      <span className="text-indigo-600 mt-1">Q.</span>
                      {faq.q}
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed pl-7">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden h-full flex flex-col justify-between">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-black mb-4 leading-tight">Configuração <br />em 5 Minutos</h3>
                <p className="text-indigo-100 text-sm font-medium mb-8">
                  Assista ao vídeo e veja como configurar todo seu criatório rapidamente.
                </p>
              </div>
              <button 
                onClick={() => setSelectedManual(manuals[0])}
                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-900/20 hover:scale-[1.02] transition-all active:scale-95"
              >
                Ver Passo a Passo
              </button>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <h3 className="font-black text-slate-900 mb-6">Manuais por Módulo</h3>
              <div className="space-y-4">
                {manuals.map((m, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedManual(m)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {m.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{m.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Módulo: {idx === 0 ? 'Configuração' : 'Torneios'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Manual Detalhado */}
        {selectedManual && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Book size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Manual</h3>
                    <h4 className="text-lg font-black text-indigo-600">{selectedManual.title}</h4>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedManual(null)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                <p className="text-slate-600 font-medium bg-indigo-50 p-6 rounded-3xl border border-indigo-100/50">
                  {selectedManual.description}
                </p>
                <div className="space-y-4">
                  <h5 className="font-black text-slate-900 uppercase text-xs tracking-widest pl-2">Passo a Passo:</h5>
                  {selectedManual.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-slate-700 font-bold">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="pt-8 flex justify-center">
                  <button 
                    onClick={() => setSelectedManual(null)}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                  >
                    Entendi, pronto para começar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal do Assistente IA */}
        {showAIChat && (
          <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-300">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 relative overflow-hidden">
                <Sparkles
                  size={100}
                  className="absolute -top-4 -right-4 text-white opacity-10 rotate-12"
                />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
                      <Sparkles size={28} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        Assistente IA
                      </h3>
                      <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">
                        Especialista em Manejo
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseAI}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                {!aiResponse && !isAILoading && !aiError && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Sparkles size={40} className="text-indigo-600" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-2">Como posso ajudar hoje?</h4>
                    <p className="text-sm text-slate-500 font-medium">
                      Faça perguntas sobre manejo, legislação, saúde ou o sistema.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                      <button
                        onClick={() => setAiQuestion('Como registrar uma ave no SISPASS?')}
                        className="p-5 bg-slate-50 hover:bg-white hover:border-indigo-200 border border-slate-100 rounded-[24px] text-left transition-all group"
                      >
                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Dica:</p>
                        <p className="text-xs font-bold text-slate-700"> Registro no SISPASS</p>
                      </button>
                      <button
                        onClick={() => setAiQuestion('Quais cuidados básicos com Curió?')}
                        className="p-5 bg-slate-50 hover:bg-white hover:border-indigo-200 border border-slate-100 rounded-[24px] text-left transition-all group"
                      >
                        <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Dica:</p>
                        <p className="text-xs font-bold text-slate-700"> Cuidados com Curió</p>
                      </button>
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-[24px] animate-in zoom-in-95 duration-300">
                    <p className="text-sm text-red-600 font-bold">{aiError}</p>
                  </div>
                )}

                {isAILoading && (
                  <div className="flex items-center gap-4 p-8 bg-indigo-50/50 rounded-[32px] border border-indigo-100">
                    <div className="relative">
                      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <Sparkles size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
                    </div>
                    <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Consultando Neurônios...</p>
                  </div>
                )}

                {aiResponse && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Sua pergunta:</p>
                      <p className="text-sm font-bold text-slate-700">{aiQuestion}</p>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-indigo-50 to-white rounded-[32px] border border-indigo-100 shadow-sm relative">
                      <CheckCircle2 size={24} className="absolute -top-3 -left-3 text-indigo-600 bg-white rounded-full p-0.5" />
                      <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                        {aiResponse}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50/80 backdrop-blur-md border-t border-slate-200">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Fale comigo..."
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                      disabled={isAILoading}
                      className="w-full pl-6 pr-12 py-4 bg-white border border-slate-200 rounded-[20px] outline-none text-sm text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium disabled:opacity-50"
                    />
                    <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                  </div>
                  <button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || isAILoading}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 active:scale-95"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
};

export default HelpCenter;
