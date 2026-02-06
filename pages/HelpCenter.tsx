
import React, { useMemo, useState } from 'react';
import { HelpCircle, Book, MessageCircle, ShieldQuestion, ExternalLink, Zap, Sparkles, Send, X } from 'lucide-react';
import WizardShell from '../components/WizardShell';
// import { askAI, isAIAvailable } from '../lib/gemini'; // Gemini API rodará no backend

// Mock functions para compatibilidade
const askAI = async (question: string) => {
  throw new Error('Assistente AI temporariamente indisponível. Em breve via backend!');
};
const isAIAvailable = () => false;

const HelpCenter: React.FC = () => {
  const faqs = [
    { q: 'Como cadastrar uma nova ave?', a: 'Vá em "Plantel" > "Nova Ave", preencha anilha, sexo, status e foto (ou use a imagem padrão). Salve para aparecer no card do plantel.' },
    { q: 'Como restaurar itens da lixeira?', a: 'Toda tela tem aba "Lixeira". Itens ficam 30 dias lá. Clique em Restaurar para voltar ao ativo ou em Apagar para sempre.' },
    { q: 'Como gerar remessa de sexagem?', a: 'Use "Central Sexagem": aves sem sexo definido aparecem lá. Selecione, gere a remessa e acompanhe o retorno para marcar o sexo.' },
    { q: 'Onde vinculo licença e CPF/CNPJ?', a: 'Em "Licenças & Docs" os dados vêm de Configurações. Mantenha CPF/CNPJ, SISPASS e datas em Configurações para refletir na licença.' },
    { q: 'Como registrar tarefas e concluir?', a: 'Em "Agenda / Tarefas" crie tarefas (única ou recorrente), conclua para mover ao Histórico e limpe o histórico quando necessário.' },
    { q: 'Como lançar eventos/torneios?', a: 'Em "Torneios / Eventos" cadastre título, data, local e tipo. Use o botão de checklist para preparar o pássaro e acompanhar o progresso.' },
    { q: 'Como controlar medicamentos e aplicações?', a: 'Cadastre o medicamento, aplique escolhendo ave e dosagem, e consulte o histórico na aba Histórico ou no perfil da ave (Histórico de Medicações).' },
    { q: 'Como lançar receitas e despesas?', a: 'Em "Financeiro" clique em "Novo Lançamento", escolha Receita/Despesa, categoria e subitem. Os lançamentos alimentam os cartões de saldo no dashboard.' },
    { q: 'Como imprimir cartão de identificação do pássaro?', a: 'Este é um recurso exclusivo para usuários com plano Profissional. Abra um pássaro no "Plantel", clique em "Imprimir Cartão" (botão com ícone de impressora). O cartão inclui: logo do seu criatório, número SISPASS, foto/ilustração da ave, dados completos (anilha, espécie, sexo, data de nascimento, cor/mutação). Configure seu logo e SISPASS em "Configurações" para aparecerem no cartão. Ideal para documentação durante fiscalização do IBAMA.' }
  ];

  const [search, setSearch] = useState('');
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    
    setIsAILoading(true);
    setAiError('');
    setAiResponse('');
    
    try {
      const response = await askAI(aiQuestion);
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
    return faqs.filter(item =>
      item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)
    );
  }, [faqs, search]);

  return (
    <WizardShell title="Ajuda & FAQ" description="Central de ajuda e respostas rápidas.">
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Ajuda & Suporte</h2>
          <p className="text-slate-500 font-medium">Tudo o que você precisa para dominar o AviGestão.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isAIAvailable() && (
            <button
              onClick={() => setShowAIChat(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-lg shadow-purple-500/30 transition-all"
            >
              <Sparkles size={14} /> Assistente IA
            </button>
          )}
          <a
            href="mailto:suporte@avigestao.com"
            className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-100"
          >
            <MessageCircle size={14} /> Email Suporte
          </a>
          <a
            href="https://wa.me/?text=Preciso%20de%20ajuda%20no%20AviGestao"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50"
          >
            <Zap size={14} /> WhatsApp
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Book size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Manuais</h3>
          <p className="text-xs text-slate-400 font-medium mb-4">Guia rápido para configurar seu criatório do zero.</p>
          <button className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2 mx-auto">
            Acessar <ExternalLink size={12} />
          </button>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} />
          </div>
          <h3 className="font-bold text-slate-800 mb-2">Comunidade</h3>
          <p className="text-xs text-slate-400 font-medium mb-4">Troque experiências com outros criadores.</p>
          <button className="text-[10px] font-black uppercase text-emerald-500 tracking-widest flex items-center gap-2 mx-auto">
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
            <p className="text-xs text-slate-300 font-medium mb-4">Atendimento prioritário para assinantes.</p>
            <button className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2 mx-auto">
              Falar com Suporte <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="text-emerald-500" />
            <h3 className="text-xl font-black text-slate-800">Perguntas Frequentes</h3>
          </div>
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por palavra-chave..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:border-emerald-500"
            />
          </div>
        </div>
        <div className="p-8 space-y-6">
          {filteredFaqs.length === 0 && (
            <p className="text-sm text-slate-400">Nenhum resultado para "{search}". Tente outro termo.</p>
          )}
          {filteredFaqs.map((faq, i) => (
            <div key={i} className="pb-6 border-b border-slate-50 last:border-0 last:pb-0">
              <h4 className="font-bold text-slate-800 mb-2">{faq.q}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal do Assistente IA */}
      {showAIChat && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-300">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 relative overflow-hidden">
              <Sparkles size={80} className="absolute -top-4 -right-4 text-white opacity-10 rotate-12" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Assistente IA</h3>
                    <p className="text-white/80 text-xs font-bold">Pergunte sobre criação de aves</p>
                  </div>
                </div>
                <button onClick={handleCloseAI} className="text-white/60 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              {!aiResponse && !isAILoading && !aiError && (
                <div className="text-center py-8">
                  <Sparkles size={48} className="mx-auto text-purple-500 mb-4" />
                  <h4 className="font-bold text-slate-800 mb-2">Como posso ajudar?</h4>
                  <p className="text-sm text-slate-500">Faça perguntas sobre manejo, SISPASS, acasalamentos, saúde...</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    <button
                      onClick={() => setAiQuestion('Como registrar uma ave no SISPASS?')}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left text-xs font-medium text-slate-700 transition-all"
                    >
                      💼 Como registrar no SISPASS?
                    </button>
                    <button
                      onClick={() => setAiQuestion('Quais cuidados básicos com Curió?')}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left text-xs font-medium text-slate-700 transition-all"
                    >
                      🐦 Cuidados básicos com Curió
                    </button>
                    <button
                      onClick={() => setAiQuestion('Como fazer acasalamento de Bicudo?')}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left text-xs font-medium text-slate-700 transition-all"
                    >
                      ❤️ Acasalamento de Bicudo
                    </button>
                    <button
                      onClick={() => setAiQuestion('O que fazer se a ave ficar doente?')}
                      className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl text-left text-xs font-medium text-slate-700 transition-all"
                    >
                      🏥 Ave doente, o que fazer?
                    </button>
                  </div>
                </div>
              )}

              {aiError && (
                <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-700 font-medium">{aiError}</p>
                </div>
              )}

              {isAILoading && (
                <div className="flex items-center gap-3 p-6 bg-purple-50 rounded-2xl">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <p className="text-sm font-medium text-purple-700">Consultando assistente...</p>
                </div>
              )}

              {aiResponse && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 rounded-2xl">
                    <p className="text-sm font-bold text-slate-700">Você perguntou:</p>
                    <p className="text-sm text-slate-600 mt-1">{aiQuestion}</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Digite sua pergunta..."
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                  disabled={isAILoading}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  onClick={handleAskAI}
                  disabled={!aiQuestion.trim() || isAILoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} /> Enviar
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
