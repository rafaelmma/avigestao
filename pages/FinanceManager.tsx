
import React, { useState, useMemo, Suspense } from 'react';
import { AppState, Transaction, TransactionCategory } from '../types';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign, 
  Calendar, 
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Tag,
  RefreshCcw,
  X
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));

interface FinanceManagerProps {
  state: AppState;
  addTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  restoreTransaction?: (id: string) => void;
  permanentlyDeleteTransaction?: (id: string) => void;
}

// Configuração das Categorias e Subcategorias
const CATEGORY_STRUCTURE: Record<string, Record<string, string[]>> = {
  'Receita': {
    'Venda de Aves': ['Ave Adulta', 'Filhote', 'Casal Formado', 'Lote'],
    'Serviços': ['Cobertura/Gala', 'Consultoria', 'Hospedagem'],
    'Outros': ['Premiação Torneio', 'Venda de Equipamento', 'Devolução']
  },
  'Despesa': {
    'Alimentação': ['Ração Extrusada', 'Sementes/Misturas', 'Farinhada', 'Frutas/Legumes', 'Vitamínicos'],
    'Saúde': ['Medicamentos', 'Veterinário', 'Exames Laboratoriais', 'Vacinas'],
    'Manejo e Insumos': ['Anilhas', 'Ninhos', 'Material de Ninho', 'Areia/Higiene', 'Produtos Limpeza'],
    'Estrutura': ['Gaiolas', 'Voadores', 'Bebedouros/Comedouros', 'Manutenção Instalações'],
    'Taxas e Licenças': ['Anuidade SISPASS', 'Taxa de Clube', 'GTA/Transporte', 'Inscrição Torneio'],
    'Outros': ['Energia/Água', 'Combustível', 'Imprevistos']
  }
};

