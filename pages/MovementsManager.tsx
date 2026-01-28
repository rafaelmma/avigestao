
import React, { useState, useRef, Suspense } from 'react';
import { AppState, MovementRecord, Bird } from '../types';
import { 
  Skull, 
  Wind, 
  Truck, 
  Plus, 
  Calendar, 
  FileText, 
  Search, 
  Upload,
  Download,
  ArrowRightLeft,
  Info,
  ExternalLink,
  ChevronDown,
  UserCheck,
  Trash2,
  RefreshCcw,
  X,
  Edit
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));

interface MovementsManagerProps {
  state: AppState;
  addMovement: (mov: MovementRecord) => void;
  updateMovement: (mov: MovementRecord) => void;
  deleteMovement?: (id: string) => void;
  restoreMovement?: (id: string) => void;
  permanentlyDeleteMovement?: (id: string) => void;
}

const MovementsManager: React.FC<MovementsManagerProps> = ({ state, addMovement, updateMovement, deleteMovement, restoreMovement, permanentlyDeleteMovement }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');
  const [newMov, setNewMov] = useState<Partial<MovementRecord>>({
    type: 'Entrada',
    date: new Date().toISOString().split('T')[0]
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAttachment = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const parts = url.split(',');
      if (parts.length < 2) return;
      const meta = parts[0];
      const data = parts[1];
      const match = /data:(.*?);base64/.exec(meta);
      const mime = match ? match[1] : 'application/octet-stream';
      const byteChars = atob(data);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const makeId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const listToUse = currentList === 'active' ? state.movements : (state.deletedMovements || []);

  const filteredMovements = listToUse.filter(m => {
    const bird = state.birds.find(b => b.id === m.birdId) || state.deletedBirds?.find(b => b.id === m.birdId);
    return bird?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           bird?.ringNumber?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMov({ ...newMov, gtrUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setNewMov({ 
      type: 'Entrada', 
      date: new Date().toISOString().split('T')[0] 
    });
    setShowModal(true);
  };

  const handleOpenEdit = (mov: MovementRecord) => {
    if (currentList === 'trash') return;
    setIsEditing(true);
    setNewMov({ ...mov });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMov.birdId && newMov.type && newMov.date) {
      if (isEditing && newMov.id) {
        await updateMovement(newMov as MovementRecord);
      } else {
        await addMovement({
          ...newMov as MovementRecord,
          id: makeId()
        });
      }
      setShowModal(false);
      setNewMov({ type: 'Entrada', date: new Date().toISOString().split('T')[0] });
    }
  };

  // Funções de Lixeira
  const handleDeleteClick = (id: string) => {
    if (deleteMovement) deleteMovement(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restoreMovement) restoreMovement(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeleteMovement) permanentlyDeleteMovement(id);
  };

  const getBirdById = (id: string) => state.birds.find(b => b.id === id) || state.deletedBirds?.find(b => b.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Movimentações</h2>
                <p className="text-slate-400 font-medium text-sm mt-1">Entrada, saída, transferência, venda, doação e óbito</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mr-2">
             <button 
               onClick={() => setCurrentList('active')} 
               className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currentList === 'active' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-400'}`}
             >
               Histórico Ativo
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
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] hover:opacity-90 text-white rounded-xl shadow-lg transition-all font-bold text-sm"
             >
              <Plus size={18} />
              Nova Ocorrência
             </button>
           )}
        </div>
      </header>

      {/* Carrossel de Dicas de Movimentação */}
      <Suspense fallback={<div />}>
        <TipCarousel category="movements" />
      </Suspense>

      {currentList === 'trash' && (
         <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
            <p className="text-rose-700 font-bold text-sm">Lixeira de Movimentações</p>
            <p className="text-rose-600 text-xs">Exclusão permanente de registros de transporte ou óbito.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por anilha ou nome do pássaro..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Pássaro / Anilha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Destino / Detalhes</th>
                <th className="px-6 py-4">GTR / Anexo</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length > 0 ? filteredMovements.map(m => {
                const bird = getBirdById(m.birdId);
                return (
                  <tr key={m.id} className={`transition-colors ${currentList === 'trash' ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">
                          {(m.date ? new Date(m.date ?? new Date()) : new Date()).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{bird?.name || 'Desconhecido'}</p>
                        <p className="text-[10px] font-mono text-slate-400">{bird?.ringNumber ?? 'S/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                        m.type === 'Óbito' ? 'bg-slate-100 text-slate-600' :
                        m.type === 'Venda' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {m.type === '\u00d3bito' && <Skull size={12} />}
                        {m.type === 'Venda' && <ArrowRightLeft size={12} />}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-700 font-semibold truncate max-w-xs">{m.destination || m.notes || '-'}</p>
                        {m.buyerSispass && (
                          <p className="text-[10px] text-brand font-bold flex items-center gap-1">
                            <UserCheck size={10} /> SISPASS: {m.buyerSispass}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {m.gtrUrl ? (
                        <div className="flex flex-col gap-2">
                          <button 
                            type="button"
                            onClick={() => m.gtrUrl && openAttachment(m.gtrUrl)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors"
                          >
                            <FileText size={14} /> Abrir GTR
                          </button>
                          <a
                            href={m.gtrUrl}
                            download={`gtr-${m.id}.pdf`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            <Download size={14} /> Baixar
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium">Sem anexo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {currentList === 'active' ? (
                         <div className="flex justify-end gap-2">
                           <button 
                             onClick={() => handleOpenEdit(m)}
                             className="text-slate-300 hover:text-brand transition-colors"
                             title="Editar"
                           >
                             <Edit size={16} />
                           </button>
                           <button 
                             onClick={() => handleDeleteClick(m.id)}
                             className="text-slate-300 hover:text-rose-500 transition-colors"
                             title="Excluir"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                       ) : (
                         <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => handleRestoreClick(e, m.id)}
                              className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                              title="Restaurar"
                            >
                              <RefreshCcw size={14} />
                            </button>
                            <button 
                              onClick={(e) => handlePermanentDelete(e, m.id)}
                              className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"
                              title="Apagar Permanentemente"
                            >
                              <X size={14} />
                            </button>
                         </div>
                       )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <ArrowRightLeft size={48} strokeWidth={1} />
                      <p className="text-sm font-bold mt-4">Nenhuma movimentação {currentList === 'active' ? 'registrada' : 'na lixeira'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova/Editar Ocorrência */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">
                {isEditing ? 'Editar Ocorrência' : 'Registrar Ocorrência'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  Atenção: Ao registrar um **Óbito**, **Saída** ou **Venda**, o status do pássaro no plantel será alterado automaticamente.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pássaro</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand/5 focus:border-brand"
                  value={newMov.birdId || ''}
                  onChange={e => setNewMov({...newMov, birdId: e.target.value})}
                  disabled={isEditing} // Impedir mudança de pássaro na edição para não quebrar histórico facilmente
                >
                  <option value="">Selecione o pássaro...</option>
                  {/* Inclui pássaros da lixeira ou já movidos caso esteja editando um registro antigo */}
                  {state.birds.concat(state.deletedBirds || []).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.ringNumber}) - {b.status}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Ocorrência</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={newMov.type}
                    onChange={e => setNewMov({...newMov, type: e.target.value as any})}
                  >
                    <option value="Entrada">Entrada</option>
                    <option value="Saída">Saída</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Venda">Venda</option>                    
                    <option value="Doação">Doação</option>
                    <option value="Óbito">Óbito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input 
                    required
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={newMov.date}
                    onChange={e => setNewMov({...newMov, date: e.target.value})}
                  />
                </div>
              </div>

              {(newMov.type === 'Entrada' || newMov.type === 'Venda') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      {newMov.type === 'Venda' ? 'Novo Proprietário' : 'Destino'}
                    </label>
                    <input 
                      type="text"
                      placeholder={newMov.type === 'Venda' ? "Ex: João Silva" : "Ex: Criatório BH"}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand"
                      value={newMov.destination || ''}
                      onChange={e => setNewMov({...newMov, destination: e.target.value})}
                    />
                  </div>
                  
                  {newMov.type === 'Venda' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <UserCheck size={14} className="text-brand" /> Cadastro SISPASS do Comprador
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: 1234567-8"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand"
                        value={newMov.buyerSispass || ''}
                        onChange={e => setNewMov({...newMov, buyerSispass: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              )}

              {(newMov.type === 'Óbito' || newMov.type === 'Saída') && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações / Causa</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none h-20 resize-none focus:border-brand"
                    placeholder="Descreva detalhes da ocorrência..."
                    value={newMov.notes || ''}
                    onChange={e => setNewMov({...newMov, notes: e.target.value})}
                  />
                </div>
              )}

              {newMov.type === 'Entrada' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Anexar GTR (PDF/Imagem)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    {newMov.gtrUrl ? (
                       <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                         <FileText size={16} /> Arquivo Anexado
                       </span>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecionar GTR</span>
                      </>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-[#0F172A] text-white font-bold rounded-2xl shadow-xl hover:opacity-90 transition-all">
                  {isEditing ? 'Salvar Alterações' : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovementsManager;
