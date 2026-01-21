
import React, { useState, useRef } from 'react';
import { AppState, BreederSettings } from '../types';
import { 
  Users, 
  Heart, 
  ListTodo,
  Bird as BirdIcon,
  Trophy,
  Settings2,
  X,
  LayoutGrid,
  Check,
  MapPin,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRight,
  Clock,
  DollarSign,
  Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TipCarousel from '../components/TipCarousel';

interface DashboardProps {
  state: AppState;
  updateSettings: (s: BreederSettings) => void;
  navigateTo: (tab: string) => void;
  isAdmin?: boolean;
}

const ALL_WIDGETS = [
  { id: 'stats', label: 'Resumo Superior (Plantel/Financeiro/Tarefas)', icon: <LayoutGrid size={16} /> },
  { id: 'tournaments', label: 'Próximos Torneios', icon: <Trophy size={16} /> },
  { id: 'financial', label: 'Fluxo de Caixa', icon: <Wallet size={16} /> },
  { id: 'species_chart', label: 'Gráfico de Espécies', icon: <TrendingUp size={16} /> },
  { id: 'tasks', label: 'Tarefas de Manejo', icon: <ListTodo size={16} /> },
  { id: 'breeding', label: 'Histórico de Posturas', icon: <Heart size={16} /> },
  { id: 'tips', label: 'Dicas de Manejo', icon: <Clock size={16} /> },
];

const StatCard = ({ icon, label, value, subValue, isWarning, isPositive, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:-translate-y-1 h-full ${isWarning ? 'bg-orange-50/30' : ''} ${onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}`}
  >
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <div>
      <h4 className={`text-2xl font-black tracking-tight ${isWarning ? 'text-orange-600' : isPositive === false ? 'text-rose-600' : 'text-slate-800'}`}>{value}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{subValue}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ state, updateSettings, navigateTo, isAdmin }) => {
  const [showCustomizer, setShowCustomizer] = useState(false);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  const currentLayout = state.settings?.dashboardLayout && state.settings.dashboardLayout.length > 0
    ? state.settings.dashboardLayout
    : ALL_WIDGETS.map(w => w.id);

  const visibleWidgets = currentLayout.filter(id => 
    ALL_WIDGETS.some(w => w.id === id)
  );

  const toggleWidget = (id: string) => {
    let newLayout: string[];
    if (visibleWidgets.includes(id)) {
      newLayout = visibleWidgets.filter(wId => wId !== id);
    } else {
      newLayout = [...visibleWidgets, id];
    }
    updateSettings({ ...state.settings, dashboardLayout: newLayout });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
    
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const copyListItems = [...visibleWidgets];
      const dragItemContent = copyListItems[dragItem.current];
      
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      
      dragItem.current = null;
      dragOverItem.current = null;
      
      updateSettings({ ...state.settings, dashboardLayout: copyListItems });
    }
  };

  const totalBirds = state.birds?.length || 0;
  const activeBirds = state.birds?.filter(b => b.status === 'Ativo').length || 0;
  const income = state.transactions?.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0) || 0;
  const expense = state.transactions?.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0) || 0;
  const balance = income - expense;
  const pendingTasks = state.tasks?.filter(t => !t.isCompleted).length || 0;

  const upcomingTournaments = (state.tournaments || [])
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const speciesData = (state.birds || []).reduce((acc: any[], bird) => {
    const existing = acc.find(i => i.name === bird.species);
    if (existing) existing.value += 1;
    else acc.push({ name: bird.species, value: 1 });
    return acc;
  }, []);

  const sispassRenewalDate = state.settings?.renewalDate ? new Date(state.settings.renewalDate) : new Date();
  const diffDays = Math.ceil((sispassRenewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const certDate = state.settings?.certificate?.expiryDate ? new Date(state.settings.certificate.expiryDate) : null;
  const certDiff = certDate ? Math.ceil((certDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const subEndDate = state.settings?.subscriptionEndDate ? new Date(state.settings.subscriptionEndDate) : null;
  const subDiff = subEndDate ? Math.ceil((subEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const cancelAtPeriodEnd = !!state.settings?.subscriptionCancelAtPeriodEnd;
  
  const renderWidgetContent = (id: string) => {
    switch(id) {
      case 'stats':
        return (
          <div className="space-y-4">
            {(diffDays < 30 || (certDiff !== null && certDiff < 30) || (cancelAtPeriodEnd && subDiff !== null)) && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-600" />
                  <span>
                    {[
                      diffDays < 30 ? `SISPASS vence em ${diffDays} dias` : null,
                      certDiff !== null && certDiff < 30 ? `Certificado vence em ${certDiff} dias` : null,
                      cancelAtPeriodEnd && subDiff !== null ? `Plano profissional termina em ${subDiff} dias (renovacao cancelada)` : null
                    ].filter(Boolean).join(' | ')}
                  </span>
                </div>
              </div>
            )}<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
            <StatCard 
              icon={<Users size={20} className="text-emerald-600" />} 
              label="Plantel" 
              value={totalBirds} 
              subValue={`${activeBirds} ativos`} 
              onClick={() => navigateTo('birds')}
            />
            <StatCard 
              icon={<Wallet size={20} className="text-blue-600" />} 
              label="Saldo Mensal" 
              value={`R$ ${balance.toLocaleString('pt-BR')}`} 
              subValue={`${income > 0 ? ((balance/income)*100).toFixed(0) : 0}% margem`}
              isPositive={balance >= 0}
              onClick={() => navigateTo('finance')}
            />
            <StatCard 
              icon={<ListTodo size={20} className="text-purple-600" />} 
              label="Tarefas" 
              value={pendingTasks} 
              subValue="Pendentes para hoje" 
              onClick={() => navigateTo('tasks')}
            />
            <StatCard 
              icon={<Clock size={20} className="text-orange-500" />} 
              label="SISPASS" 
              value={`${diffDays}d`} 
              subValue={diffDays < 30 ? "Renovação Urgente" : "Situação Regular"}
              isWarning={diffDays < 30}
              onClick={() => navigateTo('documents')}
            />
            </div>
          </div>
        );
      
      case 'tips':
        return <TipCarousel category="dashboard" />;

      case 'tournaments':
        return (
          <div 
            onClick={() => navigateTo('tournaments')}
            className="h-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
          >
            <h3 className="font-black text-slate-800 flex items-center gap-3 mb-6">
              <Trophy size={20} className="text-amber-500" />
              Eventos Próximos
            </h3>
            <div className="space-y-4 flex-1">
                {upcomingTournaments.length > 0 ? upcomingTournaments.slice(0, 3).map(event => (
                  <div key={event.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-xl border border-slate-100 text-slate-800">
                        <span className="text-[8px] font-black uppercase text-slate-400">{new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                        <span className="text-sm font-black">{new Date(event.date).getDate()}</span>
                    </div>
                    <div className="overflow-hidden">
                        <h4 className="text-xs font-black text-slate-800 truncate">{event.title}</h4>
                        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {event.location}
                        </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum evento agendado</p>
                  </div>
                )}
            </div>
          </div>
        );
      
      case 'financial':
        return (
          <div 
            onClick={() => navigateTo('finance')}
            className="h-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-emerald-100 transition-all active:scale-[0.99] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wallet size={120} className="text-emerald-500" />
            </div>

            <div>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-black text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={18} /></div>
                      Fluxo de Caixa
                    </h3>
                    <div className="p-2 rounded-full bg-slate-50 text-slate-400">
                        <ArrowRight size={16} />
                    </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg text-emerald-500 shadow-sm"><TrendingUp size={14} /></div>
                        <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Entradas</span>
                      </div>
                      <span className="text-sm font-black text-emerald-700">R$ {income.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-lg text-rose-500 shadow-sm"><TrendingDown size={14} /></div>
                        <span className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Saídas</span>
                      </div>
                      <span className="text-sm font-black text-rose-700">R$ {expense.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-50">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Resultado do Período</p>
                <div className="flex items-end gap-2">
                    <p className={`text-3xl font-black tracking-tight ${balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                        R$ {balance.toLocaleString('pt-BR')}
                    </p>
                    {income > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg mb-1.5 ${balance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {((balance/income)*100).toFixed(0)}%
                        </span>
                    )}
                </div>
            </div>
          </div>
        );

      case 'species_chart':
        return (
          <div 
            onClick={() => navigateTo('birds')}
            className="h-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
          >
            <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={18} /></div>
              Espécies
            </h3>
            <div className="flex-1 min-h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={speciesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} />
                  <YAxis fontSize={8} axisLine={false} tickLine={false} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'tasks':
        return (
          <div 
            onClick={() => navigateTo('tasks')}
            className="h-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
          >
             <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><ListTodo size={18} /></div>
              Últimas Tarefas
            </h3>
            <div className="space-y-3 flex-1 overflow-auto max-h-[200px] no-scrollbar">
              {state.tasks.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`w-2 h-2 rounded-full ${t.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <span className={`text-xs font-bold truncate ${t.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.title}</span>
                </div>
              ))}
              {state.tasks.length === 0 && <p className="text-xs text-slate-300 text-center italic mt-4">Sem tarefas</p>}
            </div>
          </div>
        );

      case 'breeding':
        return (
          <div 
            onClick={() => navigateTo('breeding')}
            className="h-full bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
          >
             <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Heart size={18} /></div>
              Ninhadas Recentes
            </h3>
            <div className="space-y-3 flex-1 overflow-auto max-h-[200px] no-scrollbar">
              {state.clutches.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-rose-400 uppercase">Postura</span>
                     <span className="text-xs font-bold text-rose-800">{new Date(c.layDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="px-2 py-1 bg-white rounded-lg text-[10px] font-black text-rose-500 shadow-sm">
                    {c.eggCount} ovos
                  </div>
                </div>
              ))}
              {state.clutches.length === 0 && <p className="text-xs text-slate-300 text-center italic mt-4">Sem registros</p>}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Cálculo de dias restantes do Trial
  const trialDays = state.settings.trialEndDate 
    ? Math.ceil((new Date(state.settings.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Painel Geral</h2>
            
            {/* BADGE DE TRIAL NO HEADER */}
            {state.settings.trialEndDate && trialDays >= 0 && !isAdmin && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm animate-in fade-in">
                <Zap size={10} fill="currentColor" /> Trial: {trialDays} dias restantes
              </span>
            )}
          </div>
          <p className="text-slate-500 font-medium">Bem-vindo ao centro de comando do {state.settings?.breederName || 'Seu Criatório'}.</p>
        </div>
        <button 
          onClick={() => setShowCustomizer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:text-brand hover:border-brand transition-all font-bold text-xs shadow-sm"
        >
          <Settings2 size={16} />
          Customizar
        </button>
      </header>

      {/* Dynamic Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleWidgets.map((widgetId, index) => (
          <div 
            key={widgetId}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`
              relative group transition-all duration-300
              ${widgetId === 'stats' ? 'lg:col-span-3' : 'lg:col-span-1'}
            `}
          >
            {/* Drag Handle (Visible on Hover) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-slate-800 text-white p-1 rounded-md shadow-lg">
              <GripVertical size={14} />
            </div>

            {/* Widget Content */}
            <div className="h-full">
               {renderWidgetContent(widgetId)}
            </div>
          </div>
        ))}
      </div>

      {showCustomizer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Personalizar Dashboard</h3>
                <p className="text-slate-400 text-xs font-bold uppercase mt-1">Ativar módulos e arraste no painel para ordenar</p>
              </div>
              <button onClick={() => setShowCustomizer(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-3">
              {ALL_WIDGETS.map(widget => (
                <button 
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    visibleWidgets.includes(widget.id) 
                      ? 'bg-brand/5 border-brand text-brand' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${visibleWidgets.includes(widget.id) ? 'bg-brand text-white' : 'bg-slate-200'}`}>
                      {widget.icon}
                    </div>
                    <span className="font-bold text-sm tracking-tight">{widget.label}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    visibleWidgets.includes(widget.id) ? 'bg-brand border-brand text-white' : 'border-slate-300'
                  }`}>
                    {visibleWidgets.includes(widget.id) && <Check size={14} strokeWidth={4} />}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-8 pt-0">
               <button 
                onClick={() => setShowCustomizer(false)}
                className="w-full py-5 bg-[#0F172A] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all"
               >
                 Confirmar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


