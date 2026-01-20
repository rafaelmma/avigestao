import React, { useState, useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AppState, Bird, Pair, Clutch, Medication, MedicationApplication, BreederSettings, MovementRecord, Transaction, MaintenanceTask, TournamentEvent, ContinuousTreatment } from './types';
import { MOCK_BIRDS, MOCK_MEDS, INITIAL_SETTINGS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import BirdManager from './pages/BirdManager';
import BreedingManager from './pages/BreedingManager';
import MedsManager from './pages/MedsManager';
import SettingsManager from './pages/SettingsManager';
import DocumentsManager from './pages/DocumentsManager';
import MovementsManager from './pages/MovementsManager';
import FinanceManager from './pages/FinanceManager';
import TaskManager from './pages/TaskManager';
import TournamentCalendar from './pages/TournamentCalendar';
import HelpCenter from './pages/HelpCenter';
import Auth from './pages/Auth';
import { DollarSign, Zap, AlertTriangle, Menu } from 'lucide-react';
import { supabase, SUPABASE_MISSING } from './supabaseClient';
import { subscribeTable } from './realtime';
import { migrateLocalData } from './services/migrateLocalData';
import { loadInitialData, mapApplicationFromDb, mapBirdFromDb, mapClutchFromDb, mapMedicationFromDb, mapMovementFromDb, mapPairFromDb, mapTaskFromDb, mapTournamentFromDb, mapTransactionFromDb, mapTreatmentFromDb } from './services/dataService';
import { insertRow, updateRow, deleteRow } from './services/writeService';

const App: React.FC = () => {
  if (SUPABASE_MISSING) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-red-50 text-red-900">
        <div className="max-w-2xl bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2">ConfiguraÃ§Ã£o do Supabase ausente</h2>
          <p className="mb-4">As variÃ¡veis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nÃ£o foram definidas no build. A aplicaÃ§Ã£o precisa delas para inicializar o Supabase.</p>
          <p className="text-sm mb-4">No Vercel: Project â†’ Settings â†’ Environment Variables. Defina as chaves para o ambiente de Production/Preview e redeploy.</p>
          <p className="text-sm">Para testar localmente, crie um arquivo .env com as variÃ¡veis e rode npm run build novamente.</p>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); 
  
  const [state, setState] = useState<AppState>(() => ({
    birds: MOCK_BIRDS, deletedBirds: [],
    pairs: [], deletedPairs: [],
    clutches: [],
    medications: MOCK_MEDS, deletedMedications: [],
    medicationCatalog: [],
    applications: [], deletedApplications: [],
    treatments: [], deletedTreatments: [],
    movements: [], deletedMovements: [],
    transactions: [], deletedTransactions: [],
    tasks: [], deletedTasks: [],
    tournaments: [], deletedTournaments: [],
    settings: INITIAL_SETTINGS
  }));
  const tournamentSchemaMode = useRef<'full' | 'minimal'>('full');

  const TRASH_RETENTION_DAYS = 30;
  const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const createUuid = () =>
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }));

  const splitDeletedItems = <T extends { id: string; deletedAt?: string }>(items: T[]) => {
    const active: T[] = [];
    const deleted: T[] = [];
    const expired: T[] = [];
    const now = Date.now();

    items.forEach((item) => {
      if (!item.deletedAt) {
        active.push(item);
        return;
      }
      const ts = Date.parse(item.deletedAt);
      if (!Number.isNaN(ts) && now - ts > TRASH_RETENTION_MS) {
        expired.push(item);
        return;
      }
      deleted.push(item);
    });

    return { active, deleted, expired };
  };

  const buildStateFromData = (data: any, prev: AppState) => {
    const birdsSplit = splitDeletedItems(data.birds || []);
    const movementsSplit = splitDeletedItems(data.movements || []);
    const transactionsSplit = splitDeletedItems(data.transactions || []);
    const tasksSplit = splitDeletedItems(data.tasks || []);
    const tournamentsSplit = splitDeletedItems(data.tournaments || []);
    const medicationsSplit = splitDeletedItems(data.medications || []);
    const pairsSplit = splitDeletedItems(data.pairs || []);
    const applicationsSplit = splitDeletedItems(data.applications || []);
    const treatmentsSplit = splitDeletedItems(data.treatments || []);
    const hasMedications = Array.isArray(data.medications) && data.medications.length > 0;
    const medicationCatalog = Array.isArray(data.medicationCatalog) ? data.medicationCatalog : prev.medicationCatalog;

    const nextState: AppState = {
      ...prev,
      birds: birdsSplit.active,
      deletedBirds: birdsSplit.deleted,
      movements: movementsSplit.active,
      deletedMovements: movementsSplit.deleted,
      transactions: transactionsSplit.active,
      deletedTransactions: transactionsSplit.deleted,
      tasks: tasksSplit.active,
      deletedTasks: tasksSplit.deleted,
      tournaments: tournamentsSplit.active,
      deletedTournaments: tournamentsSplit.deleted,
      medications: hasMedications ? medicationsSplit.active : prev.medications,
      deletedMedications: hasMedications ? medicationsSplit.deleted : (prev.deletedMedications || []),
      medicationCatalog,
      pairs: pairsSplit.active,
      deletedPairs: pairsSplit.deleted,
      clutches: data.clutches || [],
      applications: applicationsSplit.active,
      deletedApplications: applicationsSplit.deleted,
      treatments: treatmentsSplit.active,
      deletedTreatments: treatmentsSplit.deleted,
      settings: data.settings || prev.settings,
    };

    return {
      nextState,
      expiredByTable: {
        birds: birdsSplit.expired,
        movements: movementsSplit.expired,
        transactions: transactionsSplit.expired,
        tasks: tasksSplit.expired,
        tournaments: tournamentsSplit.expired,
        medications: medicationsSplit.expired,
        pairs: pairsSplit.expired,
        applications: applicationsSplit.expired,
        treatments: treatmentsSplit.expired,
      },
    };
  };

  const runTrashCleanup = async (expiredByTable: Record<string, { id: string }[]>) => {
    const entries = Object.entries(expiredByTable).filter(([, items]) => items.length > 0);
    if (entries.length === 0) return;
    try {
      await Promise.all(entries.map(([table, items]) => Promise.all(items.map(item => deleteRow(table, item.id)))));
    } catch (err) {
      console.error('Erro ao limpar itens expirados da lixeira:', err);
    }
  };

  // --- MIGRAÃ‡ÃƒO DE DADOS AUTOMÃTICA ---
  // Se o usuÃ¡rio Ã© antigo e nÃ£o tem trialEndDate, define automaticamente para ele ver a mudanÃ§a.
  useEffect(() => {
    // Auto-activate a short trial for legacy users (only if not admin).
    if (isAdmin) return;
    if (
      state.settings.plan === 'Básico' &&
      !state.settings.trialEndDate &&
      userId
    ) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      // Keep plan as 'Básico' but set a trialEndDate so UI can show trial while
      // still allowing the user to upgrade immediately.
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          trialEndDate: trialEnd.toISOString()
        }
      }));
      console.log('MigraÃ§Ã£o V2.0: Trial ativado automaticamente para usuÃ¡rio existente.');
    }
  }, [isAdmin, userId, state.settings.plan, state.settings.trialEndDate]);

  // Check for Trial Expiration on Mount
  useEffect(() => {
    if (state.settings.plan === 'Profissional' && state.settings.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(state.settings.trialEndDate);
      
      if (now > trialEnd) {
        // Trial Expired - Downgrade to Basic
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: 'Básico',
            trialEndDate: undefined // Clear trial date
          }
        }));
        console.log("PerÃ­odo de teste expirado. Plano alterado para Básico.");
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }: { data: { session: Session | null } }) => {
      if (data.session) {
        setIsAuthenticated(true);
        setUserId(data.session.user.id);

        // Check admin status server-side
        try {
          const token = data.session.access_token;
          const res = await fetch('/api/admin/check', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const js = await res.json();
            setIsAdmin(!!js.isAdmin);
          }
        } catch (e) {
          console.error('Failed to verify admin status', e);
        }
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      if (session) {
        setIsAuthenticated(true);
        setUserId(session.user.id);

        try {
          const token = session.access_token;
          const res = await fetch('/api/admin/check', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const js = await res.json();
            setIsAdmin(!!js.isAdmin);
          }
        } catch (e) {
          console.error('Failed to verify admin status', e);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserId(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  
  // Sync subscription status (callable from effects)
  const syncSubscriptionStatus = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.status) return;

      if (data.isActive) {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: "Profissional",
            trialEndDate: data.isTrial ? data.current_period_end : undefined,
          },
        }));
        return;
      }

      // Cancelado ou expirado
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          plan: "Básico",
          trialEndDate: undefined,
        },
      }));
    } catch (err) {
      console.error("Erro ao sincronizar assinatura:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    syncSubscriptionStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (tournamentSchemaMode.current === 'minimal') return;
    let cancelled = false;

    (async () => {
      const { error } = await supabase
        .from('tournaments')
        .select('preparation_checklist')
        .limit(1);
      if (!cancelled && error && isSchemaCacheMissingColumn(error)) {
        tournamentSchemaMode.current = 'minimal';
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const mapRowByTable = (table: string, row: any) => {
    if (!row) return row;
    switch (table) {
      case 'birds':
        return mapBirdFromDb(row);
      case 'movements':
        return mapMovementFromDb(row);
      case 'transactions':
        return mapTransactionFromDb(row);
      case 'tasks':
        return mapTaskFromDb(row);
      case 'tournaments':
        return mapTournamentFromDb(row);
      case 'medications':
        return mapMedicationFromDb(row);
      case 'pairs':
        return mapPairFromDb(row);
      case 'clutches':
        return mapClutchFromDb(row);
      case 'applications':
        return mapApplicationFromDb(row);
      case 'treatments':
        return mapTreatmentFromDb(row);
      default:
        return row;
    }
  };

  // Poll subscription status every 30s as a fallback when Realtime on `subscriptions` is not available
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      syncSubscriptionStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);
  
  // ðŸ” Retorno do Stripe (success / canceled)
useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  if (params.get('canceled') === 'true') {
    setActiveTab('settings');
    console.info('Pagamento cancelado pelo usuÃ¡rio');
    window.history.replaceState({}, '', window.location.pathname);
  }

  if (params.get('success') === 'true') {
    setActiveTab('settings');
    console.info('Pagamento realizado com sucesso');
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);

useEffect(() => {
  if (!isAuthenticated) return;

  if (!userId) return;

  const subs: any[] = [];

  const tables = ['birds', 'movements', 'transactions', 'tasks', 'tournaments', 'medications', 'pairs', 'clutches', 'applications', 'treatments'];
  const deletedKeyMap: Record<string, keyof AppState> = {
    birds: 'deletedBirds',
    movements: 'deletedMovements',
    transactions: 'deletedTransactions',
    tasks: 'deletedTasks',
    tournaments: 'deletedTournaments',
    medications: 'deletedMedications',
    pairs: 'deletedPairs',
    applications: 'deletedApplications',
    treatments: 'deletedTreatments',
  };

  tables.forEach(table => {
    const ch = subscribeTable(table, userId, (payload: any) => {
      setState(prev => {
        const data = payload.new;
        const mapped = mapRowByTable(table, data);
        const deletedKey = deletedKeyMap[table];
        const list = (prev as any)[table] || [];
        const deletedList = deletedKey ? ((prev as any)[deletedKey] || []) : [];

        switch (payload.eventType) {
          case 'INSERT': {
            if (mapped?.deletedAt && deletedKey) {
              if (deletedList.some((r: any) => r.id === mapped.id)) return prev;
              return { ...prev, [deletedKey]: [...deletedList, mapped] };
            }
            if (list.some((r: any) => r.id === mapped.id)) return prev;
            return { ...prev, [table]: [...list, mapped] };
          }
          case 'UPDATE': {
            if (mapped?.deletedAt && deletedKey) {
              const nextActive = list.filter((r: any) => r.id !== mapped.id);
              const nextDeleted = deletedList.some((r: any) => r.id === mapped.id)
                ? deletedList.map((r: any) => r.id === mapped.id ? mapped : r)
                : [...deletedList, mapped];
              return { ...prev, [table]: nextActive, [deletedKey]: nextDeleted };
            }

            const nextActive = list.some((r: any) => r.id === mapped.id)
              ? list.map((r: any) => r.id === mapped.id ? mapped : r)
              : [...list, mapped];
            if (!deletedKey) {
              return { ...prev, [table]: nextActive };
            }
            const nextDeleted = deletedList.filter((r: any) => r.id !== mapped.id);
            return { ...prev, [table]: nextActive, [deletedKey]: nextDeleted };
          }
          case 'DELETE': {
            const nextActive = list.filter((r: any) => r.id !== payload.old.id);
            if (!deletedKey) {
              return { ...prev, [table]: nextActive };
            }
            const nextDeleted = deletedList.filter((r: any) => r.id !== payload.old.id);
            return { ...prev, [table]: nextActive, [deletedKey]: nextDeleted };
          }
          default:
            return prev;
        }
      });
    });

    subs.push(ch);
  });

  return () => subs.forEach(s => supabase.removeChannel(s));
}, [isAuthenticated, userId]);


  useEffect(() => {
    try {
      // Persist only lightweight UI theme cache to localStorage.
      localStorage.setItem("avigestao_theme", JSON.stringify({
        primaryColor: state.settings.primaryColor,
        accentColor: state.settings.accentColor,
      }));

      const root = document.documentElement;
      if (state.settings) {
        const pColor = state.settings.primaryColor || '#10B981';
        root.style.setProperty('--primary', pColor);
        root.style.setProperty('--primary-hover', pColor + 'ee');
        root.style.setProperty('--primary-soft', pColor + '15');
        root.style.setProperty('--accent', state.settings.accentColor || '#F59E0B');
      }
    } catch (e) {
      console.error("Erro ao salvar dados", e);
      setError("Erro ao salvar dados. Verifique o armazenamento do navegador.");
    }
  }, [state]);

  // Bootstrap data from Supabase after authentication
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!userId) return;

    const bootstrap = async () => {
      try {
        const data = await loadInitialData(userId);
        let expiredByTable: Record<string, { id: string }[]> | null = null;
        setState(prev => {
          const built = buildStateFromData(data, prev);
          expiredByTable = built.expiredByTable;
          return built.nextState;
        });
        if (expiredByTable) {
          void runTrashCleanup(expiredByTable);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
        setError("Falha ao carregar dados do servidor.");
      }
    };

    bootstrap();
  }, [isAuthenticated, userId]);

  // Realtime listener for subscription status to auto-update plan
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!userId) return;

    const channel = subscribeTable('subscriptions', userId, (payload: any) => {
      const sub = payload.new;

      if (!sub) return;

      if (sub.status === 'active' || sub.status === 'trialing') {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: 'Profissional',
            trialEndDate: sub.current_period_end,
          },
        }));
      } else {
        setState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            plan: 'Básico',
            trialEndDate: undefined,
          },
        }));
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId]);

  const handleLogin = async (newSettings?: Partial<BreederSettings>) => {
  let baseSettings: BreederSettings | null = null;

  if (newSettings?.userId) {
    setUserId(newSettings.userId);
    try {
      await migrateLocalData(newSettings.userId);
    } catch (err) {
      console.error('Erro na migraÇõÇœo de dados locais:', err);
    }
    try {
      const remoteData = await loadInitialData(newSettings.userId);
      baseSettings = remoteData.settings || null;
      let expiredByTable: Record<string, { id: string }[]> | null = null;
      setState(prev => {
        const built = buildStateFromData(remoteData, prev);
        expiredByTable = built.expiredByTable;
        return built.nextState;
      });
      if (expiredByTable) {
        void runTrashCleanup(expiredByTable);
      }
    } catch (err) {
      console.error('Erro ao carregar dados remotos:', err);
    }
  }

  setIsAuthenticated(true);

  if (newSettings) {
    const merged = { ...(baseSettings || state.settings), ...newSettings };
    updateSettings(merged);
  }
};

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error', err);
    }
    setUserId(null);
    setIsAuthenticated(false);
  };

  const updateSettings = (settings: BreederSettings) => {
    setState(prev => ({ ...prev, settings }));

    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const dbRow = mapSettingsToDb(settings, uid);
      const { error } = await supabase.from('settings').upsert(dbRow, { onConflict: 'user_id' });
      if (error) {
        console.error('Erro ao salvar configuracoes:', error);
        setError('Falha ao salvar configuracoes. Verifique sua conexao.');
      }
    })();
  };

  const getUserId = async () => {
    if (userId) return userId;
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id ?? null;
    if (id) setUserId(id);
    return id;
  };

  const mapBirdToDb = (bird: Bird, uid: string) => ({
    id: bird.id,
    user_id: uid,
    name: bird.name,
    ring: bird.ringNumber,
    species: bird.species,
    sex: bird.sex,
    status: bird.status,
    created_at: bird.createdAt || new Date().toISOString(),
    color_mutation: bird.colorMutation || '',
    birth_date: bird.birthDate || null,
    location: bird.location || '',
    photo_url: bird.photoUrl || null,
    classification: bird.classification || null,
    song_training_status: bird.songTrainingStatus || null,
    song_type: bird.songType || '',
    song_source: bird.songSource || null,
    training_start_date: bird.trainingStartDate || null,
    training_notes: bird.trainingNotes || null,
    is_repeater: !!bird.isRepeater,
    sexing: bird.sexing || null,
    documents: bird.documents || [],
    father_id: bird.fatherId || null,
    mother_id: bird.motherId || null,
    manual_ancestors: bird.manualAncestors || null,
  });

  const mapBirdUpdateToDb = (bird: Bird) => ({
    name: bird.name,
    ring: bird.ringNumber,
    species: bird.species,
    sex: bird.sex,
    status: bird.status,
    color_mutation: bird.colorMutation || '',
    birth_date: bird.birthDate || null,
    location: bird.location || '',
    photo_url: bird.photoUrl || null,
    classification: bird.classification || null,
    song_training_status: bird.songTrainingStatus || null,
    song_type: bird.songType || '',
    song_source: bird.songSource || null,
    training_start_date: bird.trainingStartDate || null,
    training_notes: bird.trainingNotes || null,
    is_repeater: !!bird.isRepeater,
    sexing: bird.sexing || null,
    documents: bird.documents || [],
    father_id: bird.fatherId || null,
    mother_id: bird.motherId || null,
    manual_ancestors: bird.manualAncestors || null,
  });

  const mapMovementToDb = (mov: MovementRecord, uid: string) => ({
    id: mov.id,
    user_id: uid,
    bird_id: mov.birdId,
    type: mov.type,
    date: mov.date,
    notes: mov.notes,
    ...(mov.gtrUrl ? { gtr_url: mov.gtrUrl } : {}),
    ...(mov.destination ? { destination: mov.destination } : {}),
    ...(mov.buyerSispass ? { buyer_sispass: mov.buyerSispass } : {}),
  });

  const mapMovementUpdateToDb = (mov: MovementRecord) => ({
    bird_id: mov.birdId,
    type: mov.type,
    date: mov.date,
    notes: mov.notes,
    ...(mov.gtrUrl ? { gtr_url: mov.gtrUrl } : {}),
    ...(mov.destination ? { destination: mov.destination } : {}),
    ...(mov.buyerSispass ? { buyer_sispass: mov.buyerSispass } : {}),
  });

  const mapTransactionToDb = (t: Transaction, uid: string) => ({
    id: t.id,
    user_id: uid,
    description: t.description,
    amount: t.amount,
    date: t.date,
    type: t.type,
    ...(t.category ? { category: t.category } : {}),
    ...(t.subcategory ? { subcategory: t.subcategory } : {}),
  });

  const mapTransactionUpdateToDb = (t: Transaction) => ({
    description: t.description,
    amount: t.amount,
    date: t.date,
    type: t.type,
    ...(t.category ? { category: t.category } : {}),
    ...(t.subcategory ? { subcategory: t.subcategory } : {}),
  });

  const mapTaskToDb = (t: MaintenanceTask, uid: string) => ({
    id: t.id,
    user_id: uid,
    title: t.title,
    due_date: t.dueDate,
    is_completed: t.isCompleted,
    ...(t.priority ? { priority: t.priority } : {}),
    ...(t.birdId ? { bird_id: t.birdId } : {}),
    ...(t.frequency ? { frequency: t.frequency } : {}),
    ...(typeof t.remindMe === 'boolean' ? { remind_me: t.remindMe } : {}),
  });

  const mapTaskUpdateToDb = (t: MaintenanceTask) => ({
    title: t.title,
    due_date: t.dueDate,
    is_completed: t.isCompleted,
    ...(t.priority ? { priority: t.priority } : {}),
    ...(t.birdId ? { bird_id: t.birdId } : {}),
    ...(t.frequency ? { frequency: t.frequency } : {}),
    ...(typeof t.remindMe === 'boolean' ? { remind_me: t.remindMe } : {}),
  });

  const mapPairToDb = (pair: Pair, uid: string) => ({
    id: pair.id,
    user_id: uid,
    male_id: pair.maleId,
    female_id: pair.femaleId,
    start_date: pair.startDate,
    end_date: pair.endDate || null,
    status: pair.status,
    name: pair.name,
    last_hatch_date: pair.lastHatchDate || null,
  });

  const mapPairUpdateToDb = (pair: Pair) => ({
    male_id: pair.maleId,
    female_id: pair.femaleId,
    start_date: pair.startDate,
    end_date: pair.endDate || null,
    status: pair.status,
    name: pair.name,
    last_hatch_date: pair.lastHatchDate || null,
  });

  const mapClutchToDb = (clutch: Clutch, uid: string) => ({
    id: clutch.id,
    user_id: uid,
    pair_id: clutch.pairId,
    lay_date: clutch.layDate,
    egg_count: clutch.eggCount,
    fertile_count: clutch.fertileCount,
    hatched_count: clutch.hatchedCount,
    notes: clutch.notes,
  });

  const mapClutchUpdateToDb = (clutch: Clutch) => ({
    pair_id: clutch.pairId,
    lay_date: clutch.layDate,
    egg_count: clutch.eggCount,
    fertile_count: clutch.fertileCount,
    hatched_count: clutch.hatchedCount,
    notes: clutch.notes,
  });

  const mapMedicationToDb = (med: Medication, uid: string) => ({
    id: med.id,
    user_id: uid,
    name: med.name,
    type: med.type,
    batch: med.batch,
    expiry_date: med.expiryDate,
    stock: med.stock,
  });

  const mapMedicationUpdateToDb = (med: Medication) => ({
    name: med.name,
    type: med.type,
    batch: med.batch,
    expiry_date: med.expiryDate,
    stock: med.stock,
  });

  const mapApplicationToDb = (app: MedicationApplication, uid: string) => {
    const safeTreatmentId = app.treatmentId && uuidRegex.test(app.treatmentId) ? app.treatmentId : null;
    return {
      id: app.id,
      user_id: uid,
      bird_id: app.birdId,
      medication_id: app.medicationId,
      date: app.date,
      dosage: app.dosage,
      notes: app.notes,
      treatment_id: safeTreatmentId,
    };
  };

  const mapApplicationUpdateToDb = (app: MedicationApplication) => {
    const safeTreatmentId = app.treatmentId && uuidRegex.test(app.treatmentId) ? app.treatmentId : null;
    return {
      bird_id: app.birdId,
      medication_id: app.medicationId,
      date: app.date,
      dosage: app.dosage,
      notes: app.notes,
      treatment_id: safeTreatmentId,
    };
  };

  const mapTreatmentToDb = (t: ContinuousTreatment, uid: string) => {
    const safeBirdId = t.birdId && uuidRegex.test(t.birdId) ? t.birdId : null;
    const safeMedicationId = t.medicationId && uuidRegex.test(t.medicationId) ? t.medicationId : null;
    return {
      id: t.id,
      user_id: uid,
      bird_id: safeBirdId,
      medication_id: safeMedicationId,
      start_date: t.startDate,
      end_date: t.endDate || null,
      frequency: t.frequency,
      dosage: t.dosage,
      status: t.status,
      last_application_date: t.lastApplicationDate || null,
      notes: t.notes || '',
    };
  };

  const mapTreatmentUpdateToDb = (t: ContinuousTreatment) => {
    const safeBirdId = t.birdId && uuidRegex.test(t.birdId) ? t.birdId : null;
    const safeMedicationId = t.medicationId && uuidRegex.test(t.medicationId) ? t.medicationId : null;
    return {
      bird_id: safeBirdId,
      medication_id: safeMedicationId,
      start_date: t.startDate,
      end_date: t.endDate || null,
      frequency: t.frequency,
      dosage: t.dosage,
      status: t.status,
      last_application_date: t.lastApplicationDate || null,
      notes: t.notes || '',
    };
  };

  const getValidTournamentBirdIds = (ids?: string[]) => {
    if (!Array.isArray(ids)) return [];
    return ids.filter(id => uuidRegex.test(id));
  };

  const mapTournamentToDb = (t: TournamentEvent, uid: string) => {
    const participatingBirds = getValidTournamentBirdIds(t.participatingBirds);
    return {
    id: t.id,
    user_id: uid,
    title: t.title,
    date: t.date,
    location: t.location,
    type: t.type,
    category: t.category,
    notes: t.notes || null,
    organizer: t.organizer || null,
    result: t.result || null,
    trophy: t.trophy ?? null,
    score: t.score ?? null,
    participating_birds: participatingBirds.length > 0 ? participatingBirds : null,
    preparation_checklist: t.preparationChecklist || null,
    };
  };

  const mapTournamentToDbMinimal = (t: TournamentEvent, uid: string) => ({
    id: t.id,
    user_id: uid,
    title: t.title,
    date: t.date,
    location: t.location,
  });

  const mapTournamentUpdateToDb = (t: TournamentEvent) => {
    const participatingBirds = getValidTournamentBirdIds(t.participatingBirds);
    return {
    title: t.title,
    date: t.date,
    location: t.location,
    type: t.type,
    category: t.category,
    notes: t.notes || null,
    organizer: t.organizer || null,
    result: t.result || null,
    trophy: t.trophy ?? null,
    score: t.score ?? null,
    participating_birds: participatingBirds.length > 0 ? participatingBirds : null,
    preparation_checklist: t.preparationChecklist || null,
    };
  };

  const mapTournamentUpdateToDbMinimal = (t: TournamentEvent) => ({
    title: t.title,
    date: t.date,
    location: t.location,
  });

  const isSchemaCacheMissingColumn = (err: any) => {
    const text = [err?.message, err?.details, err?.hint]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return text.includes('schema cache') || (text.includes('could not find') && text.includes('column'));
  };

  const mapSettingsToDb = (settings: BreederSettings, uid: string) => ({
    user_id: uid,
    breeder_name: settings.breederName,
    cpf_cnpj: settings.cpfCnpj,
    sispass_number: settings.sispassNumber,
    sispass_document_url: settings.sispassDocumentUrl || null,
    registration_date: settings.registrationDate,
    renewal_date: settings.renewalDate,
    last_renewal_date: settings.lastRenewalDate || null,
    logo_url: settings.logoUrl || null,
    primary_color: settings.primaryColor,
    accent_color: settings.accentColor,
    plan: settings.plan,
    trial_end_date: settings.trialEndDate || null,
    dashboard_layout: settings.dashboardLayout || null,
    certificate: settings.certificate || null,
  });

  // --- BIRDS ---
  const addBird = async (bird: Bird) => {
    const uid = await getUserId();
    if (!uid) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safeBirdId = uuidRegex.test(bird.id)
      ? bird.id
      : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }));

    const safeBird: Bird = bird.id === safeBirdId ? bird : { ...bird, id: safeBirdId };
    const dbRow = mapBirdToDb(safeBird, uid);

    let added = false;
    setState(prev => {
      if (prev.birds.some(b => b.id === safeBird.id)) return prev;
      added = true;
      return { ...prev, birds: [...prev.birds, safeBird] };
    });

    try {
      await insertRow('birds', dbRow);
    } catch (err) {
      if (added) {
        setState(prev => ({ ...prev, birds: prev.birds.filter(b => b.id !== bird.id) }));
      }
      console.error('Erro ao salvar ave:', err);
      setError('Falha ao salvar ave. Verifique sua conexÃ£o e tente novamente.');
    }
  };

  const updateBird = async (updatedBird: Bird) => {
    setState(prev => ({
      ...prev,
      birds: prev.birds.map(b => b.id === updatedBird.id ? updatedBird : b),
    }));
    await updateRow('birds', updatedBird.id, mapBirdUpdateToDb(updatedBird));
  };

  const deleteBird = async (id: string) => {
    const item = state.birds.find(b => b.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({
      ...prev,
      birds: prev.birds.filter(b => b.id !== id),
      deletedBirds: [deletedItem, ...(prev.deletedBirds || [])],
    }));
    try {
      await updateRow('birds', id, { deleted_at: deletedAt });
    } catch (err) {
      console.error('Erro ao remover ave:', err);
      setError('Falha ao remover ave. Verifique sua conexao.');
    }
  };
  const restoreBird = (id: string) => {
    const item = state.deletedBirds?.find(b => b.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({
      ...prev,
      deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id),
      birds: [...prev.birds, restoredItem],
    }));
    (async () => {
      try {
        await updateRow('birds', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar ave:', err);
        setError('Falha ao restaurar ave. Verifique sua conexao.');
      }
    })();
  };
  const permanentlyDeleteBird = (id: string) => {
    setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id) }));
    (async () => {
      try {
        await deleteRow('birds', id);
      } catch (err) {
        console.error('Erro ao remover ave definitivamente:', err);
        setError('Falha ao remover ave. Verifique sua conexao.');
      }
    })();
  };
  const updateBirdStatus = (id: string, status: any) => {
    setState(prev => ({
      ...prev,
      birds: prev.birds.map(b => b.id === id ? { ...b, status } : b)
    }));
    (async () => {
      try {
        await updateRow('birds', id, { status });
      } catch (err) {
        console.error('Erro ao atualizar status da ave:', err);
      }
    })();
  };

  // --- MOVEMENTS ---
  const addMovement = async (mov: MovementRecord) => {
    const uid = await getUserId();
    if (!uid) return;
    let added = false;
    setState(prev => {
      if (prev.movements.some(m => m.id === mov.id)) return prev;
      added = true;
      return { ...prev, movements: [...prev.movements, mov] };
    });
    try {
      await insertRow('movements', mapMovementToDb(mov, uid));
    } catch (err) {
      if (added) {
        setState(prev => ({ ...prev, movements: prev.movements.filter(m => m.id !== mov.id) }));
      }
      console.error('Erro ao salvar movimentacao:', err);
      setError('Falha ao salvar movimentacao. Verifique sua conexao.');
      return;
    }
    const newStatusMap: Record<string, any> = { 'Óbito': 'Falecido', 'Fuga': 'Fugido', 'Venda': 'Vendido', 'Transporte': 'Transferido' };
    if (newStatusMap[mov.type]) updateBirdStatus(mov.birdId, newStatusMap[mov.type]);
  };

  const updateMovement = async (updatedMov: MovementRecord) => {
    setState(prev => ({
      ...prev,
      movements: prev.movements.map(m => m.id === updatedMov.id ? updatedMov : m),
    }));
    try {
      await updateRow('movements', updatedMov.id, mapMovementUpdateToDb(updatedMov));
    } catch (err) {
      console.error('Erro ao atualizar movimentacao:', err);
      setError('Falha ao atualizar movimentacao. Verifique sua conexao.');
    }
  };

  const deleteMovement = async (id: string) => {
    const item = state.movements.find(m => m.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({
      ...prev,
      movements: prev.movements.filter(m => m.id !== id),
      deletedMovements: [deletedItem, ...(prev.deletedMovements || [])],
    }));
    try {
      await updateRow('movements', id, { deleted_at: deletedAt });
    } catch (err) {
      console.error('Erro ao remover movimentacao:', err);
      setError('Falha ao remover movimentacao. Verifique sua conexao.');
    }
  };
  const restoreMovement = (id: string) => {
    const item = state.deletedMovements?.find(m => m.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id), movements: [restoredItem, ...prev.movements] }));
    (async () => {
      try {
        await updateRow('movements', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar movimentacao:', err);
        setError('Falha ao restaurar movimentacao. Verifique sua conexao.');
      }
    })();
  };
  const permanentlyDeleteMovement = (id: string) => {
    setState(prev => ({ ...prev, deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id) }));
    (async () => {
      try {
        await deleteRow('movements', id);
      } catch (err) {
        console.error('Erro ao remover movimentacao definitivamente:', err);
        setError('Falha ao remover movimentacao. Verifique sua conexao.');
      }
    })();
  };

  // --- PAIRS / BREEDING ---
  const addPair = (pair: Pair) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      let added = false;
      setState(prev => {
        if (prev.pairs.some(p => p.id === pair.id)) return prev;
        added = true;
        return { ...prev, pairs: [...prev.pairs, pair] };
      });
      try {
        await insertRow('pairs', mapPairToDb(pair, uid));
      } catch (err) {
        if (added) {
          setState(prev => ({ ...prev, pairs: prev.pairs.filter(p => p.id !== pair.id) }));
        }
        console.error('Erro ao salvar casal:', err);
        setError('Falha ao salvar casal. Verifique sua conexao.');
      }
    })();
  };

  const updatePair = (updated: Pair) => {
    setState(prev => ({
      ...prev,
      pairs: prev.pairs.map(p => p.id === updated.id ? updated : p),
    }));
    (async () => {
      try {
        await updateRow('pairs', updated.id, mapPairUpdateToDb(updated));
      } catch (err) {
        console.error('Erro ao atualizar casal:', err);
        setError('Falha ao atualizar casal. Verifique sua conexao.');
      }
    })();
  };

  const addClutch = (clutch: Clutch) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      let added = false;
      setState(prev => {
        if (prev.clutches.some(c => c.id === clutch.id)) return prev;
        added = true;
        return { ...prev, clutches: [...prev.clutches, clutch] };
      });
      try {
        await insertRow('clutches', mapClutchToDb(clutch, uid));
      } catch (err) {
        if (added) {
          setState(prev => ({ ...prev, clutches: prev.clutches.filter(c => c.id !== clutch.id) }));
        }
        console.error('Erro ao salvar ninhada:', err);
        setError('Falha ao salvar ninhada. Verifique sua conexao.');
      }
    })();
  };

  const updateClutch = (updated: Clutch) => {
    setState(prev => ({ ...prev, clutches: prev.clutches.map(c => c.id === updated.id ? updated : c) }));
    (async () => {
      try {
        await updateRow('clutches', updated.id, mapClutchUpdateToDb(updated));
      } catch (err) {
        console.error('Erro ao atualizar ninhada:', err);
        setError('Falha ao atualizar ninhada. Verifique sua conexao.');
      }
    })();
  };

  const deletePair = (id: string) => {
    const item = state.pairs.find(p => p.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({ ...prev, pairs: prev.pairs.filter(p => p.id !== id), deletedPairs: [deletedItem, ...(prev.deletedPairs || [])] }));
    (async () => {
      try {
        await updateRow('pairs', id, { deleted_at: deletedAt });
      } catch (err) {
        console.error('Erro ao remover casal:', err);
        setError('Falha ao remover casal. Verifique sua conexao.');
      }
    })();
  };

  const restorePair = (id: string) => {
    const item = state.deletedPairs?.find(p => p.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id), pairs: [...prev.pairs, restoredItem] }));
    (async () => {
      try {
        await updateRow('pairs', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar casal:', err);
        setError('Falha ao restaurar casal. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeletePair = (id: string) => {
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id) }));
    (async () => {
      try {
        await deleteRow('pairs', id);
      } catch (err) {
        console.error('Erro ao remover casal definitivamente:', err);
        setError('Falha ao remover casal. Verifique sua conexao.');
      }
    })();
  };

  // --- MEDICATIONS & TREATMENTS ---
  const addMed = (med: Medication) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const safeMedId = uuidRegex.test(med.id) ? med.id : createUuid();
      const safeMed = med.id === safeMedId ? med : { ...med, id: safeMedId };
      let added = false;
      setState(prev => {
        if (prev.medications.some(m => m.id === safeMed.id)) return prev;
        added = true;
        return { ...prev, medications: [...prev.medications, safeMed] };
      });
      try {
        await insertRow('medications', mapMedicationToDb(safeMed, uid));
      } catch (err) {
        if (added) {
          setState(prev => ({ ...prev, medications: prev.medications.filter(m => m.id !== safeMed.id) }));
        }
        console.error('Erro ao salvar medicamento:', err);
        setError('Falha ao salvar medicamento. Verifique sua conexao.');
      }
    })();
  };

  const updateMed = (updatedMed: Medication) => {
    if (!uuidRegex.test(updatedMed.id)) {
      const safeMedId = createUuid();
      const safeMed = { ...updatedMed, id: safeMedId };
      setState(prev => ({
        ...prev,
        medications: prev.medications.map(m => m.id === updatedMed.id ? safeMed : m),
        applications: prev.applications.map(a => a.medicationId === updatedMed.id ? { ...a, medicationId: safeMedId } : a),
        treatments: prev.treatments.map(t => t.medicationId === updatedMed.id ? { ...t, medicationId: safeMedId } : t),
      }));
      (async () => {
        const uid = await getUserId();
        if (!uid) return;
        try {
          await insertRow('medications', mapMedicationToDb(safeMed, uid));
        } catch (err) {
          console.error('Erro ao salvar medicamento:', err);
          setError('Falha ao salvar medicamento. Verifique sua conexao.');
        }
      })();
      return;
    }
    setState(prev => ({
      ...prev,
      medications: prev.medications.map(m => m.id === updatedMed.id ? updatedMed : m)
    }));
    (async () => {
      try {
        await updateRow('medications', updatedMed.id, mapMedicationUpdateToDb(updatedMed));
      } catch (err) {
        console.error('Erro ao atualizar medicamento:', err);
        setError('Falha ao atualizar medicamento. Verifique sua conexao.');
      }
    })();
  };
  
  const applyMed = (app: MedicationApplication) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const safeAppId = uuidRegex.test(app.id) ? app.id : createUuid();
      let safeMedicationId = app.medicationId;
      const sourceMedication = !uuidRegex.test(app.medicationId)
        ? state.medications.find(m => m.id === app.medicationId)
        : undefined;
      if (sourceMedication) {
        if (uuidRegex.test(sourceMedication.id)) {
          safeMedicationId = sourceMedication.id;
        } else {
          const safeMedId = createUuid();
          const safeMed = { ...sourceMedication, id: safeMedId };
          safeMedicationId = safeMedId;
          setState(prev => ({
            ...prev,
            medications: prev.medications.map(m => m.id === sourceMedication.id ? safeMed : m),
            applications: prev.applications.map(a => a.medicationId === sourceMedication.id ? { ...a, medicationId: safeMedId } : a),
            treatments: prev.treatments.map(t => t.medicationId === sourceMedication.id ? { ...t, medicationId: safeMedId } : t),
          }));
          try {
            await insertRow('medications', mapMedicationToDb(safeMed, uid));
          } catch (err) {
            console.error('Erro ao salvar medicamento:', err);
            setError('Falha ao salvar medicamento. Verifique sua conexao.');
          }
        }
      }
      const safeApp = app.id === safeAppId && app.medicationId === safeMedicationId
        ? app
        : { ...app, id: safeAppId, medicationId: safeMedicationId };
      let added = false;
      setState(prev => {
        if (prev.applications.some(a => a.id === safeApp.id)) return prev;
        added = true;
        return { ...prev, applications: [...prev.applications, safeApp] };
      });
      try {
        await insertRow('applications', mapApplicationToDb(safeApp, uid));
      } catch (err) {
        if (added) {
          setState(prev => ({ ...prev, applications: prev.applications.filter(a => a.id !== safeApp.id) }));
        }
        console.error('Erro ao salvar aplicacao:', err);
        setError('Falha ao salvar aplicacao. Verifique sua conexao.');
      }
    })();
  };

  const updateApplication = (updatedApp: MedicationApplication) => {
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(a => a.id === updatedApp.id ? updatedApp : a)
    }));
    (async () => {
      try {
        await updateRow('applications', updatedApp.id, mapApplicationUpdateToDb(updatedApp));
      } catch (err) {
        console.error('Erro ao atualizar aplicacao:', err);
        setError('Falha ao atualizar aplicacao. Verifique sua conexao.');
      }
    })();
  };

  const deleteApplication = (id: string) => {
    const item = state.applications.find(a => a.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({ ...prev, applications: prev.applications.filter(a => a.id !== id), deletedApplications: [deletedItem, ...(prev.deletedApplications || [])] }));
    (async () => {
      try {
        await updateRow('applications', id, { deleted_at: deletedAt });
      } catch (err) {
        console.error('Erro ao remover aplicacao:', err);
        setError('Falha ao remover aplicacao. Verifique sua conexao.');
      }
    })();
  };

  const restoreApplication = (id: string) => {
    const item = state.deletedApplications?.find(a => a.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id), applications: [...prev.applications, restoredItem] }));
    (async () => {
      try {
        await updateRow('applications', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar aplicacao:', err);
        setError('Falha ao restaurar aplicacao. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteApplication = (id: string) => {
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id) }));
    (async () => {
      try {
        await deleteRow('applications', id);
      } catch (err) {
        console.error('Erro ao remover aplicacao definitivamente:', err);
        setError('Falha ao remover aplicacao. Verifique sua conexao.');
      }
    })();
  };

  const deleteMed = (id: string) => {
    const item = state.medications.find(m => m.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({ ...prev, medications: prev.medications.filter(m => m.id !== id), deletedMedications: [deletedItem, ...(prev.deletedMedications || [])] }));
    (async () => {
      try {
        await updateRow('medications', id, { deleted_at: deletedAt });
      } catch (err) {
        console.error('Erro ao remover medicamento:', err);
        setError('Falha ao remover medicamento. Verifique sua conexao.');
      }
    })();
  };

  const restoreMed = (id: string) => {
    const item = state.deletedMedications?.find(m => m.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id), medications: [...prev.medications, restoredItem] }));
    (async () => {
      try {
        await updateRow('medications', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar medicamento:', err);
        setError('Falha ao restaurar medicamento. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteMed = (id: string) => {
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id) }));
    (async () => {
      try {
        await deleteRow('medications', id);
      } catch (err) {
        console.error('Erro ao remover medicamento definitivamente:', err);
        setError('Falha ao remover medicamento. Verifique sua conexao.');
      }
    })();
  };

  // New Treatment Functions
  const addTreatment = (t: ContinuousTreatment) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const safeTreatmentId = uuidRegex.test(t.id) ? t.id : createUuid();
      let safeMedicationId = t.medicationId;
      const sourceMedication = !uuidRegex.test(t.medicationId)
        ? state.medications.find(m => m.id === t.medicationId)
        : undefined;
      if (sourceMedication) {
        if (uuidRegex.test(sourceMedication.id)) {
          safeMedicationId = sourceMedication.id;
        } else {
          const safeMedId = createUuid();
          const safeMed = { ...sourceMedication, id: safeMedId };
          safeMedicationId = safeMedId;
          setState(prev => ({
            ...prev,
            medications: prev.medications.map(m => m.id === sourceMedication.id ? safeMed : m),
            applications: prev.applications.map(a => a.medicationId === sourceMedication.id ? { ...a, medicationId: safeMedId } : a),
            treatments: prev.treatments.map(tr => tr.medicationId === sourceMedication.id ? { ...tr, medicationId: safeMedId } : tr),
          }));
          try {
            await insertRow('medications', mapMedicationToDb(safeMed, uid));
          } catch (err) {
            console.error('Erro ao salvar medicamento:', err);
            setError('Falha ao salvar medicamento. Verifique sua conexao.');
          }
        }
      }
      const safeBirdId = t.birdId && uuidRegex.test(t.birdId) ? t.birdId : 'ALL';
      const safeTreatment: ContinuousTreatment = t.id === safeTreatmentId && t.medicationId === safeMedicationId && t.birdId === safeBirdId
        ? t
        : { ...t, id: safeTreatmentId, medicationId: safeMedicationId, birdId: safeBirdId };
      let added = false;
      setState(prev => {
        if (prev.treatments.some(item => item.id === safeTreatment.id)) return prev;
        added = true;
        return { ...prev, treatments: [...prev.treatments, safeTreatment] };
      });
      try {
        await insertRow('treatments', mapTreatmentToDb(safeTreatment, uid));
      } catch (err) {
        if (added) {
          setState(prev => ({ ...prev, treatments: prev.treatments.filter(item => item.id !== safeTreatment.id) }));
        }
        console.error('Erro ao salvar tratamento:', err);
        setError('Falha ao salvar tratamento. Verifique sua conexao.');
      }
    })();
  };

  const updateTreatment = (updated: ContinuousTreatment) => {
    if (!uuidRegex.test(updated.id)) {
      const safeTreatmentId = createUuid();
      const safeTreatment = { ...updated, id: safeTreatmentId };
      setState(prev => ({
        ...prev,
        treatments: prev.treatments.map(t => t.id === updated.id ? safeTreatment : t),
        applications: prev.applications.map(a => a.treatmentId === updated.id ? { ...a, treatmentId: safeTreatmentId } : a),
      }));
      (async () => {
        const uid = await getUserId();
        if (!uid) return;
        try {
          await insertRow('treatments', mapTreatmentToDb(safeTreatment, uid));
        } catch (err) {
          console.error('Erro ao salvar tratamento:', err);
          setError('Falha ao salvar tratamento. Verifique sua conexao.');
        }
      })();
      return;
    }

    let safeMedicationId = updated.medicationId;
    const sourceMedication = !uuidRegex.test(updated.medicationId)
      ? state.medications.find(m => m.id === updated.medicationId)
      : undefined;
    if (sourceMedication) {
      if (uuidRegex.test(sourceMedication.id)) {
        safeMedicationId = sourceMedication.id;
      } else {
        const safeMedId = createUuid();
        const safeMed = { ...sourceMedication, id: safeMedId };
        safeMedicationId = safeMedId;
        setState(prev => ({
          ...prev,
          medications: prev.medications.map(m => m.id === sourceMedication.id ? safeMed : m),
          applications: prev.applications.map(a => a.medicationId === sourceMedication.id ? { ...a, medicationId: safeMedId } : a),
          treatments: prev.treatments.map(tr => tr.medicationId === sourceMedication.id ? { ...tr, medicationId: safeMedId } : tr),
        }));
        (async () => {
          const uid = await getUserId();
          if (!uid) return;
          try {
            await insertRow('medications', mapMedicationToDb(safeMed, uid));
          } catch (err) {
            console.error('Erro ao salvar medicamento:', err);
            setError('Falha ao salvar medicamento. Verifique sua conexao.');
          }
        })();
      }
    }
    const safeBirdId = updated.birdId && uuidRegex.test(updated.birdId) ? updated.birdId : 'ALL';
    const safeTreatment = updated.medicationId === safeMedicationId && updated.birdId === safeBirdId
      ? updated
      : { ...updated, medicationId: safeMedicationId, birdId: safeBirdId };
    setState(prev => ({
      ...prev,
      treatments: prev.treatments.map(t => t.id === updated.id ? safeTreatment : t)
    }));
    (async () => {
      try {
        await updateRow('treatments', safeTreatment.id, mapTreatmentUpdateToDb(safeTreatment));
      } catch (err) {
        console.error('Erro ao atualizar tratamento:', err);
        setError('Falha ao atualizar tratamento. Verifique sua conexao.');
      }
    })();
  };

  const deleteTreatment = (id: string) => {
    const item = state.treatments.find(t => t.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({ ...prev, treatments: prev.treatments.filter(t => t.id !== id), deletedTreatments: [deletedItem, ...(prev.deletedTreatments || [])] }));
    (async () => {
      try {
        await updateRow('treatments', id, { deleted_at: deletedAt });
      } catch (err) {
        console.error('Erro ao remover tratamento:', err);
        setError('Falha ao remover tratamento. Verifique sua conexao.');
      }
    })();
  };

  const restoreTreatment = (id: string) => {
    const item = state.deletedTreatments?.find(t => t.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id), treatments: [...prev.treatments, restoredItem] }));
    (async () => {
      try {
        await updateRow('treatments', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar tratamento:', err);
        setError('Falha ao restaurar tratamento. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteTreatment = (id: string) => {
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id) }));
    (async () => {
      try {
        await deleteRow('treatments', id);
      } catch (err) {
        console.error('Erro ao remover tratamento definitivamente:', err);
        setError('Falha ao remover tratamento. Verifique sua conexao.');
      }
    })();
  };

  // --- FINANCE ---
  const addTransaction = async (t: Transaction) => {
    const uid = await getUserId();
    if (!uid) return;
    const safeId = uuidRegex.test(t.id) ? t.id : createUuid();
    const safeTransaction = t.id === safeId ? t : { ...t, id: safeId };
    let added = false;
    setState(prev => {
      if (prev.transactions.some(tx => tx.id === safeTransaction.id)) return prev;
      added = true;
      return { ...prev, transactions: [...prev.transactions, safeTransaction] };
    });
    try {
      await insertRow('transactions', mapTransactionToDb(safeTransaction, uid));
    } catch (err) {
      if (added) {
        setState(prev => ({ ...prev, transactions: prev.transactions.filter(tx => tx.id !== safeTransaction.id) }));
      }
      console.error('Erro ao salvar lancamento:', err);
      setError('Falha ao salvar lancamento. Verifique sua conexao.');
    }
  };

  const deleteTransaction = async (id: string) => {
    const item = state.transactions.find(t => t.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
      deletedTransactions: [deletedItem, ...(prev.deletedTransactions || [])],
    }));
    try {
      await updateRow('transactions', id, { deleted_at: deletedAt });
    } catch (err) {
      console.error('Erro ao remover lancamento:', err);
      setError('Falha ao remover lancamento. Verifique sua conexao.');
    }
  };

  const restoreTransaction = (id: string) => {
    const item = state.deletedTransactions?.find(t => t.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(t => t.id !== id), transactions: [...prev.transactions, restoredItem] }));
    (async () => {
      try {
        await updateRow('transactions', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar lancamento:', err);
        setError('Falha ao restaurar lancamento. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteTransaction = (id: string) => {
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(t => t.id !== id) }));
    (async () => {
      try {
        await deleteRow('transactions', id);
      } catch (err) {
        console.error('Erro ao remover lancamento definitivamente:', err);
        setError('Falha ao remover lancamento. Verifique sua conexao.');
      }
    })();
  };

  // --- TASKS ---
  const addTask = async (t: MaintenanceTask) => {
    const uid = await getUserId();
    if (!uid) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const safeTaskId = uuidRegex.test(t.id)
      ? t.id
      : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }));
    const safeTask = t.id === safeTaskId ? t : { ...t, id: safeTaskId };

    let added = false;
    setState(prev => {
      if (prev.tasks.some(task => task.id === safeTask.id)) return prev;
      added = true;
      return { ...prev, tasks: [...prev.tasks, safeTask] };
    });

    try {
      await insertRow('tasks', mapTaskToDb(safeTask, uid));
    } catch (err) {
      if (added) {
        setState(prev => ({ ...prev, tasks: prev.tasks.filter(task => task.id !== safeTask.id) }));
      }
      console.error('Erro ao salvar tarefa:', err);
      setError('Falha ao salvar tarefa. Verifique sua conexao.');
    }
  };

  const updateTask = async (updatedTask: MaintenanceTask) => {
    await updateRow('tasks', updatedTask.id, mapTaskUpdateToDb(updatedTask));
  };

  const toggleTask = async (id: string) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const updated = { ...task, isCompleted: !task.isCompleted };
    let applied = false;
    setState(prev => {
      if (!prev.tasks.some(t => t.id === id)) return prev;
      applied = true;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? updated : t)
      };
    });

    try {
      await updateRow('tasks', id, mapTaskUpdateToDb(updated));
    } catch (err) {
      if (applied) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === id ? task : t)
        }));
      }
      console.error('Erro ao concluir tarefa:', err);
      setError('Falha ao concluir tarefa. Verifique sua conexao.');
    }
  };

  const deleteTask = async (id: string) => {
    const item = state.tasks.find(t => t.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    let removed = false;
    setState(prev => {
      if (!prev.tasks.some(t => t.id === id)) return prev;
      removed = true;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id),
        deletedTasks: [deletedItem, ...(prev.deletedTasks || [])],
      };
    });

    try {
      await updateRow('tasks', id, { deleted_at: deletedAt });
    } catch (err) {
      if (removed) {
        setState(prev => ({
          ...prev,
          tasks: [...prev.tasks, item],
          deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id),
        }));
      }
      console.error('Erro ao remover tarefa:', err);
      setError('Falha ao remover tarefa. Verifique sua conexao.');
    }
  };

  const restoreTask = (id: string) => {
    const item = state.deletedTasks?.find(t => t.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({
      ...prev,
      deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id),
      tasks: [...prev.tasks, restoredItem],
    }));

    (async () => {
      try {
        await updateRow('tasks', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar tarefa:', err);
        setError('Falha ao restaurar tarefa. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteTask = (id: string) => {
    setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id) }));
    (async () => {
      try {
        await deleteRow('tasks', id);
      } catch (err) {
        console.error('Erro ao remover tarefa definitivamente:', err);
        setError('Falha ao remover tarefa. Verifique sua conexao.');
      }
    })();
  };

  // --- EVENTS ---
  const addEvent = (e: TournamentEvent) => {
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const safeEventId = uuidRegex.test(e.id)
        ? e.id
        : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              }));
      const safeEvent = e.id === safeEventId ? e : { ...e, id: safeEventId };
      let added = false;
      setState(prev => {
        if (prev.tournaments.some(item => item.id === safeEvent.id)) return prev;
        added = true;
        return { ...prev, tournaments: [...prev.tournaments, safeEvent] };
      });
      try {
        if (tournamentSchemaMode.current === 'minimal') {
          await insertRow('tournaments', mapTournamentToDbMinimal(safeEvent, uid));
          return;
        }
        await insertRow('tournaments', mapTournamentToDb(safeEvent, uid));
      } catch (err) {
        if (isSchemaCacheMissingColumn(err)) {
          try {
            tournamentSchemaMode.current = 'minimal';
            await insertRow('tournaments', mapTournamentToDbMinimal(safeEvent, uid));
            console.warn('Torneio salvo com campos basicos por falta de colunas no banco.');
            return;
          } catch (fallbackErr) {
            err = fallbackErr;
          }
        }
        if (added) {
          setState(prev => ({ ...prev, tournaments: prev.tournaments.filter(item => item.id !== safeEvent.id) }));
        }
        console.error('Erro ao salvar evento:', err);
        setError('Falha ao salvar evento. Verifique sua conexao.');
      }
    })();
  };

  const updateEvent = (updated: TournamentEvent) => {
    setState(prev => ({ ...prev, tournaments: prev.tournaments.map(e => e.id === updated.id ? updated : e) }));
    (async () => {
      try {
        if (tournamentSchemaMode.current === 'minimal') {
          await updateRow('tournaments', updated.id, mapTournamentUpdateToDbMinimal(updated));
          return;
        }
        await updateRow('tournaments', updated.id, mapTournamentUpdateToDb(updated));
      } catch (err) {
        if (isSchemaCacheMissingColumn(err)) {
          try {
            tournamentSchemaMode.current = 'minimal';
            await updateRow('tournaments', updated.id, mapTournamentUpdateToDbMinimal(updated));
            console.warn('Evento atualizado com campos basicos por falta de colunas no banco.');
            return;
          } catch (fallbackErr) {
            err = fallbackErr;
          }
        }
        console.error('Erro ao atualizar evento:', err);
        setError('Falha ao atualizar evento. Verifique sua conexao.');
      }
    })();
  };

  const deleteEvent = (id: string) => {
    const item = state.tournaments.find(e => e.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const deletedItem = { ...item, deletedAt };
    setState(prev => ({ ...prev, tournaments: prev.tournaments.filter(e => e.id !== id), deletedTournaments: [deletedItem, ...(prev.deletedTournaments || [])] }));
    (async () => {
      try {
        await updateRow('tournaments', id, { deleted_at: deletedAt });
      } catch (err) {
        console.error('Erro ao remover evento:', err);
        setError('Falha ao remover evento. Verifique sua conexao.');
      }
    })();
  };

  const restoreEvent = (id: string) => {
    const item = state.deletedTournaments?.find(e => e.id === id);
    if (!item) return;
    const restoredItem = { ...item, deletedAt: undefined };
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(e => e.id !== id), tournaments: [...prev.tournaments, restoredItem] }));
    (async () => {
      try {
        await updateRow('tournaments', id, { deleted_at: null });
      } catch (err) {
        console.error('Erro ao restaurar evento:', err);
        setError('Falha ao restaurar evento. Verifique sua conexao.');
      }
    })();
  };

  const permanentlyDeleteEvent = (id: string) => {
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(e => e.id !== id) }));
    (async () => {
      try {
        await deleteRow('tournaments', id);
      } catch (err) {
        console.error('Erro ao remover evento definitivamente:', err);
        setError('Falha ao remover evento. Verifique sua conexao.');
      }
    })();
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  if (!state || !state.settings) {
  return null;
}


  // Verifica expiraÃ§Ã£o do plano trial para o usuÃ¡rio ver
  
  const renderContent = () => {
    const currentTab = activeTab || 'dashboard';
    
    // Se for Financeiro e o plano for Básico (e nÃ£o for um trial vÃ¡lido), bloqueia
    // Nota: A lÃ³gica de App.tsx jÃ¡ rebaixa o plano se o trial expirou, entÃ£o sÃ³ checar 'Básico' basta.
    if (currentTab === 'finance' && state.settings.plan === 'Básico' && !isAdmin) {
      return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
              <DollarSign size={48} />
           </div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">MÃ³dulo Profissional</h2>
           <p className="text-slate-500 font-medium mt-4 max-w-md mx-auto leading-relaxed">
             O controle completo de entradas, saÃ­das e lucros Ã© exclusivo do plano Profissional. Organize sua criaÃ§Ã£o como uma empresa.
           </p>
           <button 
             onClick={() => setActiveTab('settings')}
             className="mt-10 px-10 py-5 bg-amber-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.05] transition-all flex items-center gap-3"
           >
             <Zap size={20} fill="currentColor" /> Assinar Plano PRO
           </button>
        </div>
      );
    }

    try {
      switch (currentTab) {
        case 'dashboard': return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} isAdmin={isAdmin} />;
        case 'birds': 
          return <BirdManager 
            state={state} 
            addBird={addBird} 
            updateBird={updateBird} 
            deleteBird={deleteBird} 
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            isAdmin={isAdmin}
            includeSexingTab={false}
          />;
        case 'sexing':
          return <BirdManager
            state={state}
            addBird={addBird}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            isAdmin={isAdmin}
            initialList="sexagem"
            showListTabs={false}
            titleOverride="Central Sexagem"
          />;
        case 'movements': 
          return <MovementsManager 
            state={state} 
            addMovement={addMovement} 
            updateMovement={updateMovement}
            deleteMovement={deleteMovement}
            restoreMovement={restoreMovement}
            permanentlyDeleteMovement={permanentlyDeleteMovement}
          />;
        case 'breeding': 
          return <BreedingManager 
            state={state} 
            addPair={addPair} 
            updatePair={updatePair}
            addBird={addBird}
            addClutch={addClutch}
            updateClutch={updateClutch}
            deletePair={deletePair}
            restorePair={restorePair}
            permanentlyDeletePair={permanentlyDeletePair}
          />;
        case 'documents': 
          return <DocumentsManager 
            settings={state.settings} 
            updateSettings={updateSettings} 
          />;
        case 'meds': 
          return <MedsManager 
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
          />;
        case 'finance': 
          return <FinanceManager 
            state={state} 
            addTransaction={addTransaction} 
            deleteTransaction={deleteTransaction} 
            restoreTransaction={restoreTransaction}
            permanentlyDeleteTransaction={permanentlyDeleteTransaction}
          />;
        case 'tasks': 
          return <TaskManager 
            state={state} 
            addTask={addTask} 
            updateTask={updateTask}
            toggleTask={toggleTask} 
            deleteTask={deleteTask} 
            restoreTask={restoreTask}
            permanentlyDeleteTask={permanentlyDeleteTask}
          />;
        case 'tournaments': 
          return <TournamentCalendar 
            state={state} 
            addEvent={addEvent} 
            deleteEvent={deleteEvent} 
            updateEvent={updateEvent} 
            restoreEvent={restoreEvent}
            permanentlyDeleteEvent={permanentlyDeleteEvent}
          />;
        case 'settings': return <SettingsManager settings={state.settings} updateSettings={updateSettings} isAdmin={isAdmin} />;
        case 'help': return <HelpCenter />;
        default: return <Dashboard state={state} updateSettings={updateSettings} navigateTo={setActiveTab} isAdmin={isAdmin} />;
      }
    } catch (err) {
      console.error("Erro ao renderizar aba:", err);
      return (
        <div className="p-8 text-center text-rose-500">
          <p>Erro ao carregar esta seÃ§Ã£o. Tente recarregar a pÃ¡gina.</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-[var(--primary-soft)] selection:text-[var(--primary)]">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        logoUrl={state.settings.logoUrl}
        breederName={state.settings.breederName || 'Meu CriatÃ³rio'}
        plan={state.settings.plan || 'Básico'}
        trialEndDate={state.settings.trialEndDate} // Pass trial date
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 max-w-7xl mx-auto w-full transition-all">
        <div className="lg:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 p-1">
                 <img src={state.settings.logoUrl} className="w-full h-full object-contain" alt="Logo" />
              </div>
              <span className="font-black text-slate-800">AviGestÃ£o</span>
           </div>
           <button 
             onClick={() => setIsMobileMenuOpen(true)}
             className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
           >
             <Menu size={24} />
           </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center gap-2 text-sm font-bold">
            <AlertTriangle size={16} /> {error}
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
        .hover\\:bg-brand:hover { background-color: var(--primary-hover) !important; }
      `}</style>
    </div>
  );
};

export default App;








