
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { AppState, Pair, Clutch, Bird } from '../types';
import { 
  Plus, 
  Heart, 
  Trash2, 
  Calendar, 
  ClipboardList, 
  Egg, 
  Baby, 
  Bell, 
  CheckCircle2, 
  Timer,
  Info,
  X,
  RefreshCcw,
  Archive,
  Edit2,
  Save,
  AlertTriangle
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import { SPECIES_INCUBATION_DAYS, getDefaultBirdImage } from '../constants';

interface BreedingManagerProps {
  state: AppState;
  addPair: (pair: Pair) => void;
  updatePair: (pair: Pair) => void;
  addBird: (bird: Bird) => void;
  addClutch: (clutch: Clutch) => void;
  updateClutch: (clutch: Clutch) => void;
  deletePair?: (id: string) => void;
  restorePair?: (id: string) => void;
  permanentlyDeletePair?: (id: string) => void;
}

interface PendingHatchling {
  name: string;
  ringNumber: string;
  sex: 'Indeterminado' | 'Macho' | 'Fêmea';
}

const BreedingManager: React.FC<BreedingManagerProps> = ({ state, addPair, updatePair, addBird, addClutch, updateClutch, deletePair, restorePair, permanentlyDeletePair }) => {
  const [showPairModal, setShowPairModal] = useState(false);
  const [showClutchModal, setShowClutchModal] = useState(false);
  const [showHatchlingModal, setShowHatchlingModal] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'error'} | null>(null);
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');

  const [newPair, setNewPair] = useState<Partial<Pair>>({ status: 'Ativo' });
  const [newClutch, setNewClutch] = useState<Partial<Clutch>>({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
  const [isEditingClutch, setIsEditingClutch] = useState(false);

  // State para registro de filhotes
  const [hatchlingsToRegister, setHatchlingsToRegister] = useState<PendingHatchling[]>([]);
  const [hatchlingParentPairId, setHatchlingParentPairId] = useState<string | null>(null);
  const [hatchlingBirthDate, setHatchlingBirthDate] = useState<string>('');

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

  // Listas base de aves ativas
  const males = useMemo(() => state.birds.filter(b => b.sex === 'Macho' && b.status === 'Ativo'), [state.birds]);
  const females = useMemo(() => state.birds.filter(b => b.sex === 'Fêmea' && b.status === 'Ativo'), [state.birds]);

  // Lógica de Filtragem Cruzada (Mesma Espécie)
  const selectedMaleBird = useMemo(() => males.find(m => m.id === newPair.maleId), [males, newPair.maleId]);
  const selectedFemaleBird = useMemo(() => females.find(f => f.id === newPair.femaleId), [females, newPair.femaleId]);

  const availableMales = useMemo(() => {
    if (selectedFemaleBird) {
      return males.filter(m => m.species === selectedFemaleBird.species);
    }
    return males;
  }, [males, selectedFemaleBird]);

  const availableFemales = useMemo(() => {
    if (selectedMaleBird) {
      return females.filter(f => f.species === selectedMaleBird.species);
    }
    return females;
  }, [females, selectedMaleBird]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSavePair = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!newPair.maleId || !newPair.femaleId || !newPair.name) {
      setNotification({ 
        message: 'Erro: Preencha todos os campos obrigatórios (macho, fêmea e nome do casal).', 
        type: 'error' 
      });
      return;
    }
    
    // Validação de Espécie Cruzada
    const m = males.find(b => b.id === newPair.maleId);
    const f = females.find(b => b.id === newPair.femaleId);
    
    if (m && f && m.species !== f.species) {
      setNotification({ 
        message: `Erro: Não é permitido acasalar espécies diferentes (${m.species} + ${f.species}).`, 
        type: 'error' 
      });
      return;
    }

    // Criar o casal com todos os campos obrigatórios
    const pairData: Pair = {
      id: makeId(),
      maleId: newPair.maleId,
      femaleId: newPair.femaleId,
      name: newPair.name,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Ativo'
    };

    addPair(pairData);
    setShowPairModal(false);
    setNewPair({ status: 'Ativo' });
    setNotification({ message: 'Novo casal registrado com sucesso!', type: 'success' });
  };

  const handleSaveClutch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPairId) {
      const hatchedCount = newClutch.hatchedCount || 0;
      
      if (isEditingClutch && newClutch.id) {
        // Modo Edição
        updateClutch(newClutch as Clutch);
        setNotification({ message: 'Dados da ninhada atualizados!', type: 'success' });
      } else {
        // Modo Criação
        const clutchData: Clutch = {
          ...newClutch as Clutch,
          id: makeId(),
          pairId: selectedPairId
        };
        addClutch(clutchData);
        
        setNotification({ message: 'Postura registrada com sucesso.', type: 'info' });
      }

      setShowClutchModal(false);
      
      // Se houve nascimentos, prepara o modal de cadastro de filhotes
      if (hatchedCount > 0) {
        prepareHatchlingRegistration(selectedPairId, hatchedCount, newClutch.layDate || new Date().toISOString());
      } else {
        setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
        setIsEditingClutch(false);
      }
    }
  };

  const prepareHatchlingRegistration = (pairId: string, count: number, layDate: string) => {
    const incubationDays = getIncubationDays(pairId);
    const estimatedBirthDate = new Date(new Date(layDate).getTime() + (incubationDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    
    setHatchlingParentPairId(pairId);
    setHatchlingBirthDate(estimatedBirthDate);
    
    // Cria array inicial de filhotes
    const initialHatchlings: PendingHatchling[] = Array(count).fill(null).map((_, i) => ({
      name: `Filhote ${i + 1}`,
      ringNumber: '',
      sex: 'Indeterminado'
    }));
    
    setHatchlingsToRegister(initialHatchlings);
    setShowHatchlingModal(true);
  };

  const handleRegisterHatchlings = (pairId: string, count: number, layDate: string) => {
    if (count <= 0) return;
    prepareHatchlingRegistration(pairId, count, layDate);
  };

  const confirmHatchlingRegistration = () => {
    // Validações
    if (!hatchlingParentPairId) {
      setNotification({ message: 'Erro: Casal não identificado', type: 'error' });
      return;
    }

    if (!hatchlingBirthDate) {
      setNotification({ message: 'Por favor, insira a data do nascimento', type: 'error' });
      return;
    }

    if (hatchlingsToRegister.length === 0) {
      setNotification({ message: 'Nenhum filhote para registrar', type: 'error' });
      return;
    }

    const pair = state.pairs.find(p => p.id === hatchlingParentPairId);
    if (!pair) {
      setNotification({ message: 'Erro: Casal não encontrado', type: 'error' });
      return;
    }

    // Busca dados da mãe para herdar espécie
    const mother = state.birds.find(b => b.id === pair.femaleId);
    const species = mother?.species || 'Espécie Indefinida';

    try {
      hatchlingsToRegister.forEach(hatchling => {
        const newBird: Bird = {
          id: makeId(),
          name: hatchling.name,
          ringNumber: hatchling.ringNumber || 'S/A', // Sem Anilha
          species: species,
          sex: hatchling.sex,
          birthDate: hatchlingBirthDate,
          status: 'Ativo',
          fatherId: pair.maleId,
          motherId: pair.femaleId,
          classification: 'Não Definido',
          songTrainingStatus: 'Não Iniciado',
          colorMutation: 'Clássico (Filhote)', // Padrão
          location: pair.name, // Herda localização do casal
          photoUrl: getDefaultBirdImage(species, hatchling.sex),
          createdAt: new Date().toISOString(),
          isRepeater: false,
          songType: ''
        };
        addBird(newBird);
      });

      updatePair({ ...pair, lastHatchDate: hatchlingBirthDate });

      setNotification({ 
        message: `${hatchlingsToRegister.length} filhotes foram adicionados ao plantel!`, 
        type: 'success' 
      });
      
      // Reset e fecha
      setShowHatchlingModal(false);
      setHatchlingsToRegister([]);
      setHatchlingParentPairId('');
      setHatchlingBirthDate('');
      setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 });
      setIsEditingClutch(false);
    } catch (error) {
      console.error('Erro ao registrar filhotes:', error);
      setNotification({ message: 'Erro ao registrar filhotes', type: 'error' });
    }
  };

  const openClutchModal = (pairId: string, clutchToEdit?: Clutch) => {
    setSelectedPairId(pairId);
    if (clutchToEdit) {
      setNewClutch({ ...clutchToEdit });
      setIsEditingClutch(true);
    } else {
      setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0, layDate: new Date().toISOString().split('T')[0] });
      setIsEditingClutch(false);
    }
    setShowClutchModal(true);
  };

  // Funções de Lixeira
  const handleDeleteClick = (id: string) => {
    if (deletePair) deletePair(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restorePair) restorePair(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeletePair) permanentlyDeletePair(id);
  };

  const getBirdName = (id?: string) => state.birds.find(b => b.id === id)?.name || 'N/A';
  const getPairName = (id: string) => state.pairs.find(p => p.id === id)?.name || 'N/A';

  // Helper para obter dias de incubação baseado no casal
  const getIncubationDays = (pairId: string) => {
    const pair = state.pairs.find(p => p.id === pairId);
    if (!pair) return 14;
    const female = state.birds.find(b => b.id === pair.femaleId);
    return female ? (SPECIES_INCUBATION_DAYS[female.species] || 14) : 14;
  };

  // Helper para nome da espécie
  const getPairSpecies = (pairId?: string) => {
    if (!pairId) return '';
    const pair = state.pairs.find(p => p.id === pairId);
    if (!pair) return '';
    const female = state.birds.find(b => b.id === pair.femaleId);
    return female?.species || '';
  }

  // Listagem condicional
  const visiblePairs = currentList === 'active' ? state.pairs : (state.deletedPairs || []);

  // Calcular eclosões futuras com base na espécie
  const incubatorClutches = state.clutches
    .filter(c => c.hatchedCount === 0 && c.fertileCount > 0)
    .map(c => {
      const layDate = new Date(c.layDate);
      const incubationDays = getIncubationDays(c.pairId);
      const hatchDate = new Date(layDate);
      hatchDate.setDate(layDate.getDate() + incubationDays);
      return { ...c, hatchDate, incubationDays };
    })
    .sort((a, b) => a.hatchDate.getTime() - b.hatchDate.getTime());

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[200] p-6 rounded-[24px] shadow-2xl flex items-center gap-4 border animate-in slide-in-from-right-full duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 
          notification.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' :
          'bg-blue-50 border-blue-100 text-blue-800'
        }`}>
          <div className={`p-2 rounded-full ${
            notification.type === 'success' ? 'bg-emerald-100' : 
            notification.type === 'error' ? 'bg-rose-100' :
            'bg-blue-100'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 size={24} /> : 
             notification.type === 'error' ? <AlertTriangle size={24} /> :
             <Bell size={24} />}
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest leading-none mb-1">Notificação</p>
            <p className="text-xs font-bold opacity-80">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="ml-4 p-1 hover:bg-black/5 rounded-lg">
            <X size={16} />
          </button>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Reprodução</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">Gestão de casais, incubação e nascimentos.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mr-2">
             <button 
               onClick={() => setCurrentList('active')} 
               className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currentList === 'active' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-400'}`}
             >
               Casais Ativos
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
              onClick={() => { setShowPairModal(true); setNewPair({ status: 'Ativo' }); }}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] hover:opacity-90 text-white rounded-2xl shadow-lg transition-all font-black text-xs uppercase tracking-widest"
             >
              <Plus size={18} />
              Registrar Casal
             </button>
           )}
        </div>
      </header>

      {currentList === 'trash' && (
         <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl mb-4">
            <p className="text-rose-700 font-bold text-sm">Lixeira de Casais</p>
            <p className="text-rose-600 text-xs">Restaure casais desfeitos acidentalmente ou remova o histórico definitivamente.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Casais */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
              <Heart size={20} className="text-rose-500" />
              {currentList === 'active' ? 'Casais Ativos' : 'Casais Excluídos'}
            </h3>
            <span className="px-3 py-1 bg-rose-50 text-rose-500 text-[10px] font-black rounded-lg uppercase">
              {visiblePairs.length} Registros
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visiblePairs.length > 0 ? visiblePairs.map(pair => (
              <div key={pair.id} className={`group bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ${currentList === 'trash' ? 'opacity-80' : ''}`}>
                <div className="p-6 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      <Heart size={24} fill={pair.status === 'Ativo' ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 leading-tight">{pair.name}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unido em: {new Date(pair.startDate).toLocaleDateString('pt-BR')}</p>
                      {pair.lastHatchDate && (
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">
                          Ultima ninhada: {new Date(pair.lastHatchDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {currentList === 'active' && (
                    <button 
                      onClick={() => handleDeleteClick(pair.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                      title="Mover para Lixeira"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="p-6 flex items-center justify-around relative gap-3">
                   <span className="inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100 max-w-[120px] truncate">
                     {getBirdName(pair.maleId)}
                   </span>
                   <div className="flex flex-col items-center gap-1">
                     <Heart size={20} className="text-slate-200" fill="currentColor" />
                     <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-100 max-w-[120px] truncate">
                       {getPairSpecies(pair.id)}
                     </span>
                   </div>
                   <span className="inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100 max-w-[120px] truncate">
                     {getBirdName(pair.femaleId)}
                   </span>
                </div>

                {currentList === 'active' ? (
                  <div className="p-6 pt-0">
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                       <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <ClipboardList size={14} /> Histórico Recente
                       </h4>
                       <div className="space-y-2">
                         {state.clutches.filter(c => c.pairId === pair.id).slice(0, 3).map(clutch => (
                           <div key={clutch.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm group/clutch relative">
                             <div className="flex items-center gap-3">
                                <Calendar size={14} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-700">{new Date(clutch.layDate).toLocaleDateString('pt-BR')}</span>
                             </div>
                             <div className="flex items-center gap-4">
                                 <span className="text-[10px] font-black text-brand uppercase whitespace-nowrap">{clutch.eggCount} OVOS</span>
                                 {clutch.hatchedCount > 0 ? (
                                   <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1 whitespace-nowrap">
                                     <Baby size={10} /> {clutch.hatchedCount}
                                   </span>
                                 ) : (
                                   <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1 whitespace-nowrap">
                                     <Timer size={10} /> INCUBANDO
                                   </span>
                                 )}
                             </div>
                               {clutch.hatchedCount > 0 && (
                                 <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                   Nascidos: {clutch.hatchedCount}
                                 </span>
                               )}
                             {/* Botão de Edição da Ninhada */}
                             <button 
                               onClick={() => openClutchModal(pair.id, clutch)}
                               className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-brand hover:border-brand opacity-0 group-hover/clutch:opacity-100 transition-all"
                               title="Editar Ninhada"
                             >
                               <Edit2 size={12} />
                             </button>
                           </div>
                         ))}
                         <button 
                          onClick={() => openClutchModal(pair.id)}
                          className="w-full py-3 bg-white border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-brand hover:text-brand transition-all flex items-center justify-center gap-2"
                         >
                           <Plus size={14} /> Registrar Ninhada
                         </button>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border-t border-rose-100 flex gap-2">
                     <button 
                        onClick={(e) => handleRestoreClick(e, pair.id)}
                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-emerald-600"
                     >
                       <RefreshCcw size={14} /> Restaurar
                     </button>
                     <button 
                        onClick={(e) => handlePermanentDelete(e, pair.id)}
                        className="flex-1 py-2 bg-rose-500 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-rose-600"
                     >
                       <X size={14} /> Apagar
                     </button>
                  </div>
                )}
              </div>
            )) : (
              <div className="col-span-full py-20 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
                 <Heart size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum casal {currentList === 'active' ? 'registrado' : 'na lixeira'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Alertas e Previsões (Visível apenas na lista ativa) */}
        {currentList === 'active' && (
          <div className="space-y-6">
             <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                <Bell size={20} className="text-amber-500" />
                Previsão de Eclosão
             </h3>

             <div className="space-y-4">
                {incubatorClutches.length > 0 ? incubatorClutches.map(c => {
                  const today = new Date();
                  const diff = Math.ceil((c.hatchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isLate = diff < 0;
                  const isToday = diff === 0;
                  const pair = state.pairs.find(p => p.id === c.pairId);
                  const maleName = pair ? getBirdName(pair.maleId) : 'N/A';
                  const femaleName = pair ? getBirdName(pair.femaleId) : 'N/A';

                  return (
                    <div key={c.id} className={`p-6 rounded-[32px] border shadow-sm transition-all ${
                      isLate ? 'bg-rose-50 border-rose-100' : isToday ? 'bg-emerald-50 border-emerald-100 animate-pulse' : 'bg-white border-slate-100'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                         <div className={`p-3 rounded-2xl ${isLate ? 'bg-rose-100 text-rose-600' : isToday ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Egg size={24} />
                         </div>
                         <div className="text-right">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isLate ? 'text-rose-500' : 'text-slate-400'}`}>
                              {isLate ? 'Eclosão Atrasada' : isToday ? 'Previsto para HOJE' : `Em ${diff} dias`}
                            </p>
                            <p className="text-xs font-black text-slate-800">{c.hatchDate.toLocaleDateString('pt-BR')}</p>
                         </div>
                      </div>
                      
                      <div className="space-y-3">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Casal</p>
                            <p className="text-sm font-black text-slate-700">{getPairName(c.pairId)}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
                                {maleName}
                              </span>
                              <span className="text-[10px] text-slate-300 font-black">Ø</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100">
                                {femaleName}
                              </span>
                            </div>
                         </div>
                         
                         {/* Indicador de Espécie e Tempo */}
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold rounded-md">
                              {getPairSpecies(c.pairId)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              (Média {c.incubationDays} dias)
                            </span>
                         </div>

                         <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-1 text-[10px] font-black text-brand uppercase">
                               <Baby size={12} /> {c.fertileCount} Ovos Galados
                            </div>
                            <button 
                              onClick={() => {
                                if (c.hatchedCount > 0) {
                                  handleRegisterHatchlings(c.pairId, c.hatchedCount, c.layDate);
                                } else {
                                  openClutchModal(c.pairId, c as Clutch);
                                }
                              }}
                              className="px-3 py-1 bg-[#0F172A] text-white text-[9px] font-black rounded-lg uppercase hover:opacity-80 transition-all"
                            >
                               {c.hatchedCount > 0 ? 'Registrar Filhotes (Data Real)' : 'Registrar Nascimento'}
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-10 bg-slate-50/50 border border-slate-100 rounded-[32px] text-center">
                     <Timer size={32} className="mx-auto text-slate-200 mb-3" />
                     <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma eclosão pendente</p>
                  </div>
                )}
             </div>

             {/* Carrossel de Dicas de Reprodução */}
             <Suspense fallback={<div />}>
               <TipCarousel category="breeding" />
             </Suspense>
          </div>
        )}
      </div>

      {/* New Pair Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">Formar Casal</h3>
              <button onClick={() => setShowPairModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Plus size={32} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSavePair} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identificação do Casal / Box</label>
                <input 
                  required
                  type="text"
                  placeholder="Ex: Box 05 - Curiós"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700"
                  value={newPair.name || ''}
                  onChange={e => setNewPair({...newPair, name: e.target.value})}
                />
              </div>
              
              {/* Alerta de Filtragem de Espécie */}
              {(selectedMaleBird || selectedFemaleBird) && (
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold border border-blue-100 flex items-center gap-2">
                   <Info size={14} />
                   Filtrando por espécie: {selectedMaleBird?.species || selectedFemaleBird?.species}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Macho Selecionado {selectedFemaleBird ? `(Apenas ${selectedFemaleBird.species})` : ''}
                  </label>
                  <select 
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                    value={newPair.maleId || ''}
                    onChange={e => {
                        const newMaleId = e.target.value;
                        const newMale = males.find(m => m.id === newMaleId);
                        // Se já tem fêmea selecionada e a espécie não bate, limpa a fêmea
                        if (newMale && newPair.femaleId) {
                            const currentFemale = females.find(f => f.id === newPair.femaleId);
                            if (currentFemale && currentFemale.species !== newMale.species) {
                                setNewPair({...newPair, maleId: newMaleId, femaleId: ''});
                                return;
                            }
                        }
                        setNewPair({...newPair, maleId: newMaleId});
                    }}
                  >
                    <option value="">Selecione um Macho</option>
                    {availableMales.map(m => <option key={m.id} value={m.id}>{m.name} ({m.ringNumber}) - {m.species}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Fêmea Selecionada {selectedMaleBird ? `(Apenas ${selectedMaleBird.species})` : ''}
                  </label>
                  <select 
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700"
                    value={newPair.femaleId || ''}
                    onChange={e => {
                        const newFemaleId = e.target.value;
                        const newFemale = females.find(f => f.id === newFemaleId);
                        // Se já tem macho selecionado e a espécie não bate, limpa o macho
                        if (newFemale && newPair.maleId) {
                            const currentMale = males.find(m => m.id === newPair.maleId);
                            if (currentMale && currentMale.species !== newFemale.species) {
                                setNewPair({...newPair, femaleId: newFemaleId, maleId: ''});
                                return;
                            }
                        }
                        setNewPair({...newPair, femaleId: newFemaleId});
                    }}
                  >
                    <option value="">Selecione uma Fêmea</option>
                    {availableFemales.map(f => <option key={f.id} value={f.id}>{f.name} ({f.ringNumber}) - {f.species}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-4">Confirmar Casal</button>
            </form>
          </div>
        </div>
      )}

      {/* New/Edit Clutch Modal */}
      {showClutchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                {isEditingClutch ? 'Editar Ninhada' : 'Registrar Ninhada'}
              </h3>
              <button onClick={() => setShowClutchModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Plus size={32} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSaveClutch} className="p-10 space-y-6">
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <div className="flex gap-3 items-center">
                  <Info size={16} className="text-blue-600 flex-shrink-0" />
                  <p className="text-[11px] text-blue-900 leading-relaxed font-bold">
                    Casal: {getPairName(selectedPairId || '')}
                  </p>
                </div>
                {/* Info sobre a espécie e incubação */}
                <div className="pl-7">
                   <p className="text-[10px] text-blue-700 font-medium">
                     Espécie: {getPairSpecies(selectedPairId || '')} • 
                     Incubação Média: {getIncubationDays(selectedPairId || '')} dias
                   </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data da Postura</label>
                <input 
                  required
                  type="date"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700"
                  value={newClutch.layDate || ''}
                  onChange={e => setNewClutch({...newClutch, layDate: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Ovos</label>
                  <input type="number" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-center font-black text-slate-700" value={newClutch.eggCount} onChange={e => setNewClutch({...newClutch, eggCount: parseInt(e.target.value) || 0})}/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center text-brand">Galados</label>
                  <input type="number" className="w-full px-4 py-4 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none text-center font-black text-emerald-700" value={newClutch.fertileCount} onChange={e => setNewClutch({...newClutch, fertileCount: parseInt(e.target.value) || 0})}/>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center text-rose-500">Nascidos</label>
                  <input type="number" className="w-full px-4 py-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none text-center font-black text-rose-700" value={newClutch.hatchedCount} onChange={e => setNewClutch({...newClutch, hatchedCount: parseInt(e.target.value) || 0})}/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações</label>
                <textarea 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none h-20 resize-none font-medium text-slate-700"
                  value={newClutch.notes || ''}
                  onChange={e => setNewClutch({...newClutch, notes: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full py-5 bg-brand text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand/20 mt-4">
                {isEditingClutch ? 'Salvar Alterações' : 'Confirmar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Filhotes */}
      {showHatchlingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Registrar Filhotes</h3>
                <p className="text-slate-400 text-xs font-medium mt-1">
                  Confirme os dados para adicionar {hatchlingsToRegister.length} aves ao plantel.
                </p>
              </div>
              <button onClick={() => setShowHatchlingModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
               <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                    <Baby size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Cadastro Automático</p>
                    <p className="text-[10px] text-emerald-600 leading-tight">
                      A espécie e os pais já foram preenchidos automaticamente com base no casal selecionado.
                    </p>
                  </div>
               </div>

               <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data real do nascimento</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-brand"
                    value={hatchlingBirthDate}
                    onChange={(e) => setHatchlingBirthDate(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400">Se nasceu antes da previsão, ajuste a data aqui.</p>
               </div>

               <div className="space-y-4">
                 {hatchlingsToRegister.map((hatchling, index) => (
                   <div key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                         <span className="text-xs font-black uppercase text-slate-400 tracking-widest bg-white px-2 py-1 rounded-lg border border-slate-100">
                           Filhote #{index + 1}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400">
                           Nascimento: {new Date(hatchlingBirthDate).toLocaleDateString('pt-BR')}
                         </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome / ID</label>
                            <input 
                              type="text" 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                              value={hatchling.name}
                              onChange={(e) => {
                                const newArr = [...hatchlingsToRegister];
                                newArr[index].name = e.target.value;
                                setHatchlingsToRegister(newArr);
                              }}
                            />
                         </div>
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Anilha</label>
                            <input 
                              type="text" 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                              placeholder="Opcional"
                              value={hatchling.ringNumber}
                              onChange={(e) => {
                                const newArr = [...hatchlingsToRegister];
                                newArr[index].ringNumber = e.target.value;
                                setHatchlingsToRegister(newArr);
                              }}
                            />
                         </div>
                         <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sexo</label>
                            <select 
                              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                              value={hatchling.sex}
                              onChange={(e) => {
                                const newArr = [...hatchlingsToRegister];
                                newArr[index].sex = e.target.value as any;
                                setHatchlingsToRegister(newArr);
                              }}
                            >
                              <option value="Indeterminado">Indeterminado</option>
                              <option value="Macho">Macho</option>
                              <option value="Fêmea">Fêmea</option>
                            </select>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="p-8 border-t border-slate-50 bg-white z-10 flex gap-4">
               <button 
                 onClick={() => { setShowHatchlingModal(false); setNewClutch({ eggCount: 0, fertileCount: 0, hatchedCount: 0 }); setIsEditingClutch(false); }}
                 className="flex-1 py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
               >
                 Pular Cadastro
               </button>
               <button 
                 onClick={confirmHatchlingRegistration}
                 className="flex-[2] py-4 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
               >
                 <Save size={18} /> Confirmar Filhotes no Plantel
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreedingManager;
