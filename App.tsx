import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
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
  ContinuousTreatment,
  SubscriptionPlan
} from './types';
import { INITIAL_SETTINGS, MOCK_BIRDS, MOCK_MEDS } from './constants';
import Sidebar from './components/Sidebar';

// Lazy-loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BirdManager = lazy(() => import('./pages/BirdManager'));
const BreedingManager = lazy(() => import('./pages/BreedingManager'));
const MedsManager = lazy(() => import('./pages/MedsManager'));
const SettingsManager = lazy(() => import('./pages/SettingsManager'));
const MovementsManager = lazy(() => import('./pages/MovementsManager'));
const FinanceManager = lazy(() => import('./pages/FinanceManager'));
const TaskManager = lazy(() => import('./pages/TaskManager'));
const TournamentCalendar = lazy(() => import('./pages/TournamentCalendar'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const DocumentsManager = lazy(() => import('./pages/DocumentsManager'));
const Auth = lazy(() => import('./pages/Auth'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const BirdVerification = lazy(() => import('./pages/BirdVerification'));
const VerificationAnalytics = lazy(() => import('./pages/VerificationAnalytics'));

// Firebase auth
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth as firebaseAuth } from './lib/firebase';

// Firestore services
import {
  getBirds,
  getPairs,
  getMovements,
  getTransactions,
  getMedications,
  getTasks,
  getTournaments,
  getSettings,
  getApplications,
  getClutches,
  getTreatments,
  saveSettings
} from './services/firestoreService';

const STORAGE_KEY = 'avigestao_state_v2';
const storageKeyForUser = (userId?: string) => (userId ? `${STORAGE_KEY}::${userId}` : STORAGE_KEY);

const loadCachedState = (userId?: string): { state: AppState; hasCache: boolean } => {
  if (typeof localStorage === 'undefined') return { state: defaultState, hasCache: false };
  try {
    const raw = localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return { state: defaultState, hasCache: false };

    const parsed = JSON.parse(raw);
    const cachedUserId = parsed?.userId;
    const data = parsed?.data ?? parsed;

    if (userId && cachedUserId && cachedUserId !== userId) {
      return { state: defaultState, hasCache: false };
    }

    if (userId && !cachedUserId) {
      return { state: defaultState, hasCache: false };
    }

    return {
      state: {
        ...defaultState,
        ...data,
        settings: { ...defaultState.settings, ...(data.settings || {}) }
      },
      hasCache: true
    };
  } catch {
    return { state: defaultState, hasCache: false };
  }
};

const clearCachedState = (userId?: string) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(storageKeyForUser(userId));
  } catch {
    /* ignore cache cleanup errors */
  }
};

const clearAllCachedStates = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (key.startsWith(STORAGE_KEY)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore cache cleanup errors */
  }
};



