
import React, { useState, Suspense } from 'react';
import { AppState, MaintenanceTask, Bird } from '../types';
import { 
  Plus, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Calendar,
  AlertCircle,
  Clock,
  CheckSquare,
  Bird as BirdIcon,
  RefreshCcw,
  X,
  Edit,
  LayoutGrid,
  Repeat,
  Bell,
  BellRing,
  AlertTriangle
} from 'lucide-react';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));

interface TaskManagerProps {
  state: AppState;
  addTask: (t: MaintenanceTask) => void;
  updateTask: (t: MaintenanceTask) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  restoreTask?: (id: string) => void;
  permanentlyDeleteTask?: (id: string) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ state, addTask, updateTask, toggleTask, deleteTask, restoreTask, permanentlyDeleteTask }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentList, setCurrentList] = useState<'active' | 'trash'>('active');
  const [filterMode, setFilterMode] = useState<'all' | 'general' | 'specific' | 'late'>('all');
  
  // State do FormulÃ¡rio
  const [newTask, setNewTask] = useState<Partial<MaintenanceTask>>({
    priority: 'Média',
    dueDate: new Date().toISOString().split('T')[0],
    birdId: '',
    frequency: 'Única',
    remindMe: false
  });
  
  // State para controlar o tipo de alvo no modal (All vs Specific)
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');

  const listToUse = currentList === 'active' ? state.tasks : (state.deletedTasks || []);

  // Helper para verificar atraso
  const isTaskOverdue = (task: MaintenanceTask) => {
    if (task.isCompleted) return false;
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate < today;
  };

  // Filtragem
  const filteredTasks = listToUse.filter(t => {
    if (filterMode === 'all') return true;
    if (filterMode === 'general') return !t.birdId;
    if (filterMode === 'specific') return !!t.birdId;
    if (filterMode === 'late') return isTaskOverdue(t);
    return true;
  });

  const pendingTasks = filteredTasks.filter(t => !t.isCompleted).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const completedTasks = filteredTasks.filter(t => t.isCompleted).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const overdueCount = listToUse.filter(t => isTaskOverdue(t)).length;

  const handleOpenAdd = () => {
    setIsEditing(false);
    setTargetType('all');
    setNewTask({ 
      priority: 'Média', 
      dueDate: new Date().toISOString().split('T')[0], 
      birdId: '',
      frequency: 'Única',
      remindMe: false
    });
    setShowModal(true);
  };

  const handleOpenEdit = (task: MaintenanceTask) => {
    if (currentList === 'trash') return;
    setIsEditing(true);
    setTargetType(task.birdId ? 'specific' : 'all');
    setNewTask({ ...task }); 
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.title && newTask.dueDate) {
      const taskData: MaintenanceTask = {
        ...newTask as MaintenanceTask,
        // Se o alvo for 'all', limpamos o birdId
        birdId: targetType === 'all' ? undefined : newTask.birdId,
        // Mantemos ou geramos ID
        id: newTask.id || Math.random().toString(36).substr(2, 9),
        isCompleted: newTask.isCompleted || false
      };

      if (isEditing && newTask.id) {
        updateTask(taskData);
      } else {
        addTask(taskData);
      }
      
      setShowModal(false);
    }
  };
  const getNextDueDate = (task: MaintenanceTask) => {
    const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const frequency = task.frequency || 'Diária';

    if (frequency === 'Semanal') {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 7);
      return next;
    }

    if (frequency === 'Mensal') {
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth() + 1;
      const day = baseDate.getDate();
      const candidate = new Date(year, month, day);
      if (candidate.getMonth() !== month) {
        return new Date(year, month + 1, 0);
      }
      return candidate;
    }

    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    return next;
  };

  const getRepeatLabel = (frequency?: MaintenanceTask['frequency']) => {
    switch (frequency) {
      case 'Mensal':
        return 'mensal';
      case 'Semanal':
        return 'semanal';
      case 'Diária':
        return 'diária';
      case 'Única':
      default:
        return 'diária';
    }
  };

  const handleRepeatTask = (task: MaintenanceTask) => {
    const nextDate = getNextDueDate(task);

    const repeatedTask: MaintenanceTask = {
      ...task,
      id: Math.random().toString(36).substr(2, 9),
      dueDate: nextDate.toISOString().split('T')[0],
      isCompleted: false
    };

    if (!task.isCompleted) {
      toggleTask(task.id);
    }

    addTask(repeatedTask);
  };
  // FunÃ§Ãµes de Lixeira
  const handleDeleteClick = (id: string) => {
    deleteTask(id);
  };

  const handleRestoreClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (restoreTask) restoreTask(id);
  };

  const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (permanentlyDeleteTask) permanentlyDeleteTask(id);
  };

  const handleClearHistory = () => {
    if (completedTasks.length === 0) return;
    if (!window.confirm('Remover todas as tarefas do histórico?')) return;
    completedTasks.forEach(task => deleteTask(task.id));
  };

  const getBirdById = (id?: string) => state.birds.find(b => b.id === id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Agenda de Manejo</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">Organize as tarefas diárias e semanais do criatório.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 mr-2">
             <button 
               onClick={() => setCurrentList('active')} 
               className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currentList === 'active' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-400'}`}
             >
               Agenda Ativa
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
              className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] hover:opacity-90 text-white rounded-2xl shadow-lg transition-all font-black text-xs uppercase tracking-widest"
             >
              <Plus size={18} />
              Nova Tarefa
             </button>
           )}
        </div>
      </header>

      {/* Filtros RÃ¡pidos */}
      {currentList === 'active' && (
        <div className="flex flex-wrap gap-2 pb-2">
           <button 
             onClick={() => setFilterMode('all')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
           >
             Todas
           </button>
           <button 
             onClick={() => setFilterMode('general')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'general' ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
           >
             Gerais (Plantel)
           </button>
           <button 
             onClick={() => setFilterMode('specific')}
             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'specific' ? 'bg-purple-100 text-purple-700' : 'text-slate-400 hover:bg-slate-100'}`}
           >
             Individuais
           </button>
           {overdueCount > 0 && (
             <button 
               onClick={() => setFilterMode('late')}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${filterMode === 'late' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100'}`}
             >
               <AlertTriangle size={10} /> Atrasadas ({overdueCount})
             </button>
           )}
        </div>
      )}

      {/* Carrossel de Dicas de Tarefas */}
      <Suspense fallback={<div />}>
        <TipCarousel category="tasks" />
      </Suspense>

      {currentList === 'trash' && (
         <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl mb-4">
            <p className="text-rose-700 font-bold text-sm">Lixeira de Tarefas</p>
            <p className="text-rose-600 text-xs">Tarefas excluídas. Restaure se necessário ou apague definitivamente.</p>
            <p className="text-rose-600 text-xs mt-1">Itens ficam disponíveis por até 30 dias na lixeira antes de serem removidos automaticamente.</p>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Pendentes */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
               <Clock size={20} className="text-brand" />
               Pendentes
             </h3>
             <span className="px-3 py-1 bg-brand-soft text-brand text-[10px] font-black rounded-lg uppercase">{pendingTasks.length}</span>
          </div>

          <div className="space-y-3">
            {pendingTasks.length > 0 ? pendingTasks.map(t => {
              const linkedBird = getBirdById(t.birdId);
              const overdue = isTaskOverdue(t);
              const isUrgent = overdue || t.priority === 'Alta';
              
              return (
                <div 
                  key={t.id} 
                  className={`group bg-white p-5 rounded-[24px] border shadow-sm hover:shadow-md transition-all flex items-center justify-between ${
                    currentList === 'trash' ? 'opacity-80 border-rose-100' : 
                    overdue ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {currentList === 'active' ? (
                      <button 
                        onClick={() => toggleTask(t.id)}
                        className={`transition-all duration-300 hover:scale-110 ${overdue ? 'text-rose-400 hover:text-rose-600' : 'text-slate-200 hover:text-emerald-500'}`}
                        title={overdue ? "Concluir tarefa atrasada" : "Concluir tarefa"}
                      >
                        {overdue ? <AlertCircle size={24} /> : <Circle size={24} />}
                      </button>
                    ) : (
                      <span className="text-rose-300"><Trash2 size={24} /></span>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${overdue ? 'text-rose-700' : 'text-slate-700'}`}>
                          {t.title}
                        </p>
                        {/* Aviso Visual "NÃ£o Chato" */}
                        {t.remindMe && (
                          <Bell size={12} className={`${overdue ? 'text-rose-500 animate-pulse' : 'text-amber-400'} fill-current`} />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                         {overdue && (
                           <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-rose-100 text-rose-600 flex items-center gap-1">
                             Atrasado
                           </span>
                         )}

                         <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase border ${
                           t.priority === 'Alta' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                           t.priority === 'Média' ? 'bg-amber-50 text-amber-500 border-amber-100' : 
                           'bg-emerald-50 text-emerald-500 border-emerald-100'
                         }`}>
                           {t.priority}
                         </span>
                         
                         {linkedBird ? (
                           <span className="text-[8px] font-black text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                             <BirdIcon size={10} /> {linkedBird.name}
                           </span>
                         ) : (
                           <span className="text-[8px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                             <LayoutGrid size={10} /> Plantel
                           </span>
                         )}

                         <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${overdue ? 'text-rose-500' : 'text-slate-400'}`}>
                           <Calendar size={10} /> {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                         </span>

                         {t.frequency && t.frequency !== 'Única' && (
                           <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1">
                             <Repeat size={8} /> {t.frequency}
                           </span>
                         )}
                      </div>
                    </div>
                  </div>
                  
                  {currentList === 'active' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTask(t.id)}
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                        title="Concluir tarefa"
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => handleRepeatTask(t)}
                        className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all"
                        title={`Repetir tarefa ${getRepeatLabel(t.frequency)}`}
                      >
                        Repetir {getRepeatLabel(t.frequency)}
                      </button>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenEdit(t)} 
                          className="p-2 text-slate-300 hover:text-brand transition-all"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(t.id)} 
                          className="p-2 text-slate-300 hover:text-rose-500 transition-all"
                          title="Mover para Lixeira"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                       <button onClick={(e) => handleRestoreClick(e, t.id)} className="p-2 text-emerald-500 hover:text-emerald-700"><RefreshCcw size={16}/></button>
                       <button onClick={(e) => handlePermanentDelete(e, t.id)} className="p-2 text-rose-500 hover:text-rose-700"><X size={16}/></button>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="p-12 bg-emerald-50/30 border-2 border-dashed border-emerald-100 rounded-[32px] text-center">
                 <CheckCircle size={40} className="mx-auto text-emerald-200 mb-4" />
                 <p className="text-sm font-bold text-emerald-800 opacity-60">
                   {filterMode === 'late' ? 'Ufa! Nenhuma tarefa atrasada.' : `Nenhuma tarefa pendente ${currentList === 'trash' ? 'na lixeira' : ''}!`}
                 </p>
              </div>
            )}
          </div>
        </div>

        {/* ConcluÃ­das */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-black text-slate-400 text-lg flex items-center gap-3">
               <CheckSquare size={20} />
               Histórico de Manejo
             </h3>
             <div className="flex items-center gap-3">
               {currentList === 'active' && completedTasks.length > 0 ? (
                 <button
                   onClick={handleClearHistory}
                   className="px-3 py-1 text-[10px] font-black uppercase rounded-lg border border-rose-100 text-rose-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                 >
                   Limpar histórico
                 </button>
               ) : null}
               <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black rounded-lg uppercase">{completedTasks.length}</span>
             </div>
          </div>

          <div className="space-y-3">
            {completedTasks.slice(0, 8).map(t => {
              const linkedBird = getBirdById(t.birdId);
              return (
                <div 
                  key={t.id} 
                  className={`bg-white/50 p-5 rounded-[24px] border border-slate-50 flex items-center justify-between ${currentList === 'trash' ? 'opacity-80 border-rose-50' : 'opacity-60'}`}
                >
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleTask(t.id)} className="text-emerald-500 hover:text-emerald-600 transition-colors" disabled={currentList === 'trash'} title="Reabrir tarefa">
                      <CheckCircle size={24} />
                    </button>
                    <div>
                      <p className="text-sm font-bold text-slate-500 line-through italic">{t.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        {linkedBird ? (
                          <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <BirdIcon size={10} /> {linkedBird.name}
                          </p>
                        ) : (
                          <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <LayoutGrid size={10} /> Plantel Todo
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {currentList === 'active' ? (
                    <button onClick={() => handleDeleteClick(t.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-all">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                       <button onClick={(e) => handleRestoreClick(e, t.id)} className="p-2 text-emerald-500"><RefreshCcw size={16}/></button>
                       <button onClick={(e) => handlePermanentDelete(e, t.id)} className="p-2 text-rose-500"><X size={16}/></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Nova/Editar Tarefa */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                {isEditing ? 'Editar Tarefa' : 'Agendar Manejo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><Plus size={32} className="rotate-45" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-6">
              
              {/* Seletor de Alvo */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                 <button
                   type="button"
                   onClick={() => setTargetType('all')}
                   className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${targetType === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <LayoutGrid size={14} /> Todo o Plantel
                 </button>
                 <button
                   type="button"
                   onClick={() => setTargetType('specific')}
                   className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${targetType === 'specific' ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   <BirdIcon size={14} /> Ave EspecÃ­fica
                 </button>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">O que deve ser feito?</label>
                <input required type="text" placeholder="Ex: Fornecer Farinhada Especial" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-brand font-bold text-slate-700" value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>

              {/* SeleÃ§Ã£o de PÃ¡ssaro (Condicional) */}
              {targetType === 'specific' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selecione a Ave</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" 
                    value={newTask.birdId} 
                    onChange={e => setNewTask({...newTask, birdId: e.target.value})}
                  >
                    <option value="">Selecione...</option>
                    {state.birds.filter(b => b.status === 'Ativo').map(bird => (
                      <option key={bird.id} value={bird.id}>{bird.name} - {bird.ringNumber} ({bird.species})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prioridade</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">FrequÃªncia</label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newTask.frequency} onChange={e => setNewTask({...newTask, frequency: e.target.value as any})}>
                    <option value="Única">Única vez</option>
                    <option value="Diária">Diária</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
              </div>

              <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data / InÃ­cio</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>

              {/* BotÃ£o de Lembrete */}
              <div 
                className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${newTask.remindMe ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}
                onClick={() => setNewTask({ ...newTask, remindMe: !newTask.remindMe })}
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${newTask.remindMe ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                       <BellRing size={20} />
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${newTask.remindMe ? 'text-amber-800' : 'text-slate-500'}`}>Quero ser avisado</p>
                       <p className="text-[10px] text-slate-400">Destacar visualmente se atrasar</p>
                    </div>
                 </div>
                 <div className={`w-12 h-7 rounded-full p-1 transition-colors ${newTask.remindMe ? 'bg-amber-500' : 'bg-slate-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${newTask.remindMe ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
              </div>

              <button type="submit" className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition-all mt-2">
                {isEditing ? 'Salvar AlteraÃ§Ãµes' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;





