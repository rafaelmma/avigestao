import React from 'react';
import { 
  LayoutDashboard, 
  Bird as BirdIcon, 
  Heart, 
  FlaskConical, 
  Settings, 
  ChevronRight,
  ArrowRightLeft,
  DollarSign,
  CalendarCheck,
  Trophy,
  Dna,
  Zap,
  HelpCircle,
  LogOut,
  X,
  FileBadge,
  Clock
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { APP_LOGO } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logoUrl?: string;
  breederName: string;
  plan: SubscriptionPlan;
  trialEndDate?: string;
  isAdmin?: boolean;
  onLogout: () => void;
  isOpen?: boolean; 
  onClose?: () => void; 
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, logoUrl, breederName, plan, trialEndDate, isAdmin, onLogout, isOpen = true, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'birds', label: 'Plantel', icon: <BirdIcon size={20} /> },
    { id: 'sexing', label: 'Central Sexagem', icon: <Dna size={20} /> },
    { id: 'breeding', label: 'Acasalamentos', icon: <Heart size={20} /> },
    { id: 'movements', label: 'Movimentações', icon: <ArrowRightLeft size={20} /> },
    { id: 'documents', label: 'Licenças & Docs', icon: <FileBadge size={20} /> }, 
    { id: 'tasks', label: 'Agenda / Tarefas', icon: <CalendarCheck size={20} /> },
    { id: 'tournaments', label: 'Torneios / Eventos', icon: <Trophy size={20} /> },
    { id: 'meds', label: 'Medicamentos', icon: <FlaskConical size={20} /> },
    { id: 'finance', label: 'Financeiro', icon: <DollarSign size={20} />, pro: true },
    { id: 'help', label: 'Ajuda & FAQ', icon: <HelpCircle size={20} /> },
  ];

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) onClose(); 
  };

  const goToSubscriptionPlans = () => {
    try {
      localStorage.setItem('avigestao_settings_tab', 'plano');
    } catch {
      /* ignore storage errors and keep navigation */
    }
    handleNavigation('settings');
  };

  const hasTrial = !!trialEndDate && !isAdmin;
  const planLabel = isAdmin ? 'ADMIN' : hasTrial ? 'PRO (Teste)' : `Plano ${plan}`;

  let trialDaysLeft = 0;
  if (hasTrial && trialEndDate) {
    const diffTime = new Date(trialEndDate).getTime() - new Date().getTime();
    trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  }

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={onClose}
        ></div>
      )}

      <div className={`
        fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-50 shadow-2xl lg:shadow-sm transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl p-3 border border-slate-100 shadow-sm flex items-center justify-center">
                <img 
                  src={logoUrl || APP_LOGO} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${isAdmin ? 'bg-rose-500' : plan === 'Profissional' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            </div>
            <div className="overflow-hidden">
              <h1
                title={breederName || 'AviGestão'}
                className="font-black text-slate-900 text-[15px] leading-tight break-words line-clamp-2 max-w-[220px]"
              >
                {breederName || 'AviGestão'}
              </h1>
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isAdmin ? 'bg-rose-100 text-rose-700' : plan === 'Profissional' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                {planLabel}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {hasTrial && trialDaysLeft >= 0 && (
          <div className="px-4 mb-4 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1 relative z-10">
                   <Clock size={16} className="text-amber-200" />
                   <span className="text-xs font-black uppercase tracking-widest">Teste Grátis</span>
                </div>
                <p className="text-2xl font-black relative z-10">{trialDaysLeft} <span className="text-xs font-medium opacity-80">dias restantes</span></p>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
             </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-brand text-white shadow-lg shadow-brand/20'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-brand'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-brand'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                {item.pro && plan === 'Básico' && !hasTrial && !isAdmin && (
                  <Zap size={12} className="text-amber-500 fill-amber-500" />
                )}
              </div>
              {activeTab === item.id && <ChevronRight size={14} className="opacity-60" />}
            </button>
          ))}
        </nav>

        <div className="px-4 py-6 border-t border-slate-50 space-y-2">
          {(plan === 'Básico' || hasTrial) && !isAdmin && (
            <button 
              onClick={goToSubscriptionPlans}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                hasTrial 
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Zap size={16} className={hasTrial ? "fill-emerald-500 text-emerald-500" : "fill-amber-500 text-amber-500"} />
              {hasTrial ? 'Assinar Definitivo' : 'Upgrade para PRO'}
            </button>
          )}
          <button
            onClick={() => handleNavigation('settings')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
              activeTab === 'settings' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings size={20} />
            <span className="font-bold text-sm">Configurações</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-rose-500 hover:bg-rose-50"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm">Sair</span>
          </button>
          <div className="text-center pt-2">
             <span className="text-[9px] font-bold text-slate-300">{hasTrial ? 'Versão 2.0 (Trial Ativo)' : 'Versão 2.0'}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
