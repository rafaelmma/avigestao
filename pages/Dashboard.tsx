/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useRef, Suspense, useEffect } from 'react';
import {
  AppState,
  BreederSettings,
  WidgetSize,
  AlertPreferences,
  DashboardDensity,
} from '../types';
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
  Zap,
  Bell,
} from 'lucide-react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PublicTournamentsWidget from '../components/PublicTournamentsWidget';
const TipCarousel = React.lazy(() => import('../components/TipCarousel'));
import WizardShell from '../components/WizardShell';
import PageHeader from '../components/ui/PageHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';

interface DashboardProps {
  state: AppState;
  updateSettings: (s: BreederSettings) => void;
  onSave?: (s: BreederSettings) => void;
  navigateTo: (tab: string) => void;
  isAdmin?: boolean;
}

const ALL_WIDGETS = [
  {
    id: 'stats',
    label: 'Resumo Superior (Plantel/Financeiro/Tarefas)',
    icon: <LayoutGrid size={16} />,
  },
  { id: 'tournaments', label: 'Próximos Torneios', icon: <Trophy size={16} /> },
  { id: 'financial', label: 'Fluxo de Caixa', icon: <Wallet size={16} /> },
  { id: 'species_chart', label: 'Gráfico de Espécies', icon: <TrendingUp size={16} /> },
  { id: 'tasks', label: 'Tarefas de Manejo', icon: <ListTodo size={16} /> },
  { id: 'breeding', label: 'Histórico de Posturas', icon: <Heart size={16} /> },
  { id: 'tips', label: 'Dicas de Manejo', icon: <Clock size={16} /> },
];