const FinanceManager: React.FC<FinanceManagerProps> = ({ state, addTransaction, deleteTransaction, restoreTransaction, permanentlyDeleteTransaction }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');
  
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'Receita',
    date: new Date().toISOString().split('T')[0],
    category: 'Venda de Aves',
    subcategory: ''
  });

  const listToUse = currentList === 'active' ? state.transactions : (state.deletedTransactions || []);

  const income = state.transactions.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
  const expense = state.transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;

  const filteredTx = listToUse.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.subcategory && t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Obter categorias disponíveis baseadas no tipo (Receita/Despesa)
  const availableCategories = useMemo(() => {
    const type = newTx.type || 'Receita';
    return Object.keys(CATEGORY_STRUCTURE[type]);
  }, [newTx.type]);

  // Obter subcategorias baseadas na categoria selecionada
  const availableSubcategories = useMemo(() => {
    const type = newTx.type || 'Receita';
    const category = newTx.category;
    if (category && CATEGORY_STRUCTURE[type][category]) {
      return CATEGORY_STRUCTURE[type][category];
    }
    return [];
  }, [newTx.type, newTx.category]);

  const handleTypeChange = (type: 'Receita' | 'Despesa') => {
    const defaultCat = Object.keys(CATEGORY_STRUCTURE[type])[0];
    setNewTx({
      ...newTx,
      type,
      category: defaultCat as TransactionCategory,
      subcategory: ''
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTx.description && newTx.amount && newTx.category) {
      addTransaction({
        ...newTx as Transaction,
        id: Math.random().toString(36).substr(2, 9)
      });
      setShowModal(false);
      // Reset form keeping date
      setNewTx({ 
        type: 'Receita', 
        date: newTx.date, 
        category: 'Venda de Aves',
        subcategory: ''
      });
    }
  };

  // Funções de Lixeira
  const handleDeleteClick = (id: string) => {
    deleteTransaction(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restoreTransaction) restoreTransaction(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeleteTransaction) permanentlyDeleteTransaction(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Financeiro</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">Controle de caixa detalhado por categoria e subitem.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mr-2">
             <button 
               onClick={() => setCurrentList('active')} 
               className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currentList === 'active' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-400'}`}
             >
               Lançamentos
             </button>
             <button 
               onClick={() => setCurrentList('trash')} 
               className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-2 ${currentList === 'trash' ? 'bg-rose-500 text-white shadow' : 'text-slate-400'}`}
             >
               <Trash2 size={12} /> Lixeira
             </button>
           </div>
           {currentList === 'active' && (
             <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] hover:opacity-90 text-white rounded-2xl shadow-lg transition-all font-black text-xs uppercase tracking-widest"
             >
              <Plus size={18} />
              Novo Lançamento
             </button>
           )}
        </div>
      </header>
      
      {/* Carrossel de Dicas Financeiras */}
      <Suspense fallback={<div />}>
        <TipCarousel category="finance" />
      </Suspense>

      {/* Cards de Resumo - Visíveis apenas na lista ativa para não confundir */}
      {currentList === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                   <TrendingUp size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Entradas</span>
             </div>
             <p className="text-2xl font-black text-slate-800">R$ {income.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                   <TrendingDown size={20} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Saídas</span>
             </div>
             <p className="text-2xl font-black text-slate-800 text-rose-600">- R$ {expense.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-[#10B981] p-8 rounded-[32px] text-white shadow-xl shadow-emerald-100">
             <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 text-white rounded-xl">
                   <DollarSign size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Saldo Atual</span>
             </div>
             <p className="text-2xl font-black">R$ {balance.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      )}

      {currentList === 'trash' && (
         <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
            <p className="text-rose-700 font-bold text-sm">Lixeira Financeira</p>
            <p className="text-rose-600 text-xs">Lançamentos excluídos não contabilizam no saldo enquanto estiverem aqui.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Filtrar por descrição, categoria ou item..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[20px] focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-sm font-bold shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Descrição</th>
                <th className="px-8 py-5">Categoria / Item</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTx.length > 0 ? filteredTx.map(tx => (
                <tr key={tx.id} className={`transition-colors group ${currentList === 'trash' ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-500">{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-800">{tx.description}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg w-fit mb-1">
                        {tx.category}
                      </span>
                      {tx.subcategory && (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 pl-1">
                           <Tag size={10} /> {tx.subcategory}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-sm font-black ${tx.type === 'Receita' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'Receita' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {currentList === 'active' ? (
                      <button 
                        onClick={() => handleDeleteClick(tx.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => handleRestoreClick(e, tx.id)}
                          className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                          title="Restaurar"
                        >
                          <RefreshCcw size={14} />
                        </button>
                        <button 
                          onClick={(e) => handlePermanentDelete(e, tx.id)}
                          className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"
                          title="Apagar Permanentemente"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-300">
                    <div className="flex flex-col items-center opacity-30">
                      <DollarSign size={48} strokeWidth={1} />
                      <p className="text-sm font-bold mt-4 uppercase tracking-widest">Nenhum lançamento {currentList === 'active' ? 'encontrado' : 'na lixeira'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lançamento */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">Novo Lançamento</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Plus size={32} className="rotate-45" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="flex gap-4">
                 <button 
                  type="button"
                  onClick={() => handleTypeChange('Receita')}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${newTx.type === 'Receita' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                 >
                   <ArrowUpCircle size={18} /> Receita
                 </button>
                 <button 
                  type="button"
                  onClick={() => handleTypeChange('Despesa')}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${newTx.type === 'Despesa' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                 >
                   <ArrowDownCircle size={18} /> Despesa
                 </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição</label>
                <input required type="text" placeholder="Ex: Compra de Mistura de Sementes" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700" value={newTx.description || ''} onChange={e => setNewTx({...newTx, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                  <input required type="number" step="0.01" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700" value={newTx.amount || ''} onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 appearance-none" 
                    value={newTx.category} 
                    onChange={e => setNewTx({...newTx, category: e.target.value as TransactionCategory, subcategory: ''})}
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sub-Item</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 appearance-none disabled:opacity-50" 
                    value={newTx.subcategory} 
                    onChange={e => setNewTx({...newTx, subcategory: e.target.value})}
                    disabled={availableSubcategories.length === 0}
                  >
                    <option value="">Selecione...</option>
                    {availableSubcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="submit" className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all">Efetuar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceManager;
