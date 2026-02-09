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
  Clock,
  RefreshCw,
  BarChart3,
  Trash2,
  Archive,
  Shield,
  Users,
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { APP_LOGO_ICON } from '../constants';

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
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  logoUrl,
  breederName,
  plan,
  trialEndDate,
  isAdmin,
  onLogout,
  isOpen = true,
  onClose,
  onRefresh,
  isRefreshing,
}) => {
  const menuSections = [
    {
      title: 'Visão geral',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard size={18} />,
          variant: 'main',
        },
        {
          id: 'analytics',
          label: 'Relatórios',
          icon: <BarChart3 size={16} />,
          variant: 'sub',
          pro: true,
        },
      ],
    },
    {
      title: 'Aves & Plantel',
      items: [
        { id: 'birds', label: 'Plantel', icon: <BirdIcon size={18} />, variant: 'main' },
        { id: 'birds-labels', label: 'Etiquetas', icon: <Archive size={16} />, variant: 'sub' },
        { id: 'birds-history', label: 'Histórico', icon: <Archive size={16} />, variant: 'sub' },
        { id: 'sexing', label: 'Sexagem', icon: <Dna size={16} />, variant: 'sub' },
        {
          id: 'birds-ibama',
          label: 'IBAMA Pendentes',
          icon: <FileBadge size={16} />,
          variant: 'sub',
        },
        { id: 'birds-trash', label: 'Lixeira', icon: <Trash2 size={16} />, variant: 'sub' },
      ],
    },
    {
      title: 'Gestão do Criatório',
      items: [
        { id: 'breeding', label: 'Acasalamentos', icon: <Heart size={18} /> },
        { id: 'movements', label: 'Movimentações', icon: <ArrowRightLeft size={18} /> },
        { id: 'documents', label: 'Licenças & Docs', icon: <FileBadge size={18} /> },
        { id: 'meds', label: 'Medicamentos', icon: <FlaskConical size={18} /> },
        { id: 'finance', label: 'Financeiro', icon: <DollarSign size={18} />, pro: true },
      ],
    },
    {
      title: 'Agenda',
      items: [{ id: 'tasks', label: 'Agenda & Tarefas', icon: <CalendarCheck size={18} /> }],
    },
    {
      title: 'Torneios & Eventos',
      items: [
        { id: 'tournaments', label: 'Calendário', icon: <Trophy size={18} />, variant: 'main' },
        {
          id: 'tournament-manager',
          label: 'Gerenciar Torneios',
          icon: <Trophy size={16} />,
          variant: 'sub',
        },
        {
          id: 'tournament-results',
          label: 'Resultados',
          icon: <Trophy size={16} />,
          variant: 'sub',
        },
        { id: 'statistics', label: 'Comunidade', icon: <BarChart3 size={16} />, variant: 'sub' },
      ],
    },
    {
      title: 'Suporte',
      items: [{ id: 'help', label: 'Ajuda & FAQ', icon: <HelpCircle size={18} /> }],
    },
    ...(isAdmin
      ? [
          {
            title: 'Administração',
            items: [
              {
                id: 'admin-users',
                label: 'Gerenciar Usuários',
                icon: <Users size={18} />,
                adminOnly: true,
              },
            ],
          },
        ]
      : []),
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

      <div
        className={`
        fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 shadow-xl lg:shadow-none transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}
      >
        <div className="p-6 pb-4 flex flex-col items-center justify-center border-b border-slate-200 gap-3 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-slate-300 rounded-lg p-2 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-shadow">
            <img
              src={logoUrl || APP_LOGO_ICON}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-center">
            <h1
              title={breederName || 'AviGestão'}
              className="font-bold text-slate-900 text-base leading-tight"
            >
              {breederName || 'AviGestão'}
            </h1>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                isAdmin
                  ? 'bg-red-50 text-red-700 ring-red-200'
                  : plan === 'Profissional'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-blue-200'
                  : 'bg-slate-50 text-slate-700 ring-slate-200'
              }`}
            >
              <Zap size={12} className={isAdmin ? 'text-red-600' : plan === 'Profissional' ? 'text-white' : 'text-slate-500'} />
              {planLabel}
            </span>
          </div>
        </div>

        {hasTrial && trialDaysLeft >= 0 && (
          <div className="px-4 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-blue-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                Teste
              </span>
            </div>
            <p className="text-lg font-bold text-blue-900">{trialDaysLeft} dias</p>
          </div>
        )}

        <nav
          className="flex-1 px-3 py-4 space-y-4 overflow-y-auto"
          role="navigation"
          aria-label="Menu principal"
        >
          {menuSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .filter((item: any) => {
                    if (item.id === 'tournament-manager') {
                      return plan === 'Profissional' || hasTrial || isAdmin;
                    }
                    return true;
                  })
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((item: any) => {
                    const isProFeature = item.pro && plan === 'Básico' && !hasTrial && !isAdmin;
                    const isDisabled = isProFeature;
                    const isActive = activeTab === item.id;
                    const isSub = item.variant === 'sub';

                    return (
                      <button
                        key={item.id}
                        onClick={() =>
                          isDisabled ? goToSubscriptionPlans() : handleNavigation(item.id)
                        }
                        disabled={isDisabled}
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled={isDisabled}
                        aria-label={item.label + (isProFeature ? ' (recurso PRO)' : '')}
                        className={`w-full flex items-center justify-between ${
                          isSub ? 'px-3 py-2' : 'px-3 py-2.5'
                        } rounded-lg transition-all ${
                          isDisabled
                            ? 'text-slate-300 cursor-not-allowed bg-slate-50 opacity-50'
                            : isActive
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        } ${isSub ? 'text-[12px]' : 'text-sm font-medium'}`}
                        title={isDisabled ? 'Feature disponível apenas no plano PRO' : ''}
                      >
                        <div className={`flex items-center gap-3 ${isSub ? 'pl-2' : ''}`}>
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-400">
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {isProFeature && (
                            <Zap
                              size={12}
                              className="text-amber-500 fill-amber-500 flex-shrink-0"
                            />
                          )}
                        </div>
                        {isActive && (
                          <ChevronRight size={16} className="opacity-60 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 space-y-2">
          {(plan === 'Básico' || hasTrial) && !isAdmin && (
            <button
              onClick={goToSubscriptionPlans}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all ${
                hasTrial
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Zap size={14} className="flex-shrink-0" />
              {hasTrial ? 'Upgrade PRO' : 'Upgrade PRO'}
            </button>
          )}
          <button
            onClick={() => handleNavigation('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings size={18} className="flex-shrink-0" />
            Configurações
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                size={18}
                className={`flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} className="flex-shrink-0" />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