const defaultState: AppState = {
  birds: MOCK_BIRDS,
  deletedBirds: [],
  pairs: [],
  archivedPairs: [],
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
  if (Number.isNaN(parsed.getTime())) return undefined;
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

  const lastValidSessionRef = useRef<any>(null);
  const loadedTabsRef = useRef(new Set<string>());
  const auth = getAuth();

  const clearAllState = (userId?: string) => {
    lastValidSessionRef.current = null;
    loadedTabsRef.current = new Set();
    setSession(null);
    setIsAdmin(false);
    setState(defaultState);
    setHasHydratedOnce(false);
    setIsLoading(false);
    clearCachedState(userId);
    clearAllCachedStates();
  };

  const persistState = (value: AppState, userId?: string) => {
    if (!userId) return;
    try {
      const payload = { userId, data: value };
      localStorage.setItem(storageKeyForUser(userId), JSON.stringify(payload));
    } catch {
      /* ignore storage failures */
    }
  };

  // Persist state + theme colors
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', state.settings.primaryColor);
    root.style.setProperty('--primary-hover', state.settings.primaryColor + 'ee');
    root.style.setProperty('--primary-soft', state.settings.primaryColor + '15');
    root.style.setProperty('--accent', state.settings.accentColor);
    const userId = session?.user?.id;
    if (!session || !hasHydratedOnce || !userId) return;
    persistState(state, userId);
  }, [state, session, hasHydratedOnce]);

  // Firebase Authentication
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      try {
        if (firebaseUser) {
          const userId = firebaseUser.uid;
          const cached = loadCachedState(userId);
          
          if (cached.hasCache) {
            setState(cached.state);
            setHasHydratedOnce(true);
          }
          
          setAuthError(null);

          // Create session object from Firebase user
          const newSession = {
            user: { id: firebaseUser.uid, email: firebaseUser.email },
            access_token: await firebaseUser.getIdToken()
          };
          
          await handleSession(newSession, 'SIGNED_IN');
        } else {
          clearAllState();
        }
      } catch (err: any) {
        if (!mounted) return;
        setAuthError(err?.message || 'Erro ao inicializar sessão');
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);


  const handleSession = async (newSession: any, event?: string) => {
    if (!newSession) {
      clearAllState(lastValidSessionRef.current?.user?.id);
      return;
    }

    const previousUserId = lastValidSessionRef.current?.user?.id;
    const newUserId = newSession?.user?.id;
    const userChanged = !!(previousUserId && newUserId && previousUserId !== newUserId);

    if (userChanged) {
      clearCachedState(previousUserId);
      loadedTabsRef.current = new Set();
      setState(defaultState);
      setHasHydratedOnce(false);
    }

    lastValidSessionRef.current = newSession;
    setSession(newSession);

    const cached = loadCachedState(newUserId);
    if (cached.hasCache) {
      setState(cached.state);
      setHasHydratedOnce(true);
    } else {
      setHasHydratedOnce(false);
    }

    setAuthError(null);

    // Load data from Firestore
    if (newUserId) {
      try {
        setIsLoading(true);
        const [birds, pairs, movements, transactions, settings, medications, applications, clutches, treatments, tasks, tournaments] = await Promise.all([
          getBirds(newUserId),
          getPairs(newUserId),
          getMovements(newUserId),
          getTransactions(newUserId),
          getSettings(newUserId),
          getMedications(newUserId),
          getApplications(newUserId),
          getClutches(newUserId),
          getTreatments(newUserId),
          getTasks(newUserId),
          getTournaments(newUserId)
        ]);

        const mergedSettings: BreederSettings = {
          ...defaultState.settings,
          ...(settings || {}),
          userId: newUserId,
          trialEndDate: normalizeTrialEndDate(settings?.trialEndDate)
        };

        setState({
          ...defaultState,
          birds: birds.length > 0 ? birds : MOCK_BIRDS,
          pairs: pairs || [],
          movements: movements || [],
          transactions: transactions || [],
          settings: mergedSettings,
          medications: medications && medications.length > 0 ? medications : MOCK_MEDS,
          applications: applications || [],
          clutches: clutches || [],
          treatments: treatments || [],
          tasks: tasks || [],
          tournaments: tournaments || []
        });

        setHasHydratedOnce(true);
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setAuthError(err?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const persistSettings = async (settings: BreederSettings) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      await saveSettings(userId, settings);
      setState(prev => ({ ...prev, settings }));
      toast.success('Configurações salvas');
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
    }
  };

  const updateSettings = (updates: Partial<BreederSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...updates }
    }));
  };

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
  };

  // ========== BIRD HANDLERS ==========

  const addBird = async (bird: Bird) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        birds: [...prev.birds, bird]
      }));

      toast.success('Ave adicionada com sucesso!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar ave:', e);
      const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Erro ao adicionar ave: ${errorMsg}`);
      return false;
    }
  };

  const updateBird = async (bird: Bird) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        birds: prev.birds.map(b => b.id === bird.id ? bird : b)
      }));
      toast.success('Ave atualizada com sucesso!');
    } catch (e) {
      console.error('Erro ao atualizar ave:', e);
      toast.error('Erro ao atualizar ave');
    }
  };

  const deleteBird = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
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
    } catch (e) {
      console.error('Erro ao deletar ave:', e);
    }
  };

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

  const permanentlyDeleteBird = async (id: string) => {
    try {
      setState(prev => {
        const deletedBirds = (prev.deletedBirds || []).filter(b => b.id !== id);
        return { ...prev, deletedBirds };
      });
      toast.success('Ave removida permanentemente');
    } catch (e) {
      console.error('Erro ao deletar ave permanentemente:', e);
      toast.error('Erro ao deletar ave permanentemente');
    }
  };

  // ========== PAIR HANDLERS ==========

  const addPair = async (pair: Pair) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        pairs: [...prev.pairs, pair]
      }));
      toast.success('Casal adicionado com sucesso!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar casal:', e);
      toast.error('Erro ao adicionar casal');
      return false;
    }
  };

  const updatePair = async (pair: Pair) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        pairs: prev.pairs.map(p => p.id === pair.id ? pair : p)
      }));
      toast.success('Casal atualizado com sucesso!');
    } catch (e) {
      console.error('Erro ao atualizar casal:', e);
      toast.error('Erro ao atualizar casal');
    }
  };

  const deletePair = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.pairs.find(p => p.id === id);
        if (!found) return prev;
        const deleted = { ...found, deletedAt: new Date().toISOString() };
        return {
          ...prev,
          pairs: prev.pairs.filter(p => p.id !== id),
          deletedPairs: [...(prev.deletedPairs || []), deleted]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar casal:', e);
    }
  };

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

  const permanentlyDeletePair = async (id: string) => {
    try {
      setState(prev => ({
        ...prev,
        deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id)
      }));
      toast.success('Casal removido permanentemente');
    } catch (e) {
      console.error('Erro ao deletar casal permanentemente:', e);
      toast.error('Erro ao deletar casal permanentemente');
    }
  };

  const archivePair = async (id: string) => {
    try {
      setState(prev => {
        const found = prev.pairs.find(p => p.id === id);
        if (!found) return prev;
        return {
          ...prev,
          pairs: prev.pairs.filter(p => p.id !== id),
          archivedPairs: [...(prev.archivedPairs || []), { ...found, archivedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao arquivar casal:', e);
    }
  };

  const unarchivePair = async (id: string) => {
    try {
      setState(prev => {
        const found = (prev.archivedPairs || []).find(p => p.id === id);
        if (!found) return prev;
        return {
          ...prev,
          pairs: [...prev.pairs, { ...found, archivedAt: undefined }],
          archivedPairs: (prev.archivedPairs || []).filter(p => p.id !== id)
        };
      });
    } catch (e) {
      console.error('Erro ao reativar casal:', e);
    }
  };

  const archiveFromTrashToPairs = async (id: string) => {
    try {
      setState(prev => {
        const found = (prev.deletedPairs || []).find(p => p.id === id);
        if (!found) return prev;
        return {
          ...prev,
          deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id),
          archivedPairs: [...(prev.archivedPairs || []), { ...found, deletedAt: undefined, archivedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao mover para arquivo:', e);
    }
  };

  // ========== CLUTCH HANDLERS ==========

  const addClutch = async (clutch: Clutch) => {
    const userId = session?.user?.id;
    if (!userId || !clutch.pairId || !clutch.layDate) {
      console.warn('addClutch validation failed');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        clutches: [...prev.clutches, clutch]
      }));
      toast.success('Postura adicionada!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar postura:', e);
      toast.error('Erro ao adicionar postura');
      return false;
    }
  };

  const updateClutch = async (clutch: Clutch) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        clutches: prev.clutches.map(c => c.id === clutch.id ? clutch : c)
      }));
      toast.success('Postura atualizada!');
    } catch (e) {
      console.error('Erro ao atualizar postura:', e);
      toast.error('Erro ao atualizar postura');
    }
  };

  // ========== MOVEMENT HANDLERS ==========

  const addMovement = async (mov: MovementRecord) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        movements: [mov, ...prev.movements]
      }));

      // Update bird status based on movement type
      const bird = state.birds.find(b => b.id === mov.birdId);
      if (bird) {
        let newStatus = bird.status;
        switch (mov.type) {
          case 'Óbito':
            newStatus = 'Óbito';
            break;
          case 'Venda':
            newStatus = 'Vendido';
            break;
          case 'Doação':
            newStatus = 'Doado';
            break;
        }
        if (newStatus !== bird.status) {
          updateBird({ ...bird, status: newStatus });
        }
      }

      toast.success('Movimentação registrada!');
    } catch (e) {
      console.error('Erro ao adicionar movimentação:', e);
      toast.error('Erro ao adicionar movimentação');
    }
  };

  const updateMovement = async (mov: MovementRecord) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        movements: prev.movements.map(m => m.id === mov.id ? mov : m)
      }));
      toast.success('Movimentação atualizada!');
    } catch (e) {
      console.error('Erro ao atualizar movimentação:', e);
      toast.error('Erro ao atualizar movimentação');
    }
  };

  const deleteMovement = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.movements.find(m => m.id === id);
        if (!found) return prev;
        return {
          ...prev,
          movements: prev.movements.filter(m => m.id !== id),
          deletedMovements: [...(prev.deletedMovements || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar movimentação:', e);
    }
  };

  const restoreMovement = (id: string) =>
    setState(prev => {
      const found = (prev.deletedMovements || []).find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: [...prev.movements, { ...found, deletedAt: undefined }],
        deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id)
      };
    });

  const permanentlyDeleteMovement = (id: string) =>
    setState(prev => ({
      ...prev,
      deletedMovements: (prev.deletedMovements || []).filter(m => m.id !== id)
    }));

  // ========== MEDICATION HANDLERS ==========

  const addMed = async (med: Medication) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        medications: [...prev.medications, med]
      }));
      toast.success('Medicamento adicionado!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar medicamento:', e);
      toast.error('Erro ao adicionar medicamento');
      return false;
    }
  };

  const updateMed = async (med: Medication) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        medications: prev.medications.map(m => m.id === med.id ? med : m)
      }));
      toast.success('Medicamento atualizado!');
    } catch (e) {
      console.error('Erro ao atualizar medicamento:', e);
      toast.error('Erro ao atualizar medicamento');
    }
  };

  const deleteMed = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.medications.find(m => m.id === id);
        if (!found) return prev;
        return {
          ...prev,
          medications: prev.medications.filter(m => m.id !== id),
          deletedMedications: [...(prev.deletedMedications || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar medicamento:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id)
    }));

  // ========== MEDICATION APPLICATION HANDLERS ==========

  const applyMed = async (app: MedicationApplication) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        applications: [...prev.applications, app]
      }));
      toast.success('Aplicação registrada!');
      return true;
    } catch (e) {
      console.error('Erro ao registrar aplicação:', e);
      toast.error('Erro ao registrar aplicação');
      return false;
    }
  };

  const updateApplication = async (app: MedicationApplication) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        applications: prev.applications.map(a => a.id === app.id ? app : a)
      }));
      toast.success('Aplicação atualizada!');
    } catch (e) {
      console.error('Erro ao atualizar aplicação:', e);
      toast.error('Erro ao atualizar aplicação');
    }
  };

  const deleteApplication = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.applications.find(a => a.id === id);
        if (!found) return prev;
        return {
          ...prev,
          applications: prev.applications.filter(a => a.id !== id),
          deletedApplications: [...(prev.deletedApplications || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar aplicação:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id)
    }));

  // ========== TREATMENT HANDLERS ==========

  const addTreatment = async (t: ContinuousTreatment) => {
    const userId = session?.user?.id;
    if (!userId || !t.startDate || !t.frequency || !t.status) {
      console.warn('addTreatment validation failed');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        treatments: [...prev.treatments, t]
      }));
      toast.success('Tratamento adicionado!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar tratamento:', e);
      toast.error('Erro ao adicionar tratamento');
      return false;
    }
  };

  const updateTreatment = async (t: ContinuousTreatment) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        treatments: prev.treatments.map(item => item.id === t.id ? t : item)
      }));
      toast.success('Tratamento atualizado!');
    } catch (e) {
      console.error('Erro ao atualizar tratamento:', e);
      toast.error('Erro ao atualizar tratamento');
    }
  };

  const deleteTreatment = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.treatments.find(t => t.id === id);
        if (!found) return prev;
        return {
          ...prev,
          treatments: prev.treatments.filter(t => t.id !== id),
          deletedTreatments: [...(prev.deletedTreatments || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar tratamento:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id)
    }));

  // ========== TRANSACTION HANDLERS ==========

  const addTransaction = async (t: Transaction) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, t]
      }));
      toast.success('Transação adicionada!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar transação:', e);
      toast.error('Erro ao adicionar transação');
      return false;
    }
  };

  const deleteTransaction = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.transactions.find(tx => tx.id === id);
        if (!found) return prev;
        return {
          ...prev,
          transactions: prev.transactions.filter(tx => tx.id !== id),
          deletedTransactions: [...(prev.deletedTransactions || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar transação:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id)
    }));

  // ========== TASK HANDLERS ==========

  const addTask = async (t: MaintenanceTask) => {
    const userId = session?.user?.id;
    if (!userId || !t.title) {
      console.warn('addTask validation failed');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        tasks: [...prev.tasks, t]
      }));
      toast.success('Tarefa adicionada!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar tarefa:', e);
      toast.error('Erro ao adicionar tarefa');
      return false;
    }
  };

  const updateTask = async (t: MaintenanceTask) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(task => task.id === t.id ? t : task)
      }));
      toast.success('Tarefa atualizada!');
    } catch (e) {
      console.error('Erro ao atualizar tarefa:', e);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const toggleTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === id ? { ...task, isCompleted: !task.isCompleted } : task
      )
    }));
  };

  const deleteTask = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.tasks.find(t => t.id === id);
        if (!found) return prev;
        return {
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== id),
          deletedTasks: [...(prev.deletedTasks || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar tarefa:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id)
    }));

  // ========== TOURNAMENT HANDLERS ==========

  const addEvent = async (e: TournamentEvent) => {
    const userId = session?.user?.id;
    if (!userId || !e.title) {
      console.warn('addEvent validation failed');
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        tournaments: [...prev.tournaments, e]
      }));
      toast.success('Evento adicionado!');
      return true;
    } catch (e) {
      console.error('Erro ao adicionar evento:', e);
      toast.error('Erro ao adicionar evento');
      return false;
    }
  };

  const updateEvent = async (e: TournamentEvent) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        tournaments: prev.tournaments.map(ev => ev.id === e.id ? e : ev)
      }));
      toast.success('Evento atualizado!');
    } catch (e) {
      console.error('Erro ao atualizar evento:', e);
      toast.error('Erro ao atualizar evento');
    }
  };

  const deleteEvent = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState(prev => {
        const found = prev.tournaments.find(ev => ev.id === id);
        if (!found) return prev;
        return {
          ...prev,
          tournaments: prev.tournaments.filter(ev => ev.id !== id),
          deletedTournaments: [...(prev.deletedTournaments || []), { ...found, deletedAt: new Date().toISOString() }]
        };
      });
    } catch (e) {
      console.error('Erro ao deletar evento:', e);
    }
  };

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
    setState(prev => ({
      ...prev,
      deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id)
    }));

  // ========== LOGOUT HANDLER ==========

  const handleLogout = async () => {
    try {
      const currentUserId = session?.user?.id;
      clearAllState(currentUserId);
      clearAllCachedStates();

      // Sign out from Firebase
      await signOut(auth);

      // Redirect to login
      try {
        window.location.replace('/');
      } catch {
        /* ignore */
      }
    } catch (err: any) {
      console.warn('Erro ao deslogar:', err);
      toast.error('Erro ao deslogar');
    }
  };

  // ========== RENDER CONTENT ==========
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            state={state}
            updateSettings={updateSettings}
            onSave={persistSettings}
            navigateTo={navigateTo}
            isAdmin={isAdmin}
          />
        );
      case 'birds':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            addMovement={addMovement}
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
            addMovement={addMovement}
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
            archivePair={archivePair}
            unarchivePair={unarchivePair}
            archiveFromTrashToPairs={archiveFromTrashToPairs}
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
      case 'settings':
        return (
          <SettingsManager
            settings={state.settings}
            updateSettings={updateSettings}
            onSave={persistSettings}
            isAdmin={isAdmin}
          />
        );
      case 'help':
        return <HelpCenter />;
      case 'documents':
        return <DocumentsManager settings={state.settings} updateSettings={updateSettings} onSave={persistSettings} />;
      case 'verification':
        return <BirdVerification birdId="" />;
      case 'analytics':
        return <VerificationAnalytics />;
      default:
        return (
          <Dashboard
            state={state}
            updateSettings={updateSettings}
            onSave={persistSettings}
            navigateTo={navigateTo}
            isAdmin={isAdmin}
          />
        );
    }
  };

  if (!session) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50" />}>
        <Auth onLogin={(settings) => {
          if (settings) {
            setState(prev => ({
              ...prev,
              settings: { ...prev.settings, ...settings }
            }));
          }
        }} />
        <Toaster position="bottom-center" />
      </Suspense>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4 text-lg font-semibold text-gray-700">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Toaster position="bottom-center" />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateTo}
        onLogout={handleLogout}
        breederName={state.settings?.breederName || 'Criador'}
        plan={state.settings?.plan || 'Básico'}
        trialEndDate={state.settings?.trialEndDate}
        isAdmin={isAdmin}
      />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
          {renderContent()}
        </Suspense>
      </main>
    </div>
  );
};

export default App;









































