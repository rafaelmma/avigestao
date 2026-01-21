import React, { useEffect, useState } from 'react';
import {
  AppState,
  Bird,
  Pair,
  Clutch,
  Medication,
  MedicationApplication,
  BreederSettings,
  MovementRecord,
  Transaction,
  MaintenanceTask,
  TournamentEvent,
  ContinuousTreatment
} from './types';
import { INITIAL_SETTINGS, MOCK_BIRDS, MOCK_MEDS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BirdManager from './pages/BirdManager';
import BreedingManager from './pages/BreedingManager';
import MedsManager from './pages/MedsManager';
import SettingsManager from './pages/SettingsManager';
import MovementsManager from './pages/MovementsManager';
import FinanceManager from './pages/FinanceManager';
import TaskManager from './pages/TaskManager';
import TournamentCalendar from './pages/TournamentCalendar';
import HelpCenter from './pages/HelpCenter';
import DocumentsManager from './pages/DocumentsManager';
import Auth from './pages/Auth';
import { supabase, SUPABASE_MISSING } from './lib/supabase';
import { loadInitialData } from './services/dataService';
import { migrateLocalData } from './services/migrateLocalData';

const STORAGE_KEY = 'avigestao_state';
const HYDRATE_TIMEOUT_MS = 45000;

const loadCachedState = (): { state: AppState; hasCache: boolean } => {
  if (typeof localStorage === 'undefined') return { state: defaultState, hasCache: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: defaultState, hasCache: false };
    const parsed = JSON.parse(raw);
    return {
      state: {
        ...defaultState,
        ...parsed,
        settings: { ...defaultState.settings, ...(parsed.settings || {}) }
      },
      hasCache: true
    };
  } catch {
    return { state: defaultState, hasCache: false };
  }
};

const defaultState: AppState = {
  birds: MOCK_BIRDS,
  deletedBirds: [],
  pairs: [],
  deletedPairs: [],
  clutches: [],
  medications: MOCK_MEDS,
  deletedMedications: [],
  medicationCatalog: [],
  applications: [],
  deletedApplications: [],
  treatments: [],
  deletedTreatments: [],
  movements: [],
  deletedMovements: [],
  transactions: [],
  deletedTransactions: [],
  tasks: [],
  deletedTasks: [],
  tournaments: [],
  deletedTournaments: [],
  settings: INITIAL_SETTINGS
};

const normalizeTrialEndDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  return parsed.getTime() >= Date.now() ? parsed.toISOString().split('T')[0] : undefined;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [state, setState] = useState<AppState>(() => defaultState);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [hasHydratedOnce, setHasHydratedOnce] = useState(false);

  const supabaseUnavailable = SUPABASE_MISSING || !supabase;

  const persistState = (value: AppState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* ignore storage failures */
    }
  };

  // Persist state + theme colors
  useEffect(() => {
    persistState(state);
    const root = document.documentElement;
    root.style.setProperty('--primary', state.settings.primaryColor);
    root.style.setProperty('--primary-hover', state.settings.primaryColor + 'ee');
    root.style.setProperty('--primary-soft', state.settings.primaryColor + '15');
    root.style.setProperty('--accent', state.settings.accentColor);
  }, [state]);

  // Bootstrap session
  useEffect(() => {
    if (supabaseUnavailable) {
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) setAuthError(error.message);
        await handleSession(data?.session || null);
      } catch (err: any) {
        if (!mounted) return;
        setAuthError(err?.message || 'Erro ao iniciar sessão');
        setIsLoading(false);
      }
    };

    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: any, newSession: any) => {
      if (!mounted) return;
      await handleSession(newSession);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [supabaseUnavailable]);

  const handleSession = async (newSession: any) => {
    setSession(newSession);
    if (!newSession) {
      setIsAdmin(false);
      setState(defaultState);
      setHasHydratedOnce(false);
      setIsLoading(false);
      return;
    }

    // Mostra cache local se existir; se não, mantém overlay até hidratar do Supabase
    const cached = loadCachedState();
    if (cached.hasCache) {
      setState(cached.state);
      setHasHydratedOnce(true);
    } else {
      setHasHydratedOnce(false);
    }
    setIsLoading(true);
    setAuthError(null);
    const token = newSession.access_token;

    try {
      await Promise.all([checkAdmin(token), hydrateUserData(newSession)]);
    } catch (err: any) {
      console.error('Erro ao hidratar sessão:', err);
      setAuthError(err?.message || 'Não foi possível carregar seus dados');
      // mantém estado atual se houver falha para evitar piscar para default
    } finally {
      setHasHydratedOnce(true);
      setIsLoading(false);
    }
  };

  const checkAdmin = async (token: string) => {
    try {
      const res = await fetch('/api/admin/check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const json = await res.json();
      setIsAdmin(!!json?.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  };

  const hydrateUserData = async (currentSession: any) => {
    if (supabaseUnavailable || !currentSession?.user?.id) {
      setState(defaultState);
      return;
    }

    const userId = currentSession.user.id as string;

    // Migração local desativada para evitar posts desnecessários/erros no Supabase\n    try { localStorage.setItem('avigestao_migrated', 'true'); } catch { /* ignore */ }

    const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tempo esgotado ao carregar dados')), ms))
      ]);
    };

    const ensureTrial = async (settings: BreederSettings): Promise<BreederSettings> => {
      if (isAdmin) return settings;
      if (settings.plan === 'Profissional' || settings.trialEndDate) return settings;
      const trialDate = new Date();
      trialDate.setDate(trialDate.getDate() + 7);
      const trialIso = trialDate.toISOString().split('T')[0];
      const updated = { ...settings, trialEndDate: trialIso, plan: settings.plan || 'Básico' };

      try {
        if (supabase) {
          await supabase
            .from('settings')
            .upsert({ user_id: userId, plan: updated.plan, trial_end_date: trialIso } as any, { onConflict: 'user_id' });
        }
      } catch (e) {
        console.warn('Falha ao registrar trial default', e);
      }
      return updated;
    };

    try {
      console.time('hydration:loadInitialData');
      const data = await loadInitialData(userId);
      console.timeEnd('hydration:loadInitialData');
      let subscriptionEndDate = data.settings?.subscriptionEndDate;
      let subscriptionCancelAtPeriodEnd = data.settings?.subscriptionCancelAtPeriodEnd;
      let subscriptionStatus = data.settings?.subscriptionStatus;

      // Checa status da assinatura no backend e forca plano PRO se estiver ativo
      if (supabase) {
        try {
          const token = currentSession.access_token;
          console.time('hydration:subscription-status');
          const res = await fetch('/api/subscription-status', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const sub = await res.json();
            const end = sub?.currentPeriodEnd || sub?.current_period_end;
            subscriptionEndDate = end ? new Date(end).toISOString().split('T')[0] : subscriptionEndDate;
            subscriptionCancelAtPeriodEnd = sub?.cancelAtPeriodEnd ?? subscriptionCancelAtPeriodEnd;
            subscriptionStatus = sub?.status ?? subscriptionStatus;

            const isActive = !!sub?.isActive;
            const isTrialSub = !!sub?.isTrial;
            if (isActive || isTrialSub) {
              data.settings = {
                ...(data.settings || {}),
                plan: 'Profissional',
                trialEndDate: undefined
              } as BreederSettings;
            } else if (!isAdmin) {
              data.settings = {
                ...(data.settings || {}),
                plan: data.settings?.trialEndDate ? data.settings.plan : 'Básico'
              } as BreederSettings;
            }
          }
        } catch (e) {
          console.warn('Nao foi possivel verificar status da assinatura', e);
        }
      }

      // Se nao tem plano PRO nem trial, aplica trial de 7 dias e persiste
      data.settings = await ensureTrial(data.settings || defaultState.settings);

      const normalizedSettings: BreederSettings = {
        ...defaultState.settings,
        ...(data.settings || {}),
        userId,
        trialEndDate: normalizeTrialEndDate(data.settings?.trialEndDate),
        subscriptionEndDate,
        subscriptionCancelAtPeriodEnd,
        subscriptionStatus
      };
      setState({
        ...defaultState,
        ...data,
        settings: normalizedSettings
      });
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setAuthError(err?.message || 'Erro ao carregar dados');
      // mantém estado atual para evitar voltar ao perfil default
    }
  };

  const navigateTo = (tab: string) => setActiveTab(tab);

  // Birds
  const addBird = (bird: Bird) => setState(prev => ({ ...prev, birds: [...prev.birds, bird] }));
  const updateBird = (bird: Bird) => setState(prev => ({
    ...prev,
    birds: prev.birds.map(b => (b.id === bird.id ? bird : b))
  }));
  const deleteBird = (id: string) =>
    setState(prev => {
      const found = prev.birds.find(b => b.id === id);
      if (!found) return prev;
      const deleted = { ...found, deletedAt: new Date().toISOString() };
      return {
        ...prev,
        birds: prev.birds.filter(b => b.id !== id),
        deletedBirds: [...(prev.deletedBirds || []), deleted]
      };
    });
  const restoreBird = (id: string) =>
    setState(prev => {
      const found = (prev.deletedBirds || []).find(b => b.id === id);
      if (!found) return prev;
      return {
        ...prev,
        birds: [...prev.birds, { ...found, deletedAt: undefined }],
        deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id)
      };
    });
  const permanentlyDeleteBird = (id: string) =>
    setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id) }));

  // Movements
  const addMovement = (mov: MovementRecord) =>
    setState(prev => ({ ...prev, movements: [mov, ...prev.movements] }));
  const updateMovement = (mov: MovementRecord) =>
    setState(prev => ({
      ...prev,
      movements: prev.movements.map(m => (m.id === mov.id ? mov : m))
    }));
  const deleteMovement = (id: string) =>
    setState(prev => {
      const found = prev.movements.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: prev.movements.filter(m => m.id !== id),
        deletedMovements: [...(prev.deletedMovements || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreMovement = (id: string) =>
    setState(prev => {
      const found = (prev.deletedMovements || []).find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: [found, ...prev.movements],
        deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id)
      };
    });
  const permanentlyDeleteMovement = (id: string) =>
    setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id) }));

  // Pairs / Breeding
  const addPair = (pair: Pair) => setState(prev => ({ ...prev, pairs: [...prev.pairs, pair] }));
  const updatePair = (pair: Pair) =>
    setState(prev => ({
      ...prev,
      pairs: prev.pairs.map(p => (p.id === pair.id ? pair : p))
    }));
  const deletePair = (id: string) =>
    setState(prev => {
      const found = prev.pairs.find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: prev.pairs.filter(p => p.id !== id),
        deletedPairs: [...(prev.deletedPairs || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restorePair = (id: string) =>
    setState(prev => {
      const found = (prev.deletedPairs || []).find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: [...prev.pairs, { ...found, deletedAt: undefined }],
        deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id)
      };
    });
  const permanentlyDeletePair = (id: string) =>
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id) }));

  const addClutch = (clutch: Clutch) => setState(prev => ({ ...prev, clutches: [...prev.clutches, clutch] }));
  const updateClutch = (clutch: Clutch) =>
    setState(prev => ({
      ...prev,
      clutches: prev.clutches.map(c => (c.id === clutch.id ? clutch : c))
    }));

  // Medications
  const addMed = (med: Medication) => setState(prev => ({ ...prev, medications: [...prev.medications, med] }));
  const updateMed = (med: Medication) =>
    setState(prev => ({
      ...prev,
      medications: prev.medications.map(m => (m.id === med.id ? med : m))
    }));
  const deleteMed = (id: string) =>
    setState(prev => {
      const found = prev.medications.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        medications: prev.medications.filter(m => m.id !== id),
        deletedMedications: [...(prev.deletedMedications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreMed = (id: string) =>
    setState(prev => {
      const found = (prev.deletedMedications || []).find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        medications: [...prev.medications, { ...found, deletedAt: undefined }],
        deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id)
      };
    });
  const permanentlyDeleteMed = (id: string) =>
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id) }));

  const applyMed = (app: MedicationApplication) =>
    setState(prev => ({ ...prev, applications: [...prev.applications, app] }));
  const updateApplication = (app: MedicationApplication) =>
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(a => (a.id === app.id ? app : a))
    }));
  const deleteApplication = (id: string) =>
    setState(prev => {
      const found = prev.applications.find(a => a.id === id);
      if (!found) return prev;
      return {
        ...prev,
        applications: prev.applications.filter(a => a.id !== id),
        deletedApplications: [...(prev.deletedApplications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreApplication = (id: string) =>
    setState(prev => {
      const found = (prev.deletedApplications || []).find(a => a.id === id);
      if (!found) return prev;
      return {
        ...prev,
        applications: [...prev.applications, { ...found, deletedAt: undefined }],
        deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id)
      };
    });
  const permanentlyDeleteApplication = (id: string) =>
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id) }));

  const addTreatment = (t: ContinuousTreatment) =>
    setState(prev => ({ ...prev, treatments: [...prev.treatments, t] }));
  const updateTreatment = (t: ContinuousTreatment) =>
    setState(prev => ({
      ...prev,
      treatments: prev.treatments.map(item => (item.id === t.id ? t : item))
    }));
  const deleteTreatment = (id: string) =>
    setState(prev => {
      const found = prev.treatments.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        treatments: prev.treatments.filter(t => t.id !== id),
        deletedTreatments: [...(prev.deletedTreatments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTreatment = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTreatments || []).find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        treatments: [...prev.treatments, { ...found, deletedAt: undefined }],
        deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id)
      };
    });
  const permanentlyDeleteTreatment = (id: string) =>
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id) }));

  // Finance
  const addTransaction = (t: Transaction) =>
    setState(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
  const deleteTransaction = (id: string) =>
    setState(prev => {
      const found = prev.transactions.find(tx => tx.id === id);
      if (!found) return prev;
      return {
        ...prev,
        transactions: prev.transactions.filter(tx => tx.id !== id),
        deletedTransactions: [...(prev.deletedTransactions || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTransaction = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTransactions || []).find(tx => tx.id === id);
      if (!found) return prev;
      return {
        ...prev,
        transactions: [...prev.transactions, { ...found, deletedAt: undefined }],
        deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id)
      };
    });
  const permanentlyDeleteTransaction = (id: string) =>
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id) }));

  // Tasks
  const addTask = (t: MaintenanceTask) => setState(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
  const updateTask = (t: MaintenanceTask) =>
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => (task.id === t.id ? t : task))
    }));
  const toggleTask = (id: string) =>
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    }));
  const deleteTask = (id: string) =>
    setState(prev => {
      const found = prev.tasks.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id),
        deletedTasks: [...(prev.deletedTasks || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreTask = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTasks || []).find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tasks: [...prev.tasks, { ...found, deletedAt: undefined }],
        deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id)
      };
    });
  const permanentlyDeleteTask = (id: string) =>
    setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id) }));

  // Tournaments
  const addEvent = (e: TournamentEvent) =>
    setState(prev => ({ ...prev, tournaments: [...prev.tournaments, e] }));
  const updateEvent = (e: TournamentEvent) =>
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(ev => (ev.id === e.id ? e : ev))
    }));
  const deleteEvent = (id: string) =>
    setState(prev => {
      const found = prev.tournaments.find(ev => ev.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tournaments: prev.tournaments.filter(ev => ev.id !== id),
        deletedTournaments: [...(prev.deletedTournaments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  const restoreEvent = (id: string) =>
    setState(prev => {
      const found = (prev.deletedTournaments || []).find(ev => ev.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tournaments: [...prev.tournaments, { ...found, deletedAt: undefined }],
        deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id)
      };
    });
  const permanentlyDeleteEvent = (id: string) =>
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id) }));

  const updateSettings = (settings: BreederSettings) =>
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));

  const handleLogout = async () => {
    // Reseta UI imediatamente para evitar travar no logout
    setIsAdmin(false);
    setSession(null);
    setState(defaultState);
    setActiveTab('dashboard');
    setIsLoading(false);

    // dispara signOut sem bloquear a UI
    if (!supabaseUnavailable) {
      supabase.auth.signOut().catch((err: any) => {
        console.warn('Erro ao deslogar supabase', err);
      });
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('avigestao_migrated');
    } catch {
      /* ignore */
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard state={state} updateSettings={updateSettings} navigateTo={navigateTo} isAdmin={isAdmin} />;
      case 'birds':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            isAdmin={isAdmin}
          />
        );
      case 'sexing':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            initialList="sexagem"
            includeSexingTab
            showListTabs
            titleOverride="Central de Sexagem"
            isAdmin={isAdmin}
          />
        );
      case 'breeding':
        return (
          <BreedingManager
            state={state}
            addPair={addPair}
            updatePair={updatePair}
            addBird={addBird}
            addClutch={addClutch}
            updateClutch={updateClutch}
            deletePair={deletePair}
            restorePair={restorePair}
            permanentlyDeletePair={permanentlyDeletePair}
          />
        );
      case 'meds':
        return (
          <MedsManager
            state={state}
            addMed={addMed}
            updateMed={updateMed}
            applyMed={applyMed}
            deleteMed={deleteMed}
            restoreMed={restoreMed}
            permanentlyDeleteMed={permanentlyDeleteMed}
            addTreatment={addTreatment}
            updateTreatment={updateTreatment}
            deleteTreatment={deleteTreatment}
            restoreTreatment={restoreTreatment}
            permanentlyDeleteTreatment={permanentlyDeleteTreatment}
            updateApplication={updateApplication}
            deleteApplication={deleteApplication}
            restoreApplication={restoreApplication}
            permanentlyDeleteApplication={permanentlyDeleteApplication}
            isAdmin={isAdmin}
          />
        );
      case 'movements':
        return (
          <MovementsManager
            state={state}
            addMovement={addMovement}
            updateMovement={updateMovement}
            deleteMovement={deleteMovement}
            restoreMovement={restoreMovement}
            permanentlyDeleteMovement={permanentlyDeleteMovement}
          />
        );
      case 'finance':
        return (
          <FinanceManager
            state={state}
            addTransaction={addTransaction}
            deleteTransaction={deleteTransaction}
            restoreTransaction={restoreTransaction}
            permanentlyDeleteTransaction={permanentlyDeleteTransaction}
          />
        );
      case 'tasks':
        return (
          <TaskManager
            state={state}
            addTask={addTask}
            updateTask={updateTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
            restoreTask={restoreTask}
            permanentlyDeleteTask={permanentlyDeleteTask}
          />
        );
      case 'tournaments':
        return (
          <TournamentCalendar
            state={state}
            addEvent={addEvent}
            deleteEvent={deleteEvent}
            updateEvent={updateEvent}
            restoreEvent={restoreEvent}
            permanentlyDeleteEvent={permanentlyDeleteEvent}
          />
        );
      case 'documents':
        return <DocumentsManager settings={state.settings} updateSettings={updateSettings} />;
      case 'settings':
        return <SettingsManager settings={state.settings} updateSettings={updateSettings} isAdmin={isAdmin} />;
      case 'help':
        return <HelpCenter />;
      default:
        return <Dashboard state={state} updateSettings={updateSettings} navigateTo={navigateTo} isAdmin={isAdmin} />;
    }
  };

  if (!session && !supabaseUnavailable) {
    return <Auth onLogin={() => { /* sessão será tratada via supabase listener */ }} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-[var(--primary-soft)] selection:text-[var(--primary)]">
      {isLoading && !hasHydratedOnce && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm text-slate-600 text-sm font-bold">
          Carregando dados...
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logoUrl={state.settings.logoUrl}
        breederName={state.settings.breederName}
        plan={state.settings.plan}
        trialEndDate={state.settings.trialEndDate}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-bold">
            {authError}
          </div>
        )}
        {renderContent()}
      </main>

      <style>{`
        .bg-brand { background-color: var(--primary) !important; }
        .bg-brand-soft { background-color: var(--primary-soft) !important; }
        .text-brand { color: var(--primary) !important; }
        .border-brand { border-color: var(--primary) !important; }
        .ring-brand { --tw-ring-color: var(--primary) !important; }
        .hover\:bg-brand:hover { background-color: var(--primary-hover) !important; }
      `}</style>
    </div>
  );
};

export default App;









