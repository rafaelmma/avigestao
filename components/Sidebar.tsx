import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Bird as BirdIcon,
  Heart,
  FlaskConical,
  Settings,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
  DollarSign,
  CalendarCheck,
  Trophy,
  Medal,
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
  Mail,
} from 'lucide-react';
import { BreederSettings, SubscriptionPlan } from '../types';
import { APP_LOGO_ICON } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: BreederSettings;
  updateSettings: (s: BreederSettings) => void;
  onSave?: (s: BreederSettings) => void;
  logoUrl?: string;
  breederName: string;
  plan: SubscriptionPlan;
  trialEndDate?: string;
  isAdmin?: boolean;
  adminOnly?: boolean;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  unreadInboxCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  updateSettings,
  onSave,
  logoUrl,
  breederName,
  plan,
  trialEndDate,
  isAdmin,
  adminOnly,
  onLogout,
  isOpen = true,
  onClose,
  onRefresh,
  isRefreshing,
  unreadInboxCount = 0,
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(
    settings.sidebarCollapsedSections || {},
  );

  useEffect(() => {
    setCollapsedSections(settings.sidebarCollapsedSections || {});
  }, [settings.sidebarCollapsedSections]);

  const menuSections = [
    {
      title: 'Painel Geral',
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
      title: 'Comunidade',
      items: [
        { id: 'statistics-feed', label: 'Feed da Comunidade', icon: <Users size={18} />, variant: 'main' },
          { id: 'statistics-top', label: 'Top Criadores', icon: <Medal size={16} />, variant: 'sub' },
          { id: 'statistics-recent', label: 'Aves Recentes', icon: <BirdIcon size={16} />, variant: 'sub' },
        { id: 'community-inbox', label: 'Mensagens', icon: <Mail size={16} />, variant: 'sub' },
          { id: 'public-tournaments', label: 'Torneios Públicos', icon: <Trophy size={16} />, variant: 'sub' },
          { id: 'verification', label: 'Verificar Anilha', icon: <FileBadge size={16} />, variant: 'sub' },
      ],
    },
    // Gestão de Aves: apenas para usuários que NÃO são adminOnly
    ...(adminOnly
      ? []
      : [
          {
            title: 'Gestão de Aves',
            items: [
              { id: 'birds', label: 'Meu Plantel', icon: <BirdIcon size={18} />, variant: 'main' },
              { id: 'rings', label: 'Controle de Anilhas', icon: <FileBadge size={16} />, variant: 'sub' },
              { id: 'sexing', label: 'Sexagem', icon: <Dna size={16} />, variant: 'sub' },
              { id: 'birds-history', label: 'Histórico & Arquivo', icon: <Archive size={16} />, variant: 'sub' },
              { id: 'birds-trash', label: 'Lixeira', icon: <Trash2 size={16} />, variant: 'sub' },
            ],
          },
        ]),
    // Manejo & Produtividade: apenas para usuários que NÃO são adminOnly
    ...(adminOnly
      ? []
      : [
          {
            title: 'Manejo & Produtividade',
            items: [
              { id: 'tasks', label: 'Agenda & Tarefas', icon: <CalendarCheck size={18} />, variant: 'main' },
              { id: 'breeding', label: 'Acasalamentos', icon: <Heart size={18} />, variant: 'main' },
              { id: 'meds', label: 'Medicamentos', icon: <FlaskConical size={18} />, variant: 'main' },
              { id: 'movements', label: 'Movimentações', icon: <ArrowRightLeft size={16} />, variant: 'sub' },
            ],
          },
        ]),
    // Administrativo: apenas para usuários que NÃO são adminOnly
    ...(adminOnly
      ? []
      : [
          {
            title: 'Administrativo',
            items: [
              { id: 'finance', label: 'Financeiro', icon: <DollarSign size={18} />, pro: true, variant: 'main' },
              { id: 'documents', label: 'Licenças & Docs', icon: <FileBadge size={16} />, variant: 'sub' },
            ],
          },
        ]),
    {
      title: 'Torneios',
      items: [
        { id: 'tournaments', label: 'Calendário', icon: <Trophy size={18} />, variant: 'main' },
        {
          id: 'tournament-manager',
          label: 'Gerenciar Torneios',
          icon: <Trophy size={16} />,
          variant: 'sub',
          pro: true,
        },
        {
          id: 'tournament-results',
          label: 'Resultados',
          icon: <Trophy size={16} />,
          variant: 'sub',
          pro: true,
        },
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
              {
                id: 'admin-community-moderation',
                label: 'Revisar Reports',
                icon: <Shield size={18} />,
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

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const updated = { ...prev, [title]: !prev[title] };
      const updatedSettings = {
        ...settings,
        sidebarCollapsedSections: updated,
        _autoViewPrefUpdate: true,
      };
      updateSettings(updatedSettings);
      onSave?.(updatedSettings);
      return updated;
    });
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
        fixed left-0 top-0 h-screen w-64 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col z-50 shadow-2xl lg:shadow-none transition-transform duration-500
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}
      >
        <div className="p-6 pb-6 flex flex-col items-center justify-center border-b border-slate-200 gap-4 relative bg-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="w-32 h-32 bg-white border border-slate-100 rounded-[2rem] p-1.5 flex items-center justify-center flex-shrink-0 shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105 ring-8 ring-slate-50">
            <img
              src={logoUrl || APP_LOGO_ICON}
              alt="Logo"
              className="w-full h-full object-contain"
              loading="eager"
            />
          </div>
          <div className="text-center">
            <h1
              title={breederName || 'AviGestão'}
              className="text-lg font-black text-slate-900 leading-tight tracking-[0.02em]"
            >
              {breederName || 'AviGestão'}
            </h1>
            <span
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ring-1 ring-inset shadow-sm ${
                isAdmin
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : plan === 'Profissional'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-blue-400 shadow-blue-200'
                  : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              <Zap size={11} className={isAdmin ? 'text-rose-600' : plan === 'Profissional' ? 'text-white' : 'text-slate-400'} />
              {planLabel}
            </span>
          </div>
        </div>

        {hasTrial && trialDaysLeft >= 0 && (
          <div className="px-4 py-4 border-b border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                  Teste PRO ativo
                </p>
                <p className="text-2xl font-black text-slate-900 leading-tight">
                  {trialDaysLeft} dias
                </p>
                <p className="text-[11px] text-slate-500">Aproveite todos os recursos premium.</p>
              </div>
            </div>
          </div>
        )}

        <nav
          className="flex-1 px-3 py-4 space-y-5 overflow-y-auto"
          role="navigation"
          aria-label="Menu principal"
        >
          {menuSections.map((section) => {
            const isCollapsed = collapsedSections[section.title];
            const isOpenSection = !isCollapsed;

            return (
              <div
                key={section.title}
                className="space-y-2 pb-3 border-b border-slate-200/60 last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {section.title}
                  <ChevronDown
                    size={14}
                    className={`${isOpenSection ? 'rotate-180' : ''} transition-transform`}
                  />
                </button>
                {isOpenSection && <div className="space-y-1">
                {section.items
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((item: any) => {
                    const isProFeature = item.pro && plan === 'Básico' && !hasTrial && !isAdmin;
                    const isDisabled = isProFeature;
                    // For community sub-items we keep the main activeTab as 'statistics'
                    let currentStatisticsView = undefined;
                    try {
                      currentStatisticsView = typeof localStorage !== 'undefined' ? localStorage.getItem('avigestao_statistics_view') : undefined;
                    } catch {
                      currentStatisticsView = undefined;
                    }
                    const isActive = activeTab === item.id || (activeTab === 'statistics' && currentStatisticsView === item.id);
                    const isSub = item.variant === 'sub';
                    const isAdminItem = !!item.adminOnly;

                    const handleItemClick = () => {
                      if (isDisabled) return goToSubscriptionPlans();
                      // If this is a community sub-item (statistics-*), map to the main 'statistics' route
                      if (item.id && item.id.startsWith('statistics-')) {
                        try {
                          localStorage.setItem('avigestao_statistics_view', item.id);
                        } catch {}
                        handleNavigation('statistics');
                      } else {
                        handleNavigation(item.id);
                      }
                    };

                    return (
                      <button
                        key={item.id}
                        onClick={handleItemClick}
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled={isDisabled}
                        aria-label={item.label + (isProFeature ? ' (recurso PRO)' : '')}
                        className={`w-full flex items-center justify-between rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
                          isSub ? 'px-3 py-2' : 'px-3.5 py-2.5'
                        } ${
                          isDisabled
                            ? 'text-slate-400 bg-slate-50 hover:bg-slate-50 cursor-pointer opacity-85'
                            : isActive
                            ? isAdminItem
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-900 text-white shadow-sm'
                            : isAdminItem
                            ? 'text-rose-700 hover:text-rose-800 hover:bg-rose-50'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                        } ${isSub ? 'text-[12px] font-medium' : 'text-[13px] font-semibold'}`}
                        title={isDisabled ? 'Feature disponível apenas no plano PRO' : ''}
                      >
                        <div className={`flex items-center gap-3 ${isSub ? 'pl-2' : ''}`}>
                          <span
                            className={`flex-shrink-0 w-5 h-5 flex items-center justify-center ${
                              isDisabled
                                ? 'text-slate-400'
                                : isActive
                                ? 'text-white'
                                : isAdminItem
                                ? 'text-rose-500'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.id === 'community-inbox' && unreadInboxCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                              {unreadInboxCount}
                            </span>
                          )}
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
                </div>}
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200 space-y-2">
          {(plan === 'Básico' || hasTrial) && !isAdmin && (
            <button
              onClick={goToSubscriptionPlans}
              className={`w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-[11px] uppercase tracking-wider transition-all ${
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
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
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-red-600 hover:bg-red-50"
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



