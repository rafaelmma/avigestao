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
  BookOpen,
} from 'lucide-react';
import { BreederSettings, SubscriptionPlan } from '../types';
import { APP_LOGO_ICON } from '../constants';
import { hasActiveProPlan } from '../lib/subscription';

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
  const [searchQuery, setSearchQuery] = useState('');

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
        { id: 'statistics', label: 'Visão Geral', icon: <BarChart3 size={16} />, variant: 'main' },
        { id: 'top-breeders', label: 'Top Criadores', icon: <Medal size={16} />, variant: 'sub' },
        { id: 'recent-birds', label: 'Aves Recentes', icon: <BirdIcon size={16} />, variant: 'sub' },
        { id: 'community-inbox', label: 'Mensagens', icon: <Mail size={16} />, variant: 'sub' },
        { id: 'verification', label: 'Verificar Anilha', icon: <FileBadge size={16} />, variant: 'sub' },
        { id: 'library', label: 'Central de Biblioteca', icon: <BookOpen size={16} />, variant: 'sub' },
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
              { id: 'documents', label: 'Licenças & Docs', icon: <FileBadge size={16} />, variant: 'sub', pro: true },
            ],
          },
        ]),
    {
      title: 'Torneios',
      items: [
        { id: 'public-tournaments', label: 'Torneios Públicos', icon: <Trophy size={18} />, variant: 'main' },
        { id: 'tournaments', label: 'Meu Calendário', icon: <CalendarCheck size={16} />, variant: 'sub' },
        {
          id: 'tournament-manager',
          label: 'Criar Torneios',
          icon: <Zap size={16} />,
          variant: 'sub',
          pro: true,
        },
        {
          id: 'tournament-results',
          label: 'Resultados',
          icon: <Medal size={16} />,
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

  // Verifica se tem trial ativo (ainda não expirou)
  const trialEndTime = trialEndDate ? new Date(trialEndDate).getTime() : 0;
  const now = new Date().getTime();
  const hasActiveTrial = !!trialEndDate && trialEndTime > now && !isAdmin;
  const trialDaysLeft = hasActiveTrial ? Math.ceil((trialEndTime - now) / (1000 * 60 * 60 * 24)) : 0;
  
  // Verifica se tem acesso Pro (plano Profissional ou trial ativo)
  const hasProAccess = hasActiveProPlan(settings) || isAdmin;
  
  // Label do plano
  const planLabel = isAdmin 
    ? 'ADMIN' 
    : hasActiveTrial 
    ? `PRO (Trial ${trialDaysLeft}d)` 
    : `Plano ${plan}`;

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
              className="w-full h-full object-contain max-h-32 max-w-32"
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
                  : hasActiveTrial
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white ring-emerald-400 shadow-emerald-200'
                  : plan === 'Profissional'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-blue-400 shadow-blue-200'
                  : 'bg-white text-slate-600 ring-slate-200'
              }`}
            >
              <Zap size={11} className={isAdmin ? 'text-rose-600' : (hasActiveTrial || plan === 'Profissional') ? 'text-white' : 'text-slate-400'} />
              {planLabel}
            </span>
          </div>
          <button
            onClick={() => handleNavigation('settings')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Acessar Configurações
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {menuSections.map((section) => (
            <div key={section.title} className="mb-4">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md"
              >
                <span className="font-bold text-sm">{section.title}</span>
                {collapsedSections[section.title] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {!collapsedSections[section.title] && (
                <ul className="mt-2 space-y-1">
                  {section.items.map((item: any) => {
                    const isPro = item.pro;
                    const showProBadge = isPro && !hasProAccess;
                    const isInbox = item.id === 'community-inbox';
                    const hasUnread = isInbox && unreadInboxCount > 0;

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            if (isPro && !hasProAccess) {
                              goToSubscriptionPlans();
                            } else {
                              handleNavigation(item.id);
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors relative ${
                            activeTab === item.id
                              ? 'bg-blue-100 text-blue-700 font-bold'
                              : showProBadge
                              ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {item.icon}
                          <span className="flex-1 text-left">{item.label}</span>
                          
                          {/* Badge PRO */}
                          {showProBadge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-sm">
                              <Zap size={9} fill="currentColor" />
                              PRO
                            </span>
                          )}
                          
                          {/* Badge de mensagens não lidas */}
                          {hasUnread && (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full">
                              {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;



