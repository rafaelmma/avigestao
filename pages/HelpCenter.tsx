
import React, { useMemo, useState } from 'react';
import { HelpCircle, Book, MessageCircle, ShieldQuestion, ExternalLink, Zap } from 'lucide-react';

const HelpCenter: React.FC = () => {
  const faqs = [
    { q: 'Como cadastrar uma nova ave?', a: 'Vá em "Plantel" > "Nova Ave", preencha anilha, sexo, status e foto (ou use a imagem padrão). Salve para aparecer no card do plantel.' },
    { q: 'Como restaurar itens da lixeira?', a: 'Toda tela tem aba "Lixeira". Itens ficam 30 dias lá. Clique em Restaurar para voltar ao ativo ou em Apagar para sempre.' },
    { q: 'Como gerar remessa de sexagem?', a: 'Use "Central Sexagem": aves sem sexo definido aparecem lá. Selecione, gere a remessa e acompanhe o retorno para marcar o sexo.' },
    { q: 'Onde vinculo licença e CPF/CNPJ?', a: 'Em "Licenças & Docs" os dados vêm de Configurações. Mantenha CPF/CNPJ, SISPASS e datas em Configurações para refletir na licença.' },
    { q: 'Como registrar tarefas e concluir?', a: 'Em "Agenda / Tarefas" crie tarefas (única ou recorrente), conclua para mover ao Histórico e limpe o histórico quando necessário.' },
    { q: 'Como lançar eventos/torneios?', a: 'Em "Torneios / Eventos" cadastre título, data, local e tipo. Use o botão de checklist para preparar o pássaro e acompanhar o progresso.' },
    { q: 'Como controlar medicamentos e aplicações?', a: 'Cadastre o medicamento, aplique escolhendo ave e dosagem, e consulte o histórico na aba Histórico ou no perfil da ave (Histórico de Medicações).' },
    { q: 'Como lançar receitas e despesas?', a: 'Em "Financeiro" clique em "Novo Lançamento", escolha Receita/Despesa, categoria e subitem. Os lançamentos alimentam os cartões de saldo no dashboard.' }
  ];

  const [search, setSearch] = useState('');

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const term = search.toLowerCase();
    return faqs.filter(item =>
      item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)
    );
  }, [faqs, search]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Ajuda & Suporte</h2>
          <p className="text-slate-500 font-medium">Tudo o que você precisa para dominar o AviGestão.</p>
        </div>
        <div className="flex gap-3">
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
            <HelpCircle className="text-brand" />
            <h3 className="text-xl font-black text-slate-800">Perguntas Frequentes</h3>
          </div>
          <div className="w-full md:w-80">
            <input
              type="text"
              placeholder="Buscar por palavra-chave..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:border-brand"
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
    </div>
  );
};

export default HelpCenter;