const StatCard = ({
  icon,
  label,
  value,
  subValue,
  isWarning,
  isPositive,
  onClick,
  density,
}: any) => (
  <div
    onClick={onClick}
    className={`bg-white/70 rounded-[2rem] border transition-all duration-500 h-full backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] ${
      isWarning ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200/40'
    } ${
      onClick
        ? 'cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200/50 hover:-translate-y-1 active:scale-[0.98]'
        : 'shadow-sm'
    } ${
      density === 'compact' ? 'p-5' : density === 'airy' ? 'p-8' : 'p-6'
    }`}
  >
    <div className="flex items-center gap-4 mb-5">
      <div className={`p-3 rounded-2xl transition-colors duration-300 ${isWarning ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{icon}</div>
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
    </div>
    <div>
      <h4
        className={`${density === 'compact' ? 'text-2xl' : 'text-4xl'} font-black tracking-tight leading-none ${
          isWarning ? 'text-amber-700' : isPositive === false ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {value}
      </h4>
      <p className="text-[11px] font-bold text-slate-500 uppercase mt-2 tracking-widest opacity-70">
        {subValue}
      </p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({
  state,
  updateSettings,
  onSave,
  navigateTo,
  isAdmin,
}) => {
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customizerTab, setCustomizerTab] = useState<'widgets' | 'alerts'>('widgets');

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const resizeWidgetId = useRef<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartSize = useRef<WidgetSize>('medium');
  const lastResizeSettings = useRef<BreederSettings | null>(null);

  const currentLayout =
    state.settings?.dashboardLayout && state.settings.dashboardLayout.length > 0
      ? state.settings.dashboardLayout
      : ALL_WIDGETS.map((w) => w.id);

  const visibleWidgets = currentLayout.filter((id) => ALL_WIDGETS.some((w) => w.id === id));

  const alertPrefs: AlertPreferences = state.settings?.alertPreferences || {
    showSispassAlert: true,
    showCertificateAlert: true,
    showSubscriptionAlert: true,
    sispassWarningDays: 30,
    certificateWarningDays: 30,
    subscriptionWarningDays: 10,
  };

  const widgetSizes = state.settings?.widgetSizes || {};
  const widgetSizesRef = useRef(widgetSizes);
  const dashboardDensity: DashboardDensity = state.settings?.dashboardDensity || 'balanced';

  useEffect(() => {
    widgetSizesRef.current = widgetSizes;
  }, [widgetSizes]);

  const toggleWidget = (id: string) => {
    let newLayout: string[];
    if (visibleWidgets.includes(id)) {
      newLayout = visibleWidgets.filter((wId) => wId !== id);
    } else {
      newLayout = [...visibleWidgets, id];
    }
    const updatedSettings = { ...state.settings, dashboardLayout: newLayout };
    updateSettings(updatedSettings);
    onSave?.(updatedSettings);
  };

  const toggleAlert = (alertKey: keyof AlertPreferences) => {
    const updatedPrefs = { ...alertPrefs, [alertKey]: !alertPrefs[alertKey] };
    const updatedSettings = { ...state.settings, alertPreferences: updatedPrefs };
    updateSettings(updatedSettings);
    onSave?.(updatedSettings);
  };

  const setDashboardDensity = (density: DashboardDensity) => {
    const updatedSettings = { ...state.settings, dashboardDensity: density };
    updateSettings(updatedSettings);
    onSave?.(updatedSettings);
  };

  const setWidgetSize = (widgetId: string, size: WidgetSize, persist = false) => {
    const updatedSizes = { ...widgetSizesRef.current, [widgetId]: size };
    const updatedSettings = { ...state.settings, widgetSizes: updatedSizes };
    updateSettings(updatedSettings);
    lastResizeSettings.current = updatedSettings;
    if (persist) {
      onSave?.(updatedSettings);
    }
  };

  const cycleWidgetSize = (widgetId: string) => {
    const currentSize = widgetSizesRef.current[widgetId] || 'medium';
    const sizes: WidgetSize[] = ['small', 'medium', 'large'];
    const nextIndex = (sizes.indexOf(currentSize) + 1) % sizes.length;
    const newSize = sizes[nextIndex];
    setWidgetSize(widgetId, newSize, true);
  };

  const getWidgetSize = (widgetId: string): WidgetSize => {
    return widgetSizes[widgetId] || 'medium';
  };

  const getGridColSpan = (widgetId: string): string => {
    if (widgetId === 'stats') return 'lg:col-span-3';
    
    const size = getWidgetSize(widgetId);
    switch(size) {
      case 'small': return 'lg:col-span-1';
      case 'large': return 'lg:col-span-2';
      default: return 'lg:col-span-1';
    }
  };

  const handleResizeStart = (widgetId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (widgetId === 'stats') return;
    e.preventDefault();
    e.stopPropagation();
    resizeWidgetId.current = widgetId;
    resizeStartX.current = e.clientX;
    resizeStartSize.current = getWidgetSize(widgetId);
    lastResizeSettings.current = null;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeWidgetId.current) return;

      const deltaX = e.clientX - resizeStartX.current;
      const sizes: WidgetSize[] = ['small', 'medium', 'large'];
      const startIndex = sizes.indexOf(resizeStartSize.current);
      const step = Math.round(deltaX / 80);
      const nextIndex = Math.min(2, Math.max(0, startIndex + step));
      const newSize = sizes[nextIndex];
      const currentSize = widgetSizesRef.current[resizeWidgetId.current] || 'medium';

      if (newSize !== currentSize) {
        setWidgetSize(resizeWidgetId.current, newSize, false);
      }
    };

    const handleMouseUp = () => {
      if (!resizeWidgetId.current) return;
      if (lastResizeSettings.current) {
        onSave?.(lastResizeSettings.current);
      }
      resizeWidgetId.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onSave, setWidgetSize]);

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

      const updatedSettings = { ...state.settings, dashboardLayout: copyListItems };
      updateSettings(updatedSettings);
      onSave?.(updatedSettings);
    }
  };

  const totalBirds = state.birds?.length || 0;
  const activeBirds = state.birds?.filter((b) => b.status === 'Ativo').length || 0;
  const income =
    state.transactions?.filter((t) => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0) ||
    0;
  const expense =
    state.transactions?.filter((t) => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0) ||
    0;
  const balance = income - expense;
  const pendingTasks = state.tasks?.filter((t) => !t.isCompleted).length || 0;

  const upcomingTournaments = (state.tournaments || [])
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const speciesData = (state.birds || []).reduce((acc: any[], bird) => {
    const existing = acc.find((i) => i.name === bird.species);
    if (existing) existing.value += 1;
    else acc.push({ name: bird.species, value: 1 });
    return acc;
  }, []);

  const sispassRenewalDate = state.settings?.renewalDate
    ? new Date(state.settings.renewalDate)
    : new Date();
  const diffDays = Math.ceil(
    (sispassRenewalDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  const certDate = state.settings?.certificate?.expiryDate
    ? new Date(state.settings.certificate.expiryDate)
    : null;
  const certDiff = certDate
    ? Math.ceil((certDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const subEndDate = state.settings?.subscriptionEndDate
    ? new Date(state.settings.subscriptionEndDate)
    : null;
  const subDiff = subEndDate
    ? Math.ceil((subEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const cancelAtPeriodEnd = !!state.settings?.subscriptionCancelAtPeriodEnd;

  // Calcular quais alertas devem ser mostrados
  const alerts: Array<{ id: string; label: string; tab: string }> = [];

  if (alertPrefs.showSispassAlert && diffDays < (alertPrefs.sispassWarningDays || 30)) {
    alerts.push({
      id: 'sispass',
      label: `SISPASS vence em ${diffDays} dias`,
      tab: 'documents',
    });
  }

  if (
    alertPrefs.showCertificateAlert &&
    certDiff !== null &&
    certDiff < (alertPrefs.certificateWarningDays || 30)
  ) {
    alerts.push({
      id: 'certificate',
      label: `Certificado vence em ${certDiff} dias`,
      tab: 'documents',
    });
  }

  if (alertPrefs.showSubscriptionAlert) {
    const warnDays = alertPrefs.subscriptionWarningDays || 10;
    if (subDiff !== null && subDiff > 0 && subDiff <= warnDays) {
      alerts.push({
        id: cancelAtPeriodEnd ? 'subscription-cancel' : 'subscription-renew',
        label: cancelAtPeriodEnd
          ? `Plano profissional termina em ${subDiff} dias (renovacao cancelada)`
          : `âš ï¸ Assinatura PRO vence em ${subDiff} dias - Renove agora!`,
        tab: 'settings',
      });
    }
  }

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'stats':
        return (
          <div className="space-y-4">
            {alerts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold">
                <Clock size={16} className="text-amber-600" />
                {alerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={() => navigateTo(alert.tab)}
                    className="px-2 py-1 rounded-full bg-amber-100/70 hover:bg-amber-200 transition-colors text-amber-900"
                    title="Clique para resolver"
                  >
                    {alert.label}
                  </button>
                ))}
              </div>
            )}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${densityGridGap} h-full`}>
              <StatCard
                icon={<Users size={20} className="text-emerald-600" />}
                label="Plantel"
                value={totalBirds}
                subValue={`${activeBirds} ativos`}
                density={dashboardDensity}
                onClick={() => navigateTo('birds')}
              />
              <StatCard
                icon={<Wallet size={20} className="text-blue-600" />}
                label="Saldo Mensal"
                value={`R$ ${balance.toLocaleString('pt-BR')}`}
                subValue={`${income > 0 ? ((balance / income) * 100).toFixed(0) : 0}% margem`}
                isPositive={balance >= 0}
                density={dashboardDensity}
                onClick={() => navigateTo('finance')}
              />
              <StatCard
                icon={<ListTodo size={20} className="text-purple-600" />}
                label="Tarefas"
                value={pendingTasks}
                subValue="Pendentes para hoje"
                density={dashboardDensity}
                onClick={() => navigateTo('tasks')}
              />
              <StatCard
                icon={<Clock size={20} className="text-orange-500" />}
                label="SISPASS"
                value={`${diffDays}d`}
                subValue={diffDays < 30 ? 'Renovação Urgente' : 'Situação Regular'}
                isWarning={diffDays < 30}
                density={dashboardDensity}
                onClick={() => navigateTo('documents')}
              />
            </div>
          </div>
        );

      case 'tips':
        return (
          <Suspense fallback={<div />}>
            <TipCarousel category="dashboard" />
          </Suspense>
        );

      case 'tournaments':
        return (
          <PublicTournamentsWidget
            onNavigateToTournaments={() => navigateTo('tournament-manager')}
            birds={state.birds || []}
          />
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
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <DollarSign size={18} />
                  </div>
                  Fluxo de Caixa
                </h3>
                <div className="p-2 rounded-full bg-slate-50 text-slate-400">
                  <ArrowRight size={16} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg text-emerald-500 shadow-sm">
                      <TrendingUp size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">
                      Entradas
                    </span>
                  </div>
                  <span className="text-sm font-black text-emerald-700">
                    R$ {income.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white rounded-lg text-rose-500 shadow-sm">
                      <TrendingDown size={14} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-rose-700 tracking-widest">
                      Saídas
                    </span>
                  </div>
                  <span className="text-sm font-black text-rose-700">
                    R$ {expense.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                Resultado do Período
              </p>
              <div className="flex items-end gap-2">
                <p
                  className={`text-3xl font-black tracking-tight ${
                    balance >= 0 ? 'text-slate-800' : 'text-rose-500'
                  }`}
                >
                  R$ {balance.toLocaleString('pt-BR')}
                </p>
                {income > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg mb-1.5 ${
                      balance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {((balance / income) * 100).toFixed(0)}%
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
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp size={18} />
              </div>
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
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <ListTodo size={18} />
              </div>
              Últimas Tarefas
            </h3>
            <div className="space-y-3 flex-1 overflow-auto max-h-[200px] no-scrollbar">
              {state.tasks.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      t.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  ></div>
                  <span
                    className={`text-xs font-bold truncate ${
                      t.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
              {state.tasks.length === 0 && (
                <p className="text-xs text-slate-300 text-center italic mt-4">Sem tarefas</p>
              )}
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
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Heart size={18} />
              </div>
              Ninhadas Recentes
            </h3>
            <div className="space-y-3 flex-1 overflow-auto max-h-[200px] no-scrollbar">
              {state.clutches.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100"
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-rose-400 uppercase">Postura</span>
                    <span className="text-xs font-bold text-rose-800">
                      {new Date(c.layDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-white rounded-lg text-[10px] font-black text-rose-500 shadow-sm">
                    {c.eggCount} ovos
                  </div>
                </div>
              ))}
              {state.clutches.length === 0 && (
                <p className="text-xs text-slate-300 text-center italic mt-4">Sem registros</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const densitySpacing =
    dashboardDensity === 'compact'
      ? 'space-y-4'
      : dashboardDensity === 'airy'
      ? 'space-y-7'
      : 'space-y-6';
  const densityGridGap =
    dashboardDensity === 'compact' ? 'gap-4' : dashboardDensity === 'airy' ? 'gap-6' : 'gap-5';
  const densityRowSize =
    dashboardDensity === 'compact'
      ? 'auto-rows-[minmax(160px,auto)] lg:auto-rows-[minmax(200px,auto)]'
      : dashboardDensity === 'airy'
      ? 'auto-rows-[minmax(200px,auto)] lg:auto-rows-[minmax(260px,auto)]'
      : 'auto-rows-[minmax(180px,auto)] lg:auto-rows-[minmax(220px,auto)]';

  // Cálculo de dias restantes do Trial
  const trialDays = state.settings.trialEndDate
    ? Math.ceil(
        (new Date(state.settings.trialEndDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const showOnboardingTips =
    !state.settings?.onboardingDismissed && (state.birds?.length ?? 0) === 0;

  const dismissOnboardingTips = () => {
    const updatedSettings = { ...state.settings, onboardingDismissed: true };
    updateSettings(updatedSettings);
    onSave?.(updatedSettings);
  };

  return (
    <WizardShell title="Dashboard" description="Visão geral do criatório, finanças e tarefas.">
      <div
        className={`relative w-full max-w-none px-6 xl:px-10 2xl:px-16 ${densitySpacing} animate-in fade-in duration-500 pb-12 bg-slate-50`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute top-10 right-0 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        </div>
        <div className={`relative z-10 ${densitySpacing}`}>
          <section>
            <div className="rounded-[28px] border border-slate-200/70 bg-white/80 backdrop-blur p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <PageHeader
                title={<>Painel Geral</>}
                subtitle={`Bem-vindo ao centro de comando do ${
                  state.settings?.breederName || 'Seu Criatório'
                }.`}
                actions={
                  <SecondaryButton onClick={() => setShowCustomizer(true)}>
                    <Settings2 size={16} />
                    <span className="ml-2">Customizar</span>
                  </SecondaryButton>
                }
              />
              {state.settings.trialEndDate && trialDays >= 0 && !isAdmin && (
                <div className="mt-4">
                  <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 shadow-sm animate-in fade-in">
                    <Zap size={10} fill="currentColor" /> Trial: {trialDays} dias restantes
                  </span>
                </div>
              )}
            </div>
          </section>

          {showOnboardingTips && (
            <section>
              <div className="rounded-[28px] border border-emerald-200/60 bg-emerald-50/60 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-emerald-900">
                      Primeiro acesso: comece por aqui
                    </h3>
                    <p className="text-sm text-emerald-800/80 mt-1">
                      Preencha os dados principais do criatorio para personalizar seu painel.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigateTo('settings')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-800"
                    >
                      Ir para configuracoes
                    </button>
                    <button
                      onClick={dismissOnboardingTips}
                      className="px-4 py-2 rounded-xl bg-white text-emerald-800 text-xs font-black uppercase tracking-widest border border-emerald-200 hover:bg-emerald-100"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-emerald-900/80">
                  <div className="bg-white/70 border border-emerald-100 rounded-2xl p-3">
                    <p className="font-bold">Nome do criatorio</p>
                    <p className="text-emerald-700">Aparece nos relatorios e documentos.</p>
                  </div>
                  <div className="bg-white/70 border border-emerald-100 rounded-2xl p-3">
                    <p className="font-bold">SISPASS e dados legais</p>
                    <p className="text-emerald-700">Use em licencas e certificados.</p>
                  </div>
                  <div className="bg-white/70 border border-emerald-100 rounded-2xl p-3">
                    <p className="font-bold">E-mail e telefone</p>
                    <p className="text-emerald-700">Facilita suporte e comunicacao.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            {/* Alerta de Registro IBAMA Pendente */}
            {state.birds.some((b) => b.ibamaBaixaPendente) && (
              <div
                className="bg-amber-50/80 border-2 border-amber-200/80 rounded-[28px] p-6 shadow-[0_10px_30px_rgba(120,53,15,0.12)] animate-in slide-in-from-top-2 cursor-pointer hover:opacity-95 backdrop-blur"
                onClick={() => navigateTo('birds-ibama')}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateTo('birds-ibama');
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-2xl">
                    <Zap size={24} className="text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">
                      ⚠️ Registro IBAMA Pendente
                    </h3>
                    <p className="text-sm text-amber-700 font-bold mb-3">
                      {state.birds.filter((b) => b.ibamaBaixaPendente).length}{' '}
                      {state.birds.filter((b) => b.ibamaBaixaPendente).length === 1
                        ? 'ave necessita'
                        : 'aves necessitam'}{' '}
                      de registro no sistema IBAMA (óbito, fuga, doação ou transferência).
                    </p>
                    <PrimaryButton
                      onClick={(event) => {
                        event.stopPropagation();
                        navigateTo('birds-ibama');
                      }}
                    >
                      Ver Pendências
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            {/* Dynamic Grid Layout */}
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${densityGridGap} grid-flow-dense ${densityRowSize}`}
            >
              {visibleWidgets.map((widgetId, index) => (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`
                  relative group transition-all duration-300 rounded-[30px] p-1 bg-white/70 border border-slate-200/70 shadow-[0_12px_24px_rgba(15,23,42,0.08)] backdrop-blur
                  ${getGridColSpan(widgetId)}
                `}
                >
                  {/* Drag Handle (Visible on Hover) */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-move bg-slate-800 text-white p-1 rounded-md shadow-lg">
                    <GripVertical size={14} />
                  </div>

                  {/* Resize Handle (Visible on Hover) - Except for Stats */}
                  {widgetId !== 'stats' && (
                    <button
                      onMouseDown={(e) => handleResizeStart(widgetId, e)}
                      onClick={(e) => e.preventDefault()}
                      className="absolute top-1/2 right-1 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-col-resize"
                      title="Arraste para redimensionar"
                      aria-label="Arraste para redimensionar"
                    >
                      <span className="block h-12 w-1.5 rounded-full bg-slate-200 hover:bg-brand shadow-sm" />
                    </button>
                  )}

                  {/* Widget Content */}
                  <div className="h-full overflow-hidden rounded-[28px]">
                    {renderWidgetContent(widgetId)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {showCustomizer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">Personalizar Dashboard</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase mt-1">
                    Configure widgets e alertas
                  </p>
                </div>
                <button
                  onClick={() => setShowCustomizer(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-8">
                <button
                  onClick={() => setCustomizerTab('widgets')}
                  className={`px-4 py-3 font-bold text-sm transition-all relative ${
                    customizerTab === 'widgets'
                      ? 'text-brand'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <LayoutGrid size={16} className="inline mr-2" />
                  Widgets
                  {customizerTab === 'widgets' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                  )}
                </button>
                <button
                  onClick={() => setCustomizerTab('alerts')}
                  className={`px-4 py-3 font-bold text-sm transition-all relative ${
                    customizerTab === 'alerts'
                      ? 'text-brand'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Bell size={16} className="inline mr-2" />
                  Alertas
                  {customizerTab === 'alerts' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-3 overflow-y-auto flex-1">
                {customizerTab === 'widgets' ? (
                  <>
                    <p className="text-xs text-slate-500 mb-4 font-semibold">
                      Ative os módulos e arraste no painel para reordenar
                    </p>
                    {ALL_WIDGETS.map((widget) => (
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
                          <div
                            className={`p-2 rounded-xl ${
                              visibleWidgets.includes(widget.id)
                                ? 'bg-brand text-white'
                                : 'bg-slate-200'
                            }`}
                          >
                            {widget.icon}
                          </div>
                          <span className="font-bold text-sm tracking-tight">{widget.label}</span>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            visibleWidgets.includes(widget.id)
                              ? 'bg-brand border-brand text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {visibleWidgets.includes(widget.id) && <Check size={14} strokeWidth={4} />}
                        </div>
                      </button>
                    ))}
                    <div className="pt-4">
                      <p className="text-xs text-slate-500 mb-3 font-semibold">Densidade dos cards</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            { id: 'compact', label: 'Compacto' },
                            { id: 'balanced', label: 'Balanceado' },
                            { id: 'airy', label: 'Respirado' },
                          ] as Array<{ id: DashboardDensity; label: string }>
                        ).map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setDashboardDensity(option.id)}
                            className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                              dashboardDensity === option.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-4 font-semibold">
                      Escolha quais alertas mostrar no topo do dashboard
                    </p>
                    <button
                      onClick={() => toggleAlert('showSispassAlert')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                        alertPrefs.showSispassAlert
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-xl ${
                            alertPrefs.showSispassAlert
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200'
                          }`}
                        >
                          <Clock size={16} />
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-sm block">Alerta SISPASS</span>
                          <span className="text-xs opacity-70">
                            Avisa {alertPrefs.sispassWarningDays || 30} dias antes do vencimento
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          alertPrefs.showSispassAlert
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {alertPrefs.showSispassAlert && <Check size={14} strokeWidth={4} />}
                      </div>
                    </button>

                    <button
                      onClick={() => toggleAlert('showCertificateAlert')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                        alertPrefs.showCertificateAlert
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-xl ${
                            alertPrefs.showCertificateAlert
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-200'
                          }`}
                        >
                          <Clock size={16} />
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-sm block">Alerta Certificado</span>
                          <span className="text-xs opacity-70">
                            Avisa {alertPrefs.certificateWarningDays || 30} dias antes do vencimento
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          alertPrefs.showCertificateAlert
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {alertPrefs.showCertificateAlert && <Check size={14} strokeWidth={4} />}
                      </div>
                    </button>

                    <button
                      onClick={() => toggleAlert('showSubscriptionAlert')}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                        alertPrefs.showSubscriptionAlert
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-xl ${
                            alertPrefs.showSubscriptionAlert
                              ? 'bg-purple-500 text-white'
                              : 'bg-slate-200'
                          }`}
                        >
                          <Zap size={16} />
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-sm block">Alerta Assinatura</span>
                          <span className="text-xs opacity-70">
                            Avisa {alertPrefs.subscriptionWarningDays || 10} dias antes do vencimento
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          alertPrefs.showSubscriptionAlert
                            ? 'bg-purple-500 border-purple-500 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {alertPrefs.showSubscriptionAlert && <Check size={14} strokeWidth={4} />}
                      </div>
                    </button>
                  </>
                )}
              </div>

              <div className="p-8 pt-0">
                <PrimaryButton
                  onClick={() => setShowCustomizer(false)}
                  className="w-full py-4 uppercase tracking-widest"
                >
                  Confirmar
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </WizardShell>
  );
};

export default Dashboard;







