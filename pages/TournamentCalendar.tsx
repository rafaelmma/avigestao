
import React, { useState, Suspense, useEffect } from 'react';
import { AppState, TournamentEvent, Bird } from '../types';
import { 
  Plus, 
  Trophy, 
  MapPin, 
  Calendar, 
  Users, 
  Trash2, 
  Award,
  Edit,
  AlignLeft,
  X,
  RefreshCcw,
  CheckSquare,
  Square,
  Bird as BirdIcon,
  ListChecks,
  Medal,
  Clock,
  ArrowRight,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import BirdCertificate from '../components/BirdCertificate';
import WizardLayout, { WizardStep } from '../components/WizardLayout';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface TournamentCalendarProps {
  state: AppState;
  addEvent: (e: TournamentEvent) => void;
  deleteEvent: (id: string) => void;
  updateEvent: (e: TournamentEvent) => void;
  restoreEvent?: (id: string) => void;
  permanentlyDeleteEvent?: (id: string) => void;
}

interface SystemTournament {
  id: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  species: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
  maxParticipants: number;
  address?: string;
  city?: string;
  state?: string;
  organizer?: string;
}

const DEFAULT_CHECKLIST_ITEMS = [
  'Emitir GTR (Guia de Transporte)',
  'Cortar Unhas',
  'Banho de Sol / Banheira',
  'Higienizar Gaiola de Transporte',
  'Separar Ração / Sementes',
  'Capa da Gaiola',
  'Documentação (Relat. do Plantel)'
];

const TournamentCalendar: React.FC<TournamentCalendarProps> = ({ state, addEvent, deleteEvent, updateEvent, restoreEvent, permanentlyDeleteEvent }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [filter, setFilter] = useState<'Todos' | 'Torneio' | 'Encontro'>('Todos');
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');
  const [activeTab, setActiveTab] = useState<'dados' | 'participantes' | 'preparacao'>('dados');
  const [systemTournaments, setSystemTournaments] = useState<SystemTournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  
  // Estado para o input de novo item do checklist
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [newEvent, setNewEvent] = useState<Partial<TournamentEvent>>({
    type: 'Torneio',
    category: 'Fibra',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    participatingBirds: [],
    preparationChecklist: DEFAULT_CHECKLIST_ITEMS.map(item => ({ item, checked: false }))
  });

  // Buscar torneios do sistema
  useEffect(() => {
    const fetchSystemTournaments = async () => {
      setLoadingTournaments(true);
      try {
        const tournamentsRef = collection(db, 'tournaments');
        const q = query(
          tournamentsRef,
          where('status', 'in', ['upcoming', 'ongoing']),
          orderBy('startDate', 'asc')
        );
        const snapshot = await getDocs(q);
        const tournaments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemTournament[];
        setSystemTournaments(tournaments);
      } catch (error) {
        console.error('Erro ao buscar torneios:', error);
      } finally {
        setLoadingTournaments(false);
      }
    };

    fetchSystemTournaments();
  }, []);

  const listToUse = currentList === 'active' ? state.tournaments : (state.deletedTournaments || []);

  const upcomingEvents = listToUse
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = listToUse
    .filter(e => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeBirds = state.birds.filter(b => b.status === 'Ativo');

  const handleOpenAdd = () => {
    setIsEditing(false);
    setActiveTab('dados');
    setNewChecklistItem('');
    setNewEvent({ 
      type: 'Torneio', 
      category: 'Fibra', 
      date: new Date().toISOString().split('T')[0],
      notes: '',
      participatingBirds: [],
      preparationChecklist: DEFAULT_CHECKLIST_ITEMS.map(item => ({ item, checked: false }))
    });
    setShowModal(true);
  };

  const handleOpenEdit = (event: TournamentEvent, tab: 'dados' | 'participantes' | 'preparacao' = 'dados') => {
    if (currentList === 'trash') return; 
    setIsEditing(true);
    setActiveTab(tab);
    setNewChecklistItem('');
    
    // Garantir que checklist exista mesmo em eventos antigos
    const checklist = event.preparationChecklist && event.preparationChecklist.length > 0 
      ? event.preparationChecklist 
      : DEFAULT_CHECKLIST_ITEMS.map(item => ({ item, checked: false }));

    setNewEvent({ ...event, preparationChecklist: checklist, participatingBirds: event.participatingBirds || [] });
    setShowModal(true);
  };

  const handleOpenChecklist = (event: TournamentEvent) => {
    handleOpenEdit(event, 'preparacao');
  };

  const handleDeleteFromModal = () => {
    if (newEvent.id) {
       deleteEvent(newEvent.id);
       setShowModal(false);
    }
  };

  const handleDeleteDirect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteEvent(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restoreEvent) restoreEvent(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeleteEvent) permanentlyDeleteEvent(id);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.title && newEvent.date && newEvent.location) {
      if (isEditing && newEvent.id) {
        updateEvent(newEvent as TournamentEvent);
      } else {
        addEvent({
          ...newEvent as TournamentEvent,
          id: Math.random().toString(36).substr(2, 9)
        });
      }
      setShowModal(false);
    }
  };

  const toggleParticipant = (birdId: string) => {
    const current = newEvent.participatingBirds || [];
    if (current.includes(birdId)) {
      setNewEvent({ ...newEvent, participatingBirds: current.filter(id => id !== birdId) });
    } else {
      setNewEvent({ ...newEvent, participatingBirds: [...current, birdId] });
    }
  };

  const toggleChecklistItem = (index: number) => {
    const currentList = [...(newEvent.preparationChecklist || [])];
    currentList[index].checked = !currentList[index].checked;
    setNewEvent({ ...newEvent, preparationChecklist: currentList });
  };

  const handleAddCustomItem = () => {
    if (!newChecklistItem.trim()) return;
    const currentList = newEvent.preparationChecklist || [];
    setNewEvent({ 
      ...newEvent, 
      preparationChecklist: [...currentList, { item: newChecklistItem, checked: false }] 
    });
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const currentList = [...(newEvent.preparationChecklist || [])];
    currentList.splice(index, 1);
    setNewEvent({ ...newEvent, preparationChecklist: currentList });
  };

  // Funções Auxiliares de Renderização
  const getProgress = (checklist: { checked: boolean }[]) => {
    if (!checklist || checklist.length === 0) return 0;
    const checked = checklist.filter(i => i.checked).length;
    return Math.round((checked / checklist.length) * 100);
  };

  const getBirdName = (id: string) => activeBirds.find(b => b.id === id)?.name || 'Ave Removida';

  const eventWizardStepsBase: Array<{ id: typeof currentList; label: string }> = [
    { id: 'active', label: 'Calendário' },
    { id: 'trash', label: 'Lixeira' },
  ];

  const eventWizardSteps: WizardStep[] = eventWizardStepsBase.map(step => ({
    id: step.id,
    label: step.label,
    content: null
  }));

  const activeEventStepIndex = Math.max(0, eventWizardStepsBase.findIndex(step => step.id === currentList));

  const pageContent = (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Calendário de Eventos</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">Torneios de fibra, canto e encontros regionais.</p>
        </div>
      </header>

      

      {/* Carrossel de Dicas */}
      <Suspense fallback={<div />}>
        <TipCarousel category="tournaments" />
      </Suspense>

      {currentList === 'trash' && (
         <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
            <p className="text-rose-700 font-bold text-sm">Lixeira de Eventos</p>
            <p className="text-rose-600 text-xs">Eventos excluídos. A exclusão permanente não pode ser desfeita.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponiveis por ate 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Próximos Eventos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
              <Calendar size={20} className="text-brand" />
              {currentList === 'active' ? 'Próximos Compromissos' : 'Eventos Futuros Excluídos'}
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
               {['Todos', 'Torneio', 'Encontro'].map(f => (
                 <button 
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                 >
                   {f}
                 </button>
               ))}
            </div>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.filter(e => filter === 'Todos' || e.type === filter).map(event => {
              const daysLeft = Math.ceil((new Date(event.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const progress = getProgress(event.preparationChecklist || []);
              
              return (
                <div 
                  key={event.id} 
                  className={`group bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md hover:border-brand/30 transition-all flex flex-col md:flex-row relative overflow-hidden ${currentList === 'trash' ? 'opacity-80' : ''}`}
                >
                  {/* Countdown Badge */}
                  {daysLeft >= 0 && daysLeft <= 7 && (
                    <div className="absolute top-0 right-0 bg-brand text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-md z-10 flex items-center gap-1">
                      <Clock size={10} /> Faltam {daysLeft} dias
                    </div>
                  )}

                  {/* Área Clicável (Conteúdo) */}
                  <div 
                    onClick={() => handleOpenEdit(event)}
                    className={`flex-1 p-6 flex flex-col md:flex-row md:items-start gap-6 ${currentList === 'active' ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 rounded-3xl border border-slate-100 text-slate-800 group-hover:bg-brand group-hover:text-white transition-colors flex-shrink-0 mt-2">
                       <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1 group-hover:text-white/80">
                         {new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                       </span>
                       <span className="text-2xl font-black leading-none">{new Date(event.date).getDate()}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${event.type === 'Torneio' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            {event.type}
                          </span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">• {event.category}</span>
                       </div>
                       <h4 className="text-lg font-black text-slate-800 leading-tight group-hover:text-brand transition-colors truncate">{event.title}</h4>
                       
                       <div className="flex items-center gap-4 mt-2 mb-3">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 truncate">
                            <MapPin size={12} /> {event.location}
                          </span>
                       </div>

                       {/* Barra de Progresso de Preparação */}
                       <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1 overflow-hidden">
                          <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${progress}%` }}></div>
                       </div>
                       <p className="text-[9px] font-bold text-slate-400 text-right">{progress}% Preparado</p>

                       {/* Participantes */}
                       {event.participatingBirds && event.participatingBirds.length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-3">
                            {event.participatingBirds.map(birdId => (
                              <div key={birdId} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                <BirdIcon size={10} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-600 uppercase">{getBirdName(birdId)}</span>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Área de Ações */}
                  <div className="flex md:flex-col items-center justify-center gap-1 p-4 md:pl-0 md:pr-6 border-t md:border-t-0 md:border-l border-slate-50 bg-slate-50/30">
                     {currentList === 'active' ? (
                       <>
                         <div onClick={(e) => e.stopPropagation()}>
                         <button 
                          type="button"
                          onClick={(e) => handleDeleteDirect(e, event.id)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer"
                          title="Excluir"
                         >
                           <Trash2 size={20} />
                         </button>
                         </div>
                        <button 
                         type="button"
                         onClick={() => handleOpenChecklist(event)}
                         className="p-3 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                         title="Checklist"
                        >
                          <ListChecks size={20} />
                        </button>
                         <button 
                          type="button"
                          onClick={() => handleOpenEdit(event)}
                          className="p-3 text-slate-300 hover:text-brand hover:bg-slate-100 rounded-2xl transition-all"
                          title="Editar"
                         >
                           <Edit size={20} />
                         </button>
                       </>
                     ) : (
                       <div onClick={(e) => e.stopPropagation()} className="flex md:flex-col gap-2">
                          <button 
                            type="button"
                            onClick={(e) => handleRestoreClick(e, event.id)}
                            className="p-3 text-emerald-500 hover:bg-emerald-100 rounded-2xl transition-all"
                            title="Restaurar"
                          >
                            <RefreshCcw size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handlePermanentDelete(e, event.id)}
                            className="p-3 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all"
                            title="Apagar"
                          >
                            <X size={18} />
                          </button>
                       </div>
                     )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
                 <Calendar size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum evento {currentList === 'active' ? 'futuro agendado' : 'futuro na lixeira'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Histórico e Resultados */}
        <div className="space-y-6">
          <h3 className="font-black text-slate-400 text-lg flex items-center gap-3">
            <Award size={20} />
            {currentList === 'active' ? 'Últimos Resultados' : 'Histórico Excluído'}
          </h3>
          
          <div className="space-y-4">
             {pastEvents.length > 0 ? pastEvents.map(event => (
               <div 
                key={event.id} 
                className={`bg-white p-5 rounded-3xl border border-slate-50 flex items-center justify-between group shadow-sm hover:border-brand/30 transition-all relative ${currentList === 'trash' ? 'opacity-70' : ''}`}
               >
                  {/* Conteúdo Clicável */}
                  <div 
                    onClick={() => handleOpenEdit(event)}
                    className={`flex-1 pr-4 ${currentList === 'active' ? 'cursor-pointer' : ''}`}
                  >
                    <p className="text-[10px] font-black text-slate-300 uppercase mb-1">{new Date(event.date).toLocaleDateString('pt-BR')}</p>
                    <h5 className="text-sm font-bold text-slate-700 truncate pr-2">{event.title}</h5>
                    
                    {event.result ? (
                      <div className="mt-2 flex items-center gap-2">
                         <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 ${event.trophy ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                           <Trophy size={10} /> {event.result}
                         </span>
                         {event.score && (
                           <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                             {event.score} pts
                           </span>
                         )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 hover:text-brand uppercase mt-2 border border-slate-100 px-2 py-1 rounded-lg inline-block border-dashed">
                        + Registrar Resultado
                      </span>
                    )}
                  </div>

                  {/* Ações Separadas */}
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-50">
                    <div onClick={(e) => e.stopPropagation()}>
                        {currentList === 'active' ? (
                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={() => handleOpenChecklist(event)}
                              className="p-2 text-slate-200 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Checklist"
                            >
                              <ListChecks size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => handleDeleteDirect(e, event.id)}
                              className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                             <button 
                                type="button"
                                onClick={(e) => handleRestoreClick(e, event.id)}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl"
                                title="Restaurar"
                             >
                                <RefreshCcw size={14} />
                             </button>
                             <button 
                                type="button"
                                onClick={(e) => handlePermanentDelete(e, event.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                                title="Apagar"
                             >
                                <X size={14} />
                             </button>
                          </div>
                        )}
                    </div>
                  </div>
               </div>
             )) : (
               <p className="text-xs font-bold text-slate-300 italic text-center py-10">Histórico {currentList === 'active' ? 'vazio' : 'limpo'}</p>
             )}
          </div>
        </div>
      </div>

      {/* Torneios do Sistema (Públicos) */}
      {currentList === 'active' && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                <Trophy size={24} className="text-brand" />
                Torneios Oficiais
              </h3>
              <p className="text-slate-400 text-sm mt-1">Torneios criados por criadores PRO - participe e se inscreva!</p>
            </div>
          </div>

          {loadingTournaments ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
              <p className="text-slate-400 text-sm mt-2">Carregando torneios...</p>
            </div>
          ) : systemTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemTournaments.map((tournament) => {
                const startDate = tournament.startDate?.toDate ? tournament.startDate.toDate() : new Date(tournament.startDate);
                const endDate = tournament.endDate?.toDate ? tournament.endDate.toDate() : new Date(tournament.endDate);
                const daysUntilStart = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div 
                    key={tournament.id}
                    className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:border-brand/40 transition-all group cursor-pointer"
                    onClick={() => window.location.hash = `tournament-results?id=${tournament.id}`}
                  >
                    {/* Badge de Status */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${
                        tournament.status === 'ongoing' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tournament.status === 'ongoing' ? '● Em Andamento' : `${daysUntilStart}d para iniciar`}
                      </span>
                      <ExternalLink size={16} className="text-slate-300 group-hover:text-brand transition-colors" />
                    </div>

                    {/* Nome do Torneio */}
                    <h4 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-brand transition-colors">
                      {tournament.name}
                    </h4>

                    {/* Descrição */}
                    {tournament.description && (
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                        {tournament.description}
                      </p>
                    )}

                    {/* Informações */}
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-brand flex-shrink-0" />
                        <span>{startDate.toLocaleDateString('pt-BR')} - {endDate.toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      {tournament.city && tournament.state && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-brand flex-shrink-0" />
                          <span>{tournament.city}, {tournament.state}</span>
                        </div>
                      )}

                      {tournament.organizer && (
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-brand flex-shrink-0" />
                          <span>Org: {tournament.organizer}</span>
                        </div>
                      )}

                      {tournament.species && tournament.species.length > 0 && (
                        <div className="flex items-center gap-2">
                          <BirdIcon size={14} className="text-brand flex-shrink-0" />
                          <span className="line-clamp-1">{tournament.species.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Call to Action */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">
                          Max: {tournament.maxParticipants} participantes
                        </span>
                        <span className="text-brand font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                          Ver detalhes <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[32px]">
              <Trophy size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum torneio ativo no momento</p>
              <p className="text-xs text-slate-400 mt-2">Novos torneios serão exibidos aqui quando criados</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Novo/Editar Evento */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <h3 className="text-2xl font-black text-slate-800">
                {isEditing ? 'Detalhes do Evento' : 'Agendar Evento'}
              </h3>
              <div className="flex gap-2">
                {isEditing && (
                   <button 
                    type="button"
                    onClick={handleDeleteFromModal}
                    className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                    title="Excluir"
                   >
                     <Trash2 size={20} />
                   </button>
                )}
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2"><X size={24} /></button>
              </div>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 flex flex-col bg-[#FBFCFD] overflow-hidden">
              {/* Abas do Modal */}
              <div className="flex border-b border-slate-100 px-8 bg-white">
                 <button 
                   type="button" 
                   onClick={() => setActiveTab('dados')} 
                   className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'dados' ? 'border-brand text-brand' : 'border-transparent text-slate-400'}`}
                 >
                   Dados
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setActiveTab('participantes')} 
                   className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1 ${activeTab === 'participantes' ? 'border-brand text-brand' : 'border-transparent text-slate-400'}`}
                 >
                   Participantes
                   <span className="bg-slate-100 px-1.5 rounded-full text-[9px]">{newEvent.participatingBirds?.length || 0}</span>
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setActiveTab('preparacao')} 
                   className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-1 ${activeTab === 'preparacao' ? 'border-brand text-brand' : 'border-transparent text-slate-400'}`}
                 >
                   Checklist
                   <span className="bg-slate-100 px-1.5 rounded-full text-[9px]">{getProgress(newEvent.preparationChecklist || [])}%</span>
                 </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {/* ABA DADOS */}
                {activeTab === 'dados' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span>Título do Evento</span>
                        <div className="group relative cursor-help">
                          <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                            Nome do evento/torneio
                          </div>
                        </div>
                      </label>
                      <input required type="text" placeholder="Ex: Torneio Regional de Verão" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 shadow-sm" value={newEvent.title || ''} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo</label>
                        <select className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 shadow-sm appearance-none" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}>
                          <option value="Torneio">Torneio</option>
                          <option value="Encontro">Encontro</option>
                          <option value="Exposição">Exposição</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                        <input required type="date" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 shadow-sm" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span>Local / Clube</span>
                        <div className="group relative cursor-help">
                          <HelpCircle size={14} className="text-slate-300 hover:text-slate-400" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-3 py-2 rounded-lg whitespace-nowrap z-50">
                            Localização do evento
                          </div>
                        </div>
                      </label>
                      <input required type="text" placeholder="Ex: Clube de Ornitologia BH" className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-brand font-bold text-slate-700 shadow-sm" value={newEvent.location || ''} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Categoria</label>
                      <select className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 shadow-sm appearance-none" value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value as any})}>
                        <option value="Fibra">Fibra</option>
                        <option value="Canto">Canto</option>
                        <option value="Morfologia">Morfologia</option>
                        <option value="Social">Social / Troca de Experiência</option>
                      </select>
                    </div>
                    
                    {/* Seção de Resultados (Aparece se for edição) */}
                    {(isEditing) && (
                       <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                          <label className="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Trophy size={14} /> Resultados
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[9px] font-bold text-amber-600 uppercase mb-1">Colocação</label>
                                <input 
                                  type="text" 
                                  placeholder="Ex: 1º Lugar" 
                                  className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-400" 
                                  value={newEvent.result || ''} 
                                  onChange={e => setNewEvent({...newEvent, result: e.target.value})} 
                                />
                             </div>
                             <div>
                                <label className="block text-[9px] font-bold text-amber-600 uppercase mb-1">Pontuação / Cantos</label>
                                <input 
                                  type="number" 
                                  placeholder="Ex: 120" 
                                  className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-amber-400" 
                                  value={newEvent.score || ''} 
                                  onChange={e => setNewEvent({...newEvent, score: Number(e.target.value)})} 
                                />
                             </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2">
                             <input 
                               type="checkbox" 
                               id="hasTrophy" 
                               className="w-5 h-5 rounded border-amber-300 text-amber-500 focus:ring-amber-500"
                               checked={newEvent.trophy || false}
                               onChange={e => setNewEvent({...newEvent, trophy: e.target.checked})}
                             />
                             <label htmlFor="hasTrophy" className="text-xs font-bold text-amber-800">Conquistou Troféu</label>
                          </div>

                          {/* Botão de Certificado se for 1º lugar */}
                          {newEvent.trophy && newEvent.result?.includes('1º') && (
                            <div className="mt-6 pt-6 border-t border-amber-100">
                              <p className="text-xs text-amber-700 font-semibold mb-4">🏆 Gerar certificado digital para este campeão:</p>
                              <BirdCertificate
                                bird={activeBirds.find(b => b.id === newEvent.participatingBirds?.[0]) || activeBirds[0]}
                                event={newEvent as TournamentEvent}
                                breederName={state.settings?.breederName || 'Criador'}
                                breederLogo={state.settings?.logoUrl}
                                sispassNumber={state.settings?.sispassNumber}
                              />
                            </div>
                          )}
                       </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observações / Anotações</label>
                      <textarea 
                        placeholder="Digite aqui informações extras..." 
                        className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-medium text-slate-700 h-24 resize-none shadow-sm"
                        value={newEvent.notes || ''}
                        onChange={e => setNewEvent({...newEvent, notes: e.target.value})}
                       />
                    </div>
                  </div>
                )}

                {/* ABA PARTICIPANTES */}
                {activeTab === 'participantes' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                     <p className="text-xs text-slate-500 font-medium">Selecione quais aves você levará para este evento. Isso ajuda a gerar o histórico individual.</p>
                     
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {activeBirds.length > 0 ? activeBirds.map(bird => {
                          const isSelected = newEvent.participatingBirds?.includes(bird.id);
                          return (
                            <div 
                              key={bird.id}
                              onClick={() => toggleParticipant(bird.id)}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-brand/5 border-brand' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'}`}>
                                     <BirdIcon size={20} />
                                  </div>
                                  <div>
                                     <p className={`text-sm font-bold ${isSelected ? 'text-brand' : 'text-slate-700'}`}>{bird.name}</p>
                                     <p className="text-[10px] text-slate-400 uppercase">{bird.species} • {bird.ringNumber}</p>
                                  </div>
                               </div>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand border-brand text-white' : 'border-slate-200'}`}>
                                  {isSelected && <CheckSquare size={14} />}
                               </div>
                            </div>
                          );
                        }) : (
                          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border-dashed border-2 border-slate-200">
                             Nenhuma ave ativa no plantel.
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {/* ABA CHECKLIST */}
                {activeTab === 'preparacao' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                     <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <ListChecks size={24} className="text-blue-500" />
                        <div>
                           <p className="text-xs font-bold text-blue-800">Preparação é Tudo!</p>
                           <p className="text-[10px] text-blue-600">Marque os itens conforme for concluindo para não esquecer nada.</p>
                        </div>
                     </div>

                     {/* Adicionar Item Personalizado */}
                     <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Adicionar item personalizado..." 
                          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-brand"
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomItem())}
                        />
                        <button 
                          type="button" 
                          onClick={handleAddCustomItem}
                          className="px-4 py-3 bg-brand text-white rounded-xl shadow-md hover:opacity-90 transition-all"
                        >
                          <Plus size={20} />
                        </button>
                     </div>

                     <div className="space-y-3">
                        {newEvent.preparationChecklist?.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => toggleChecklistItem(idx)}
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${item.checked ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                          >
                             <div className="flex items-center gap-4">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                                    {item.checked && <CheckSquare size={14} />}
                                </div>
                                <span className={`text-sm font-bold ${item.checked ? 'text-emerald-700 line-through opacity-70' : 'text-slate-700'}`}>
                                  {item.item}
                                </span>
                             </div>
                             
                             <button 
                               type="button"
                               onClick={(e) => handleRemoveChecklistItem(e, idx)}
                               className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                               title="Remover item"
                             >
                               <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-white">
                <button type="submit" className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                  {isEditing ? 'Salvar Alterações' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );

  return (
    <WizardLayout
      title="Torneios & Eventos"
      steps={eventWizardSteps.map(step => ({ ...step, content: pageContent }))}
      activeStep={activeEventStepIndex}
      showSteps={false}
      showNavigation={false}
      onStepChange={(index) => setCurrentList(eventWizardStepsBase[index]?.id || 'active')}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentList(currentList === 'active' ? 'trash' : 'active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
              currentList === 'active'
                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {currentList === 'active' ? <Trash2 size={14} /> : <RefreshCcw size={14} />}
            {currentList === 'active' ? 'Ver Lixeira' : 'Voltar aos eventos'}
          </button>
          {currentList === 'active' ? (
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-md transition-all font-semibold text-sm"
            >
              <Plus size={18} />
              Novo Evento
            </button>
          ) : null}
        </div>
      }
    />
  );
};

export default TournamentCalendar;
