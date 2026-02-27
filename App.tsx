/* eslint-disable @typescript-eslint/no-explicit-any */
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
  RingBatch,
  RingItem,
} from './types';
import { Mail, X, Zap } from 'lucide-react';
import { INITIAL_SETTINGS } from './constants';
import { hasActiveProPlan } from './lib/subscription';
import { logError, logWarning } from './lib/logger';
import Sidebar from './components/Sidebar';
import PageHeader from './components/ui/PageHeader';
import PrimaryButton from './components/ui/PrimaryButton';
import SecondaryButton from './components/ui/SecondaryButton';
import Footer from './components/ui/Footer';
import ContactModal from './components/ui/ContactModal';
import PlanComparative from './components/PlanComparative';

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
const TournamentManager = lazy(() => import('./pages/TournamentManager'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const DocumentsManager = lazy(() => import('./pages/DocumentsManager'));
const RingsManager = lazy(() => import('./pages/RingsManager'));
const Auth = lazy(() => import('./pages/Auth'));
const BirdVerification = lazy(() => import('./pages/BirdVerification'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const PublicStatistics = lazy(() => import('./pages/PublicStatistics'));
const CommunityInbox = lazy(() => import('./pages/CommunityInbox'));
const PublicTournaments = lazy(() => import('./pages/PublicTournaments'));
const TournamentResults = lazy(() => import('./pages/TournamentResults'));
const PublicBirds = lazy(() => import('./pages/PublicBirds'));
const TopBreedersPage = lazy(() => import('./pages/TopBreedersPage'));
const RecentBirdsPage = lazy(() => import('./pages/RecentBirdsPage'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminCommunityModeration = lazy(() => import('./pages/Admin/CommunityModeration'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const LibraryCenter = lazy(() => import('./pages/LibraryCenter'));
const LabelPreview = lazy(() => import('./pages/LabelPreview'));

// Firebase auth
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

// Bloquear DevTools em produção
if (import.meta.env.PROD) {
  // Bloqueia F12, Ctrl+Shift+I, Ctrl+Shift+C, Ctrl+Shift+J
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.shiftKey && e.key === 'K')
    ) {
      e.preventDefault();
    }
  });

  // Bloqueia right-click (context menu)
  document.addEventListener('contextmenu', (e) => {
    if (e.target instanceof Element && !e.target.closest('[data-allow-context-menu]')) {
      e.preventDefault();
    }
  });

  // Detecta abertura de DevTools por mudanças no tamanho da window
  let lastWidth = window.innerWidth;
  let lastHeight = window.innerHeight;
  setInterval(() => {
    if (window.innerWidth - lastWidth > 160 || lastHeight - window.innerHeight > 160) {
      // DevTools foi aberto
      document.body.innerHTML = '';
    }
  }, 500);
}

// Firestore services
import {
  getBirds,
  addBird as addBirdToFirestore,
  updateBird as updateBirdInFirestore,
  getPairs,
  addPair as addPairToFirestore,
  updatePair as updatePairInFirestore,
  deletePair as deletePairInFirestore,
  permanentlyDeletePairInFirestore,
  getMovements,
  addMovementInFirestore,
  updateMovementInFirestore,
  deleteMovementInFirestore,
  permanentlyDeleteMovementInFirestore,
  getTransactions,
  getDeletedTransactions,
  saveTransactionToFirestore,
  deleteTransactionInFirestore,
  permanentlyDeleteTransactionInFirestore,
  getMedications,
  addMedicationInFirestore,
  updateMedicationInFirestore,
  deleteMedicationInFirestore,
  permanentlyDeleteMedicationInFirestore,
  getMedicationCatalog,
  getTasks,
  addTaskInFirestore,
  updateTaskInFirestore,
  deleteTaskInFirestore,
  permanentlyDeleteTaskInFirestore,
  getTournaments,
  getDeletedTournaments,
  addEventInFirestore,
  updateEventInFirestore,
  deleteEventInFirestore,
  permanentlyDeleteEventInFirestore,
  getSettings,
  getApplications,
  addApplicationInFirestore,
  updateApplicationInFirestore,
  deleteApplicationInFirestore,
  restoreApplicationInFirestore,
  permanentlyDeleteApplicationInFirestore,
  getClutches,
  addClutchInFirestore,
  updateClutchInFirestore,
  getTreatments,
  addTreatmentInFirestore,
  updateTreatmentInFirestore,
  deleteTreatmentInFirestore,
  restoreTreatmentInFirestore,
  permanentlyDeleteTreatmentInFirestore,
  saveSettings,
  syncPublicBirdsForUser,
  checkIfUserIsAdmin,
  checkIfUserIsAdminOnly,
  getRingBatches,
  getRings,
  addRingBatchInFirestore,
  addRingItemsInFirestore,
  updateRingItemInFirestore,
  deleteRingItemInFirestore,
} from './services/firestoreService';
import { db, functions } from './lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { initializeNewUser, sendVerificationEmail } from './services/authService';

const STORAGE_KEY = 'avigestao_state_v2';
const storageKeyForUser = (userId?: string) => (userId ? `${STORAGE_KEY}::${userId}` : STORAGE_KEY);

// adminOnly state will be created inside the App component

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
        settings: { ...defaultState.settings, ...(data.settings || {}) },
      },
      hasCache: true,
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
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore cache cleanup errors */
  }
};

const defaultState: AppState = {
  birds: [],
  deletedBirds: [],
  pairs: [],
  archivedPairs: [],
  deletedPairs: [],
  clutches: [],
  medications: [],
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
  ringBatches: [],
  rings: [],
  settings: INITIAL_SETTINGS,
};

const normalizeTrialEndDate = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.getTime() >= Date.now() ? parsed.toISOString().split('T')[0] : undefined;
};

const getTabFromPath = (path: string) => {
  const internalPath = path.substring(1); // Remove leading /
  const validInternalPages = [
    'birds',
    'breeding',
    'meds',
    'movements',
    'finance',
    'tasks',
    'tournaments',
    'tournament-manager',
    'settings',
    'help',
    'documents',
    'library',
    'admin-users',
    'admin-community-moderation',
    'about',
    'privacy',
    'terms',
    'rings',
    'public-tournaments',
    'tournament-results',
    'statistics',
    'community-inbox',
    'public-birds',
    'top-breeders',
    'recent-birds',
    'label-preview',
    'verification',
    'analytics',
  ];

  // Verifica se o caminho atual é válido
  if (validInternalPages.includes(internalPath)) {
    return internalPath;
  }

  // Caso contrário, retorna dashboard como padrão
  return 'dashboard';
};

const getPathFromTab = (tab: string) => {
  switch (tab) {
    case 'about':
      return '/about';
    case 'privacy':
      return '/privacy';
    case 'terms':
      return '/terms';
    case 'rings':
      return '/rings';
    case 'public-tournaments':
      return '/public-tournaments';
    case 'tournament-results':
      return '/tournament-results';
    case 'statistics':
      return '/statistics';
    case 'community-inbox':
      return '/community-inbox';
    case 'public-birds':
      return '/public-birds';
    case 'top-breeders':
      return '/top-breeders';
    case 'recent-birds':
      return '/recent-birds';
    case 'verification':
      return '/verification';
    case 'analytics':
      return '/analytics';
    case 'dashboard':
      return '/';
    default:
      // Internal pages use simple /pagename path
      return '/' + tab;
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    return getTabFromPath(window.location.pathname);
  });
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [session, setSession] = useState<any>(null);
  const [state, setState] = useState<AppState>(defaultState);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [wantsWelcomeEmail, setWantsWelcomeEmail] = useState(true);
  const [isSendingWelcomeEmail, setIsSendingWelcomeEmail] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Verifica se é uma rota pública (verificação de pássaro)
  const isPublicRoute = React.useMemo(() => {
    const pathname = window.location.pathname;
    return pathname.startsWith('/bird/');
  }, []);

  const birdIdFromUrl = React.useMemo(() => {
    const pathname = window.location.pathname;
    const match = pathname.match(/^\/bird\/(.+?)$/);
    return match ? match[1] : null;
  }, []);

  // Wrapper to persist settings, returns Promise<boolean> for BirdManager
  const handleSaveSettings = async (settings: BreederSettings): Promise<boolean> => {
    try {
      await persistSettings(settings);
      return true;
    } catch {
      return false;
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [, setAuthError] = useState<string | null>(null);
  const [hasHydratedOnce, setHasHydratedOnce] = useState(false);

  const lastValidSessionRef = useRef<any>(null);
  const loadedTabsRef = useRef(new Set<string>());
  const isInitialSessionLoadRef = useRef(true);
  const auth = getAuth();

  const clearAllState = (userId?: string) => {
    lastValidSessionRef.current = null;
    loadedTabsRef.current = new Set();
    setSession(null);
    setIsAdmin(false);
    setState(defaultState);
    setHasHydratedOnce(false);
    setIsEmailVerificationPending(false);
    setVerificationEmail(null);
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

  // Sincronizar com URL do navegador no primeiro carregamento
  useEffect(() => {
    const urlTab = getTabFromPath(window.location.pathname);
    if (activeTab !== urlTab) {
      setActiveTab(urlTab);
    }
  }, []);

  // Persist state + theme colors
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setActiveTab(getTabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  // (theme handling removed — app uses default light theme)

  useEffect(() => {
    const handleOpenContact = () => setIsContactOpen(true);
    window.addEventListener('open-contact-modal', handleOpenContact);
    return () => window.removeEventListener('open-contact-modal', handleOpenContact);
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setUnreadInboxCount(0);
      return;
    }

    const messagesRef = collection(db, 'community_messages');
    const q = query(messagesRef, where('toUserId', '==', userId), where('read', '==', false));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUnreadInboxCount(snap.size);
      },
      (err) => {
        logError('Erro ao carregar contagem de mensagens não lidas', err);
        setUnreadInboxCount(0);
      },
    );
    return () => unsub();
  }, [session?.user?.id]);

  // Firebase Authentication
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      try {
        if (firebaseUser) {
          if (!firebaseUser.emailVerified) {
            // Allow admins to bypass email verification so portal admins can sign in
            // without verifying email. Uses `checkIfUserIsAdmin` helper from firestoreService.
            const isAdminUser = await checkIfUserIsAdmin(firebaseUser.uid).catch(() => false);
            if (!isAdminUser) {
              setIsEmailVerificationPending(true);
              setVerificationEmail(firebaseUser.email ?? null);
              setSession(null);
              setIsLoading(false);
              return;
            }
            // Caso contrário, continua como verificado
          }

          setIsEmailVerificationPending(false);
          setVerificationEmail(null);
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
            access_token: await firebaseUser.getIdToken(),
          };

          await handleSession(newSession);
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

  const handleSession = async (newSession: any) => {
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
      isInitialSessionLoadRef.current = true;
    }

    lastValidSessionRef.current = newSession;
    setSession(newSession);
    setIsEmailVerificationPending(false);
    setVerificationEmail(null);

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
        
        // Verificar se o usuário é admin
        const adminStatus = await checkIfUserIsAdmin(newUserId);
        setIsAdmin(adminStatus);
        // Verificar se o usuário é adminOnly (conta apenas administrativa)
        const adminOnlyStatus = await checkIfUserIsAdminOnly(newUserId);
        setIsAdminOnly(adminOnlyStatus);
        
        const [
          birds,
          pairs,
          movements,
          transactions,
          deletedTransactions,
          medications,
          applications,
          clutches,
          treatments,
          tasks,
          tournaments,
          deletedTournaments,
          medicationCatalog,
          ringBatches,
          rings,
        ] = await Promise.all([
          getBirds(newUserId),
          getPairs(newUserId),
          getMovements(newUserId),
          getTransactions(newUserId),
          getDeletedTransactions(newUserId),
          getMedications(newUserId),
          getApplications(newUserId),
          getClutches(newUserId),
          getTreatments(newUserId),
          getTasks(newUserId),
          getTournaments(newUserId),
          getDeletedTournaments(newUserId),
          getMedicationCatalog(),
          getRingBatches(newUserId),
          getRings(newUserId),
        ]);

        let settings = await getSettings(newUserId);
        const shouldInitTrial =
          !adminStatus &&
          !adminOnlyStatus &&
          !settings?.trialEndDate &&
          !settings?.plan;
        if (shouldInitTrial && auth.currentUser) {
          const initResult = await initializeNewUser(auth.currentUser);
          if (initResult.error) {
            logWarning('Falha ao inicializar novo usuário:', initResult.error);
          }
          settings = await getSettings(newUserId);
        }

        syncPublicBirdsForUser(newUserId, birds);

        const mergedSettings: BreederSettings = {
          ...defaultState.settings,
          ...(settings || {}),
          userId: newUserId,
          trialEndDate: normalizeTrialEndDate(settings?.trialEndDate),
        };

        // Separar movimentos normais dos deletados
        // IMPORTANTE: deletedAt é um Firestore Timestamp, que é um objeto com método toDate()
        const normalMovements =
          movements?.filter((m) => {
            if (!m.deletedAt) return true; // Sem deletedAt = normal
            // Verifica se tem o método toDate (indicador de Firestore Timestamp)
            if (typeof (m.deletedAt as any).toDate === 'function') {
              return false; // É um Timestamp válido = deletado
            }
            return true; // Valor inválido = tratar como normal
          }) || [];

        const deletedMovements =
          movements?.filter((m) => {
            if (!m.deletedAt) return false; // Sem deletedAt = não deletado
            // Verifica se tem o método toDate (indicador de Firestore Timestamp)
            if (typeof (m.deletedAt as any).toDate === 'function') {
              return true; // É um Timestamp válido = deletado
            }
            return false; // Valor inválido = não deletado
          }) || [];

        const { activePairs, archivedPairs, deletedPairs } = splitPairsByStatus(pairs || []);

        setState({
          ...defaultState,
          birds: birds || [],
          pairs: activePairs,
          archivedPairs,
          deletedPairs,
          movements: normalMovements,
          deletedMovements: deletedMovements,
          transactions: transactions || [],
          deletedTransactions: deletedTransactions || [],
          settings: mergedSettings,
          medications: medications || [],
          applications: applications || [],
          medicationCatalog: medicationCatalog || [],
          clutches: clutches || [],
          treatments: treatments || [],
          tasks: tasks || [],
          tournaments: tournaments || [],
          deletedTournaments: deletedTournaments || [],
          ringBatches: ringBatches || [],
          rings: rings || [],
        });

        setHasHydratedOnce(true);
        isInitialSessionLoadRef.current = false;
      } catch (err: any) {
        logError('Erro ao carregar dados:', err);
        setAuthError(err?.message || 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const persistSettings = async (settings: BreederSettings) => {
    const userId = session?.user?.id;
    if (!userId) {
      console.warn('[persistSettings] Usuário não autenticado, não é possível salvar');
      return;
    }

    try {
      console.log('[persistSettings] Salvando configurações...', {
        sispassNumber: settings.sispassNumber,
        renewalDate: settings.renewalDate
      });
      await saveSettings(userId, settings);
      setState((prev: any) => ({ ...prev, settings }));
      // Só mostrar toast se não for alteração automática de preferências de visualização
      if (!(settings as any)._autoViewPrefUpdate) {
        toast.success('Configurações salvas');
      }
      console.log('[persistSettings] Configurações salvas com sucesso!');
    } catch (err: any) {
      logError('Erro ao salvar configurações:', err);
      toast.error('Erro ao salvar configurações');
      console.error('[persistSettings] Erro:', err);
    }
  };

  const updateSettings = (updates: Partial<BreederSettings>) => {
    setState((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, ...updates },
    }));
  };

  const userNavigatedRef = useRef(false);

  const navigateTo = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const nextPath = getPathFromTab(tab);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    }
    if (!session?.user?.id) return;
    userNavigatedRef.current = true;
    const updatedSettings = { ...state.settings, lastActiveTab: tab, _autoViewPrefUpdate: true };
    updateSettings(updatedSettings);
    persistSettings(updatedSettings);
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Se for o primeiro carregamento da sessão, respeitar a URL e não restaurar lastActiveTab
    if (isInitialSessionLoadRef.current) {
      isInitialSessionLoadRef.current = false;
      return;
    }
    
    if (userNavigatedRef.current) {
      userNavigatedRef.current = false;
      return;
    }
    
    const publicTabs = new Set([
      'verification',
      'public-tournaments',
      'tournament-results',
      'statistics',
      'public-birds',
      'about',
      'privacy',
      'terms',
    ]);
    if (publicTabs.has(activeTab)) return;
    
    // IMPORTANTE: Se a URL atual não é '/' (dashboard), NUNCA restaurar lastActiveTab
    // A URL é a fonte de verdade quando é específica
    const currentPath = window.location.pathname;
    
    if (currentPath !== '/' && currentPath !== '') {
      return;
    }
    
    // Só restaurar lastActiveTab se estiver em dashboard (/)
    if (state.settings?.lastActiveTab && state.settings.lastActiveTab !== activeTab) {
      setActiveTab(state.settings.lastActiveTab);
    }
  }, [activeTab, session?.user?.id, state.settings?.lastActiveTab]);

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      const { error } = await sendVerificationEmail(auth.currentUser ?? undefined);
      if (error) {
        toast.error('Erro ao reenviar o e-mail de verificação.');
        return;
      }
      toast.success('E-mail de verificação reenviado com sucesso!');
    } catch (err) {
      console.error('Erro ao reenviar e-mail de verificação:', err);
      toast.error('Erro ao reenviar e-mail de verificação.');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSendWelcomeEmailIfNeeded = async () => {
    if (!wantsWelcomeEmail) return;
    setIsSendingWelcomeEmail(true);
    try {
      const sendWelcome = httpsCallable(functions, 'sendWelcomeEmailIfNeeded');
      await sendWelcome({ optIn: true });
    } catch (error) {
      console.error('Erro ao enviar e-mail de boas-vindas:', error);
    } finally {
      setIsSendingWelcomeEmail(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('Usuário não encontrado');
        return;
      }

      await currentUser.reload();

      if (!currentUser.emailVerified) {
        toast.error('E-mail ainda não verificado. Confira sua caixa de entrada.');
        return;
      }

      const newSession = {
        user: { id: currentUser.uid, email: currentUser.email },
        access_token: await currentUser.getIdToken(),
      };

      await handleSession(newSession);
      await handleSendWelcomeEmailIfNeeded();
    } catch (error) {
      console.error('Erro ao verificar e-mail:', error);
      toast.error('Erro ao verificar e-mail');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // ========== BIRD HANDLERS ==========

  const addBird = async (bird: Bird) => {
    const userId = session?.user?.id;
    console.log('addBird chamado:', { userId, birdName: bird.name });
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Validar acesso Pro (plano ou trial)
      const hasProAccess = hasActiveProPlan(state.settings);
      if (!hasProAccess) {
        // Verificar se o trial expirou ou nunca foi iniciado
        const trialEndDate = state.settings?.trialEndDate ? new Date(state.settings.trialEndDate) : null;
        const now = new Date();
        
        if (trialEndDate && trialEndDate <= now) {
          toast.error('🔒 Seu período de trial expirou. Para continuar adicionando aves, assine o plano Profissional.');
        } else {
          toast.error('📦 No plano Básico, você pode ter no máximo 5 aves. Assine o plano Profissional para criar ilimitadas aves.');
        }
        return false;
      }

      // Salvar no Firestore primeiro
      const birdData = { ...bird };
      delete (birdData as any).id;
      // Garantir que breederId está definido
      if (!birdData.breederId) {
        birdData.breederId = userId;
      }
      console.log('Salvando no Firestore...', birdData);
      const newId = await addBirdToFirestore(userId, birdData);
      console.log('ID retornado do Firestore:', newId);

      if (!newId) {
        throw new Error('Falha ao salvar no banco de dados');
      }

      // Atualizar estado local com o ID do Firestore
      const birdWithId = { ...bird, id: newId };
      setState((prev: any) => ({
        ...prev,
        birds: [...prev.birds, birdWithId],
      }));

      // Recarregar do Firestore para garantir sincronização
      console.log('[addBird] Recarregando dados do Firestore após sucesso');
      const reloadedBirds = await getBirds(userId);
      if (reloadedBirds) {
        setState((prev: any) => ({
          ...prev,
          birds: reloadedBirds,
        }));
        const addedBird = reloadedBirds.find((b: any) => b.id === newId);
        console.log('[addBird] Ave adicionada e confirmada no Firestore:', {
          id: addedBird?.id,
          name: addedBird?.name,
          sex: addedBird?.sex,
          status: addedBird?.status,
        });
      }

      toast.success('Ave adicionada com sucesso!');
      return true;
    } catch (e) {
      logError('Erro ao adicionar ave:', e);
      const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Erro ao adicionar ave: ${errorMsg}`);
      return false;
    }
  };

  const updateBird = async (bird: Bird) => {
    const userId = session?.user?.id;
    console.log('updateBird chamado:', { userId, birdId: bird.id, birdName: bird.name });
    if (!userId) return false;

    try {
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...birdData } = bird as any;

      // Atualizar estado local PRIMEIRO para UI reagir imediatamente
      const birdBefore = state.birds.find((b) => b.id === bird.id);
      console.log('[updateBird] Estado ANTES:', { id: birdBefore?.id, sex: birdBefore?.sex, sexing: birdBefore?.sexing });
      
      setState((prev) => ({
        ...prev,
        birds: prev.birds.map((b) => (b.id === bird.id ? { ...b, ...bird } : b)),
      }));

      // Depois salvar no Firestore
      console.log('Atualizando no Firestore...', bird);
      const success = await updateBirdInFirestore(userId, bird.id, birdData);
      console.log('Resultado da atualização no Firestore:', success);

      if (!success) {
        // Se falhar, reverter o estado local
        setState((prev) => ({
          ...prev,
          birds: prev.birds.map((b) =>
            b.id === bird.id ? prev.birds.find((ob) => ob.id === bird.id) || b : b,
          ),
        }));
        throw new Error('Falha ao atualizar no banco de dados');
      }

      // Recarregar dados do Firestore após update bem-sucedido para garantir consistência
      console.log('[updateBird] Recarregando dados do Firestore após update bem-sucedido');
      const reloadedBirds = await getBirds(userId);
      if (reloadedBirds) {
        setState((prev) => ({
          ...prev,
          birds: reloadedBirds,
        }));
        const birdAfter = reloadedBirds.find((b) => b.id === bird.id);
        console.log('[updateBird] Estado DEPOIS (após reload do Firestore):', { 
          id: birdAfter?.id, 
          sex: birdAfter?.sex, 
          sexing: birdAfter?.sexing,
          sentDate: birdAfter?.sexing?.sentDate,
          laboratory: birdAfter?.sexing?.laboratory,
        });
      }

      toast.success('Ave atualizada com sucesso!');
      return success;
    } catch (e) {
      toast.error('Erro ao atualizar ave!');
      console.error(e);
      return false;
    }
  };

  const deleteBird = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Marcar como deletada no Firestore
      const bird = state.birds.find((b) => b.id === id);
      if (bird) {
        await updateBirdInFirestore(userId, id, { ...bird, deletedAt: new Date().toISOString() });
      }

      // Atualizar estado local
      setState((prev) => {
        const found = prev.birds.find((b) => b.id === id);
        if (!found) return prev;
        const deleted = { ...found, deletedAt: new Date().toISOString() };
        return {
          ...prev,
          birds: prev.birds.filter((b) => b.id !== id),
          deletedBirds: [...(prev.deletedBirds || []), deleted],
        };
      });
    } catch (e) {
      logError('Erro ao deletar ave:', e);
      toast.error('Erro ao deletar ave');
    }
  };

  const restoreBird = (id: string) =>
    setState((prev) => {
      const found = (prev.deletedBirds || []).find((b) => b.id === id);
      if (!found) return prev;
      return {
        ...prev,
        birds: [...prev.birds, { ...found, deletedAt: undefined }],
        deletedBirds: (prev.deletedBirds || []).filter((b) => b.id !== id),
      };
    });

  const permanentlyDeleteBird = async (id: string) => {
    try {
      setState((prev) => {
        const deletedBirds = (prev.deletedBirds || []).filter((b) => b.id !== id);
        return { ...prev, deletedBirds };
      });
      toast.success('Ave removida permanentemente');
    } catch (e) {
      logError('Erro ao deletar ave permanentemente:', e);
      toast.error('Erro ao deletar ave permanentemente');
    }
  };

  // ========== RING HANDLERS ==========

  const addRingBatch = async (batch: Omit<RingBatch, 'id'>, items: Omit<RingItem, 'id'>[]) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const batchId = await addRingBatchInFirestore(userId, batch);
      if (!batchId) {
        toast.error('Falha ao salvar lote de anilhas');
        return false;
      }

      const batchWithId: RingBatch = { ...batch, id: batchId } as RingBatch;
      let createdItems: RingItem[] = [];

      let itemsToCreate = items;
      if (!itemsToCreate.length && typeof batch.quantity === 'number') {
        const count = Math.max(0, Math.floor(batch.quantity));
        const width = Math.max(3, count.toString().length);
        itemsToCreate = Array.from({ length: count }, (_, index) => {
          const sequence = (index + 1).toString().padStart(width, '0');
          return {
            code: `${batchId.slice(0, 6)}-${sequence}`,
            number: sequence,
            year: batch.year,
            state: batch.state,
            color: batch.color,
            species: batch.species,
            sizeMm: batch.sizeMm,
            personalization: batch.personalization,
            status: 'estoque',
          } as Omit<RingItem, 'id'>;
        });
      }

      if (itemsToCreate.length) {
        const itemsWithBatch = itemsToCreate.map((item) => ({ ...item, batchId }));
        const ids = await addRingItemsInFirestore(userId, itemsWithBatch);
        createdItems = itemsWithBatch.map((item, index) => ({
          ...item,
          id: ids[index],
        }));
      }

      // Recarregar do Firestore para garantir sincronização
      const [reloadedBatches, reloadedRings] = await Promise.all([
        getRingBatches(userId),
        getRings(userId),
      ]);

      setState((prev) => ({
        ...prev,
        ringBatches: reloadedBatches || [],
        rings: reloadedRings || [],
      }));

      toast.success('Lote de anilhas adicionado');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar lote de anilhas:', error);
      toast.error('Erro ao adicionar lote de anilhas');
      return false;
    }
  };

  const addRingItem = async (item: Omit<RingItem, 'id'>) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const ids = await addRingItemsInFirestore(userId, [item]);
      const id = ids[0];
      if (!id) {
        toast.error('Falha ao salvar anilha');
        return false;
      }

      // Recarregar do Firestore para garantir sincronização
      const reloadedRings = await getRings(userId);
      setState((prev) => ({
        ...prev,
        rings: reloadedRings || [],
      }));
      toast.success('Anilha adicionada');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar anilha:', error);
      toast.error('Erro ao adicionar anilha');
      return false;
    }
  };

  const updateRingItem = async (ringId: string, updates: Partial<RingItem>) => {
    const userId = session?.user?.id;
    if (!userId) return false;

    const previous = state.rings || [];
    setState((prev) => ({
      ...prev,
      rings: (prev.rings || []).map((ring) =>
        ring.id === ringId ? { ...ring, ...updates } : ring,
      ),
    }));

    try {
      const success = await updateRingItemInFirestore(userId, ringId, updates);
      if (!success) {
        setState((prev) => ({ ...prev, rings: previous }));
        toast.error('Falha ao atualizar anilha');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar anilha:', error);
      setState((prev) => ({ ...prev, rings: previous }));
      toast.error('Erro ao atualizar anilha');
      return false;
    }
  };

  const deleteRingItem = async (ringId: string) => {
    const userId = session?.user?.id;
    if (!userId) return false;

    const previous = state.rings || [];
    setState((prev) => ({
      ...prev,
      rings: (prev.rings || []).filter((ring) => ring.id !== ringId),
    }));

    try {
      const success = await deleteRingItemInFirestore(userId, ringId);
      if (!success) {
        setState((prev) => ({ ...prev, rings: previous }));
        toast.error('Falha ao excluir anilha');
        return false;
      }
      toast.success('Anilha excluida');
      return true;
    } catch (error) {
      console.error('Erro ao excluir anilha:', error);
      setState((prev) => ({ ...prev, rings: previous }));
      toast.error('Erro ao excluir anilha');
      return false;
    }
  };

  // ========== PAIR HANDLERS ==========

  const splitPairsByStatus = (pairs: Pair[]) => {
    const isTimestamp = (value: unknown) =>
      !!value && typeof (value as { toDate?: () => Date }).toDate === 'function';

    const hasValue = (value: unknown) => {
      if (!value) return false;
      if (isTimestamp(value)) return true;
      if (typeof value === 'string' && value.length > 0) return true;
      return false;
    };

    const isDeleted = (pair: Pair) =>
      hasValue((pair as any).deletedAt);

    const isArchived = (pair: Pair) =>
      !isDeleted(pair) && hasValue((pair as any).archivedAt);

    const deletedPairs = pairs.filter(isDeleted);
    const archivedPairs = pairs.filter(isArchived);
    const activePairs = pairs.filter((p) => !isDeleted(p) && !isArchived(p));

    return { activePairs, archivedPairs, deletedPairs };
  };

  const reloadPairsFromFirestore = async (userId: string) => {
    const reloadedPairs = await getPairs(userId);
    if (reloadedPairs) {
      const { activePairs, archivedPairs, deletedPairs } = splitPairsByStatus(reloadedPairs);
      setState((prev) => ({
        ...prev,
        pairs: activePairs,
        archivedPairs,
        deletedPairs,
      }));
    }
  };

  const addPair = async (pair: Pair) => {
    const userId = session?.user?.id;
    console.log('addPair chamado:', { userId, pairId: pair.id });
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Salvar no Firestore primeiro
      const pairData = { ...pair };
      delete (pairData as any).id;
      console.log('Salvando casal no Firestore...', pairData);
      const newId = await addPairToFirestore(userId, pairData);
      console.log('ID retornado do Firestore:', newId);

      if (!newId) {
        throw new Error('Falha ao salvar no banco de dados');
      }

      // Atualizar estado local com o ID do Firestore
      const pairWithId = { ...pair, id: newId };
      setState((prev) => ({
        ...prev,
        pairs: [...prev.pairs, pairWithId],
      }));

      // Recarregar do Firestore para garantir sincronização
      console.log('[addPair] Recarregando casais do Firestore após sucesso');
      await reloadPairsFromFirestore(userId);
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
      // Remover campos de controle de status antes de salvar
      const { archivedAt, deletedAt, ...pairData } = pair as any;
      
      // Salvar no Firestore primeiro
      const success = await updatePairInFirestore(userId, pair.id, pairData);

      if (!success) {
        throw new Error('Falha ao atualizar no banco de dados');
      }

      // Atualizar estado local
      setState((prev) => ({
        ...prev,
        pairs: prev.pairs.map((p) => (p.id === pair.id ? pair : p)),
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
      const success = await deletePairInFirestore(userId, id);
      if (!success) throw new Error('Falha ao deletar casal no banco de dados');
      await reloadPairsFromFirestore(userId);
    } catch (e) {
      console.error('Erro ao deletar casal:', e);
    }
  };

  const restorePair = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const success = await updatePairInFirestore(userId, id, {
        deletedAt: undefined,
        archivedAt: undefined,
      });
      if (!success) throw new Error('Falha ao restaurar casal no banco de dados');
      await reloadPairsFromFirestore(userId);
    } catch (e) {
      console.error('Erro ao restaurar casal:', e);
    }
  };

  const permanentlyDeletePair = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const success = await permanentlyDeletePairInFirestore(userId, id);
      if (!success) throw new Error('Falha ao deletar casal permanentemente');
      await reloadPairsFromFirestore(userId);
      toast.success('Casal removido permanentemente');
    } catch (e) {
      logError('Erro ao deletar casal permanentemente:', e);
      toast.error('Erro ao deletar casal permanentemente');
    }
  };

  const archivePair = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const success = await updatePairInFirestore(userId, id, {
        archivedAt: new Date().toISOString(),
      });
      if (!success) throw new Error('Falha ao arquivar casal no banco de dados');
      await reloadPairsFromFirestore(userId);
    } catch (e) {
      logError('Erro ao arquivar casal:', e);
    }
  };

  const unarchivePair = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const success = await updatePairInFirestore(userId, id, {
        archivedAt: undefined,
      });
      if (!success) throw new Error('Falha ao reativar casal no banco de dados');
      await reloadPairsFromFirestore(userId);
    } catch (e) {
      console.error('Erro ao reativar casal:', e);
    }
  };

  const archiveFromTrashToPairs = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const success = await updatePairInFirestore(userId, id, {
        deletedAt: undefined,
        archivedAt: new Date().toISOString(),
      });
      if (!success) throw new Error('Falha ao mover casal para histórico');
      await reloadPairsFromFirestore(userId);
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
      // Salvar no Firestore primeiro
      const savedId = await addClutchInFirestore(userId, clutch);
      if (!savedId) {
        throw new Error('Falha ao salvar postura no banco de dados');
      }

      // Atualizar estado local com o ID confirmado
      setState((prev) => ({
        ...prev,
        clutches: [...prev.clutches, { ...clutch, id: savedId }],
      }));

      // Recarregar do Firestore para garantir sincronização
      const reloadedClutches = await getClutches(userId);
      if (reloadedClutches) {
        setState((prev) => ({
          ...prev,
          clutches: reloadedClutches,
        }));
      }
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
      const success = await updateClutchInFirestore(userId, clutch.id, clutch);
      if (!success) {
        throw new Error('Falha ao atualizar postura no banco de dados');
      }

      setState((prev) => ({
        ...prev,
        clutches: prev.clutches.map((c) => (c.id === clutch.id ? clutch : c)),
      }));

      // Recarregar do Firestore para garantir sincronização
      const reloadedClutches = await getClutches(userId);
      if (reloadedClutches) {
        setState((prev) => ({
          ...prev,
          clutches: reloadedClutches,
        }));
      }
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
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        movements: [mov, ...prev.movements],
      }));

      // Depois salvar no Firestore
      await addMovementInFirestore(userId, mov);

      // Update bird status based on movement type
      const bird = state.birds.find((b) => b.id === mov.birdId);
      if (bird) {
        let newStatus = bird.status;
        let shouldMarkIbamaPendente = false;

        switch (mov.type) {
          case 'Óbito':
            newStatus = 'Óbito';
            shouldMarkIbamaPendente = true;
            break;
          case 'Doação':
            newStatus = 'Doado';
            shouldMarkIbamaPendente = true;
            break;
          case 'Fuga':
            shouldMarkIbamaPendente = true;
            break;
          case 'Transferência':
            shouldMarkIbamaPendente = true;
            break;
        }

        if (newStatus !== bird.status) {
          // NÃO passar ibamaBaixaData para não sobrescrever deleteField()
          // SEMPRE marcar como pendente IBAMA se é um movimento que requer
          const birdWithoutIbama = { ...bird } as any;
          delete birdWithoutIbama.ibamaBaixaData;
          updateBird({
            ...birdWithoutIbama,
            status: newStatus,
            ibamaBaixaPendente: shouldMarkIbamaPendente,
          });
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...movData } = mov as any;

      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        movements: prev.movements.map((m) => (m.id === mov.id ? mov : m)),
      }));

      // Depois salvar no Firestore
      await updateMovementInFirestore(userId, mov.id, movData);

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
      console.log('[deleteMovement] Iniciando deletar movimento:', id);
      console.log('[deleteMovement] Total de movements:', state.movements.length);
      console.log(
        '[deleteMovement] Total de deletedMovements:',
        (state.deletedMovements || []).length,
      );

      // Procurar em state.movements OU em deletedMovements
      let movementToDelete = state.movements.find((m) => m.id === id);
      let isAlreadyDeleted = false;

      console.log('[deleteMovement] Encontrado em movements?', !!movementToDelete);

      if (!movementToDelete) {
        // Se não encontrou em movements, procura em deletedMovements
        movementToDelete = (state.deletedMovements || []).find((m) => m.id === id);
        isAlreadyDeleted = true;
        console.log('[deleteMovement] Encontrado em deletedMovements?', !!movementToDelete);
      }

      if (!movementToDelete) {
        console.warn('[deleteMovement] Movimento não encontrado em lugar nenhum!');
        return; // Se não encontrou em lugar nenhum
      }

      if (isAlreadyDeleted) {
        console.log('[deleteMovement] Movimento já estava deletado, fazendo delete permanente...');
        // Se já está deletado, deletar permanentemente
        setState((prev) => ({
          ...prev,
          deletedMovements: (prev.deletedMovements || []).filter((m) => m.id !== id),
        }));
        await permanentlyDeleteMovementInFirestore(userId, id);
        console.log('[deleteMovement] Delete permanente concluído!');
        toast.success('Movimentação deletada permanentemente!');
      } else {
        console.log('[deleteMovement] Movimento está ativo, fazendo soft delete...');
        // Se está ativo, fazer soft delete
        setState((prev) => {
          const found = prev.movements.find((m) => m.id === id);
          if (!found) return prev;
          return {
            ...prev,
            movements: prev.movements.filter((m) => m.id !== id),
            deletedMovements: [
              ...(prev.deletedMovements || []),
              { ...found, deletedAt: new Date().toISOString() },
            ],
          };
        });
        await deleteMovementInFirestore(userId, movementToDelete);
        console.log('[deleteMovement] Soft delete concluído!');
        toast.success('Movimentação deletada!');
      }
    } catch (e) {
      console.error('Erro ao deletar movimentação:', e);
      toast.error('Erro ao deletar movimentação');
    }
  };

  const restoreMovement = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Atualizar estado local PRIMEIRO
      setState((prev) => {
        const found = (prev.deletedMovements || []).find((m) => m.id === id);
        if (!found) return prev;
        return {
          ...prev,
          movements: [...prev.movements, { ...found, deletedAt: undefined }],
          deletedMovements: (prev.deletedMovements || []).filter((m) => m.id !== id),
        };
      });

      // Depois salvar no Firestore
      await updateMovementInFirestore(userId, id, { deletedAt: undefined });
      toast.success('Movimentação restaurada!');
    } catch (e) {
      console.error('Erro ao restaurar movimentação:', e);
      toast.error('Erro ao restaurar movimentação');
    }
  };

  const permanentlyDeleteMovement = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      console.log('[permanentlyDeleteMovement] Iniciando delete permanente:', id);
      console.log('[permanentlyDeleteMovement] userId:', userId);
      console.log(
        '[permanentlyDeleteMovement] deletedMovements antes:',
        state.deletedMovements?.length,
      );

      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        deletedMovements: (prev.deletedMovements || []).filter((m) => m.id !== id),
      }));

      console.log('[permanentlyDeleteMovement] Estado local atualizado');

      // Depois deletar do Firestore
      await permanentlyDeleteMovementInFirestore(userId, id);
      console.log('[permanentlyDeleteMovement] Firestore delete concluído com sucesso!');

      toast.success('Movimentação deletada permanentemente!');
    } catch (e) {
      console.error('[permanentlyDeleteMovement] ERRO:', e);
      toast.error('Erro ao deletar movimentação');
    }
  };

  // ========== MEDICATION HANDLERS ==========

  const addMed = async (med: Medication) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Salvar no estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        medications: [...prev.medications, med],
      }));

      // Depois salvar no Firestore
      await addMedicationInFirestore(userId, med);
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...medData } = med as any;
      
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        medications: prev.medications.map((m) => (m.id === med.id ? med : m)),
      }));

      // Depois atualizar no Firestore
      await updateMedicationInFirestore(userId, med.id, medData);
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
      setState((prev) => {
        const found = prev.medications.find((m) => m.id === id);
        if (!found) return prev;

        // Soft delete no Firestore
        deleteMedicationInFirestore(userId, found).catch((e) =>
          console.error('Erro ao deletar medicamento:', e),
        );

        return {
          ...prev,
          medications: prev.medications.filter((m) => m.id !== id),
          deletedMedications: [
            ...(prev.deletedMedications || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });
    } catch (e) {
      console.error('Erro ao deletar medicamento:', e);
    }
  };

  const restoreMed = (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((prev) => {
      const found = (prev.deletedMedications || []).find((m) => m.id === id);
      if (!found) return prev;

      // Remover deletedAt do Firestore
      const cleanedMed = { ...found };
      delete cleanedMed.deletedAt;
      updateMedicationInFirestore(userId, id, cleanedMed).catch((e) =>
        console.error('Erro ao restaurar medicamento:', e),
      );

      return {
        ...prev,
        medications: [...prev.medications, cleanedMed],
        deletedMedications: (prev.deletedMedications || []).filter((m) => m.id !== id),
      };
    });
  };

  const permanentlyDeleteMed = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Delete permanente do Firestore
      await permanentlyDeleteMedicationInFirestore(userId, id);

      setState((prev) => ({
        ...prev,
        deletedMedications: (prev.deletedMedications || []).filter((m) => m.id !== id),
      }));
    } catch (e) {
      console.error('Erro ao deletar permanentemente medicamento:', e);
    }
  };

  // ========== MEDICATION APPLICATION HANDLERS ==========

  const applyMed = async (app: MedicationApplication) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        applications: [...prev.applications, app],
      }));

      // Depois salvar no Firestore
      await addApplicationInFirestore(userId, app);
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...appData } = app as any;
      
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) => (a.id === app.id ? app : a)),
      }));

      // Depois atualizar no Firestore
      await updateApplicationInFirestore(userId, app.id, appData);
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
      let appToDelete: MedicationApplication | undefined;

      setState((prev) => {
        const found = prev.applications.find((a) => a.id === id);
        appToDelete = found;
        if (!found) return prev;
        return {
          ...prev,
          applications: prev.applications.filter((a) => a.id !== id),
          deletedApplications: [
            ...(prev.deletedApplications || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });

      // Depois soft delete no Firestore
      if (appToDelete) {
        await deleteApplicationInFirestore(userId, appToDelete);
      }
    } catch (e) {
      console.error('Erro ao deletar aplicação:', e);
    }
  };

  const restoreApplication = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      let appToRestore: MedicationApplication | undefined;

      setState((prev) => {
        const found = (prev.deletedApplications || []).find((a) => a.id === id);
        appToRestore = found;
        if (!found) return prev;
        return {
          ...prev,
          applications: [...prev.applications, { ...found, deletedAt: undefined }],
          deletedApplications: (prev.deletedApplications || []).filter((a) => a.id !== id),
        };
      });

      // Depois restaurar no Firestore
      if (appToRestore) {
        await restoreApplicationInFirestore(userId, appToRestore);
      }
    } catch (e) {
      console.error('Erro ao restaurar aplicação:', e);
    }
  };

  const permanentlyDeleteApplication = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      let appToDelete: MedicationApplication | undefined;

      setState((prev) => {
        const found = (prev.deletedApplications || []).find((a) => a.id === id);
        appToDelete = found;
        return {
          ...prev,
          deletedApplications: (prev.deletedApplications || []).filter((a) => a.id !== id),
        };
      });

      // Depois deletar permanentemente no Firestore
      if (appToDelete) {
        await permanentlyDeleteApplicationInFirestore(userId, appToDelete);
      }
    } catch (e) {
      console.error('Erro ao deletar permanentemente aplicação:', e);
    }
  };

  // ========== TREATMENT HANDLERS ==========

  const addTreatment = async (t: ContinuousTreatment) => {
    const userId = session?.user?.id;
    if (!userId || !t.startDate || !t.frequency || !t.status) {
      console.warn('addTreatment validation failed');
      return false;
    }

    try {
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        treatments: [...prev.treatments, t],
      }));

      // Depois salvar no Firestore
      await addTreatmentInFirestore(userId, t);
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...treatmentData } = t as any;
      
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        treatments: prev.treatments.map((item) => (item.id === t.id ? t : item)),
      }));

      // Depois atualizar no Firestore
      await updateTreatmentInFirestore(userId, t.id, treatmentData);
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
      let treatToDelete: ContinuousTreatment | undefined;

      setState((prev) => {
        const found = prev.treatments.find((t) => t.id === id);
        treatToDelete = found;
        if (!found) return prev;
        return {
          ...prev,
          treatments: prev.treatments.filter((t) => t.id !== id),
          deletedTreatments: [
            ...(prev.deletedTreatments || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });

      // Depois soft delete no Firestore
      if (treatToDelete) {
        await deleteTreatmentInFirestore(userId, treatToDelete);
      }
    } catch (e) {
      console.error('Erro ao deletar tratamento:', e);
    }
  };

  const restoreTreatment = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      let treatToRestore: ContinuousTreatment | undefined;

      setState((prev) => {
        const found = (prev.deletedTreatments || []).find((t) => t.id === id);
        treatToRestore = found;
        if (!found) return prev;
        return {
          ...prev,
          treatments: [...prev.treatments, { ...found, deletedAt: undefined }],
          deletedTreatments: (prev.deletedTreatments || []).filter((t) => t.id !== id),
        };
      });

      // Depois restaurar no Firestore
      if (treatToRestore) {
        await restoreTreatmentInFirestore(userId, treatToRestore);
      }
    } catch (e) {
      console.error('Erro ao restaurar tratamento:', e);
    }
  };

  const permanentlyDeleteTreatment = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      let treatToDelete: ContinuousTreatment | undefined;

      setState((prev) => {
        const found = (prev.deletedTreatments || []).find((t) => t.id === id);
        treatToDelete = found;
        return {
          ...prev,
          deletedTreatments: (prev.deletedTreatments || []).filter((t) => t.id !== id),
        };
      });

      // Depois deletar permanentemente no Firestore
      if (treatToDelete) {
        await permanentlyDeleteTreatmentInFirestore(userId, treatToDelete);
      }
    } catch (e) {
      console.error('Erro ao deletar permanentemente tratamento:', e);
    }
  };

  // ========== TRANSACTION HANDLERS ==========

  const addTransaction = async (t: Transaction) => {
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // Salvar no Firestore
      await saveTransactionToFirestore(userId, t);

      // Recarregar do Firestore para garantir sincronização
      const allTransactions = await getTransactions(userId);
      const deletedTransactions = await getDeletedTransactions(userId);
      
      setState((prev) => ({
        ...prev,
        transactions: allTransactions || [],
        deletedTransactions: deletedTransactions || [],
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
      setState((prev) => {
        const found = prev.transactions.find((tx) => tx.id === id);
        if (!found) return prev;

        // Soft delete no Firestore
        deleteTransactionInFirestore(userId, found).catch((e) =>
          console.error('Erro ao deletar transação:', e),
        );

        return {
          ...prev,
          transactions: prev.transactions.filter((tx) => tx.id !== id),
          deletedTransactions: [
            ...(prev.deletedTransactions || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });
    } catch (e) {
      console.error('Erro ao deletar transação:', e);
    }
  };

  const restoreTransaction = (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((prev) => {
      const found = (prev.deletedTransactions || []).find((tx) => tx.id === id);
      if (!found) return prev;

      // Remover deletedAt do Firestore
      const cleanedTransaction = { ...found };
      delete cleanedTransaction.deletedAt;
      saveTransactionToFirestore(userId, cleanedTransaction).catch((e) =>
        console.error('Erro ao restaurar transação:', e),
      );

      return {
        ...prev,
        transactions: [...prev.transactions, cleanedTransaction],
        deletedTransactions: (prev.deletedTransactions || []).filter((tx) => tx.id !== id),
      };
    });
  };

  const permanentlyDeleteTransaction = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Delete permanente do Firestore
      await permanentlyDeleteTransactionInFirestore(userId, id);

      setState((prev) => ({
        ...prev,
        deletedTransactions: (prev.deletedTransactions || []).filter((tx) => tx.id !== id),
      }));
    } catch (e) {
      console.error('Erro ao deletar permanentemente transação:', e);
    }
  };

  // ========== TASK HANDLERS ==========

  const addTask = async (t: MaintenanceTask) => {
    const userId = session?.user?.id;
    if (!userId || !t.title) {
      console.warn('addTask validation failed');
      return false;
    }

    try {
      // Salvar no estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        tasks: [...prev.tasks, t],
      }));

      // Depois salvar no Firestore
      await addTaskInFirestore(userId, t);
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...taskData } = t as any;
      
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => (task.id === t.id ? t : task)),
      }));

      // Depois atualizar no Firestore
      await updateTaskInFirestore(userId, t.id, taskData);
      toast.success('Tarefa atualizada!');
    } catch (e) {
      console.error('Erro ao atualizar tarefa:', e);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const toggleTask = (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === id);
      if (!task) return prev;

      const updatedTask = { ...task, isCompleted: !task.isCompleted };

      // Atualizar Firestore também
      updateTaskInFirestore(userId, id, updatedTask).catch((e) =>
        console.error('Erro ao atualizar status da tarefa:', e),
      );

      return {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? updatedTask : t)),
      };
    });
  };

  const deleteTask = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      setState((prev) => {
        const found = prev.tasks.find((t) => t.id === id);
        if (!found) return prev;

        // Soft delete no Firestore
        deleteTaskInFirestore(userId, found).catch((e) =>
          console.error('Erro ao deletar tarefa:', e),
        );

        return {
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== id),
          deletedTasks: [
            ...(prev.deletedTasks || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });
    } catch (e) {
      console.error('Erro ao deletar tarefa:', e);
    }
  };

  const restoreTask = (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((prev) => {
      const found = (prev.deletedTasks || []).find((t) => t.id === id);
      if (!found) return prev;

      // Remover deletedAt do Firestore
      const cleanedTask = { ...found };
      delete cleanedTask.deletedAt;
      updateTaskInFirestore(userId, id, cleanedTask).catch((e) =>
        console.error('Erro ao restaurar tarefa:', e),
      );

      return {
        ...prev,
        tasks: [...prev.tasks, cleanedTask],
        deletedTasks: (prev.deletedTasks || []).filter((t) => t.id !== id),
      };
    });
  };

  const permanentlyDeleteTask = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Delete permanente do Firestore
      await permanentlyDeleteTaskInFirestore(userId, id);

      setState((prev) => ({
        ...prev,
        deletedTasks: (prev.deletedTasks || []).filter((t) => t.id !== id),
      }));
    } catch (e) {
      console.error('Erro ao deletar permanentemente tarefa:', e);
    }
  };

  // ========== TOURNAMENT HANDLERS ==========

  const addEvent = async (e: TournamentEvent) => {
    const userId = session?.user?.id;
    if (!userId || !e.title) {
      console.warn('addEvent validation failed');
      return false;
    }

    try {
      // Salvar no estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        tournaments: [...prev.tournaments, e],
      }));

      // Depois salvar no Firestore
      await addEventInFirestore(userId, e);
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
      // Remover campos de controle de status antes de salvar
      const { deletedAt, archivedAt, ...eventData } = e as any;
      
      // Atualizar estado local PRIMEIRO
      setState((prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((ev) => (ev.id === e.id ? e : ev)),
      }));

      // Depois atualizar no Firestore
      await updateEventInFirestore(userId, e.id, eventData);
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
      setState((prev) => {
        const found = prev.tournaments.find((ev) => ev.id === id);
        if (!found) return prev;

        // Soft delete no Firestore
        deleteEventInFirestore(userId, found).catch((e) =>
          console.error('Erro ao deletar evento:', e),
        );

        return {
          ...prev,
          tournaments: prev.tournaments.filter((ev) => ev.id !== id),
          deletedTournaments: [
            ...(prev.deletedTournaments || []),
            { ...found, deletedAt: new Date().toISOString() },
          ],
        };
      });
    } catch (e) {
      console.error('Erro ao deletar evento:', e);
    }
  };

  const restoreEvent = (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setState((prev) => {
      const found = (prev.deletedTournaments || []).find((ev) => ev.id === id);
      if (!found) return prev;

      // Remover deletedAt do Firestore
      const cleanedEvent = { ...found };
      delete cleanedEvent.deletedAt;
      updateEventInFirestore(userId, id, cleanedEvent).catch((e) =>
        console.error('Erro ao restaurar evento:', e),
      );

      return {
        ...prev,
        tournaments: [...prev.tournaments, cleanedEvent],
        deletedTournaments: (prev.deletedTournaments || []).filter((ev) => ev.id !== id),
      };
    });
  };

  const permanentlyDeleteEvent = async (id: string) => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // Delete permanente do Firestore
      await permanentlyDeleteEventInFirestore(userId, id);

      setState((prev) => ({
        ...prev,
        deletedTournaments: (prev.deletedTournaments || []).filter((ev) => ev.id !== id),
      }));
    } catch (e) {
      console.error('Erro ao deletar permanentemente evento:', e);
    }
  };

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
    // Páginas que requerem Plano Profissional
    const proOnlyPages = ['finance', 'documents', 'tournament-manager', 'tournament-results', 'analytics'];
    const isProPage = proOnlyPages.includes(activeTab);
    const hasProAccess = hasActiveProPlan(state.settings) || isAdmin;

    // Se é uma página Pro e o usuário não tem acesso, redireciona para plano
    if (isProPage && !hasProAccess) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20">
              <Zap size={40} className="text-white" fill="currentColor" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
              Recurso Profissional
            </h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Este recurso está disponível apenas no Plano Profissional. Faça upgrade agora para aproveitar todos os recursos do AviGestão.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('avigestao_settings_tab', 'plano');
                } catch {
                  /* ignore storage errors */
                }
                setActiveTab('settings');
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2"
            >
              <Zap size={20} fill="currentColor" />
              Ver Planos
            </button>
          </div>
        </div>
      );
    }

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
            saveSettings={handleSaveSettings}
            updateSettings={updateSettings}
            isAdmin={isAdmin}
            onShowUpgradeModal={() => setShowUpgradeModal(true)}
          />
        );
      case 'birds-labels':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            addMovement={addMovement}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            saveSettings={handleSaveSettings}
            initialList="etiquetas"
            titleOverride="Etiquetas"
            isAdmin={isAdmin}
            onShowUpgradeModal={() => setShowUpgradeModal(true)}
          />
        );
      case 'birds-history':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            addMovement={addMovement}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            saveSettings={handleSaveSettings}
            initialList="histórico"
            titleOverride="Histórico do Plantel"
            isAdmin={isAdmin}
            onShowUpgradeModal={() => setShowUpgradeModal(true)}
          />
        );
      case 'birds-ibama':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            addMovement={addMovement}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            saveSettings={handleSaveSettings}
            initialList="ibama-pendentes"
            titleOverride="IBAMA Pendentes"
            isAdmin={isAdmin}
          />
        );
      case 'birds-trash':
        return (
          <BirdManager
            state={state}
            addBird={addBird}
            addMovement={addMovement}
            updateBird={updateBird}
            deleteBird={deleteBird}
            restoreBird={restoreBird}
            permanentlyDeleteBird={permanentlyDeleteBird}
            saveSettings={handleSaveSettings}
            initialList="lixeira"
            titleOverride="Lixeira do Plantel"
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
            saveSettings={handleSaveSettings}
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
            updateBird={updateBird}
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
            onNavigateToResults={(tournamentId) => {
              if (tournamentId) {
                localStorage.setItem('tournament_results_selected', tournamentId);
              }
              navigateTo('tournament-results');
            }}
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
        return (
          <DocumentsManager
            settings={state.settings}
            updateSettings={updateSettings}
            onSave={persistSettings}
          />
        );
      case 'rings':
        return (
          <RingsManager
            rings={state.rings || []}
            ringBatches={state.ringBatches || []}
            birds={state.birds}
            addRingBatch={addRingBatch}
            addRingItem={addRingItem}
            updateRingItem={updateRingItem}
            deleteRingItem={deleteRingItem}
            updateBird={updateBird}
          />
        );
      case 'verification':
        return <BirdVerification birdId={birdIdFromUrl || ''} />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'tournament-manager':
        return <TournamentManager />;
      case 'statistics':
        return <PublicStatistics onNavigateToLibrary={() => navigateTo('library')} />;
      case 'library':
        return <LibraryCenter />;
      case 'community-inbox':
        return <CommunityInbox />;
      case 'public-birds':
        return <PublicBirds onNavigateToHome={() => navigateTo('dashboard')} />;
      case 'top-breeders':
        return <TopBreedersPage />;
      case 'recent-birds':
        return <RecentBirdsPage />;
      case 'public-tournaments':
        return (
          <PublicTournaments
            onNavigateToLogin={() => navigateTo('dashboard')}
            onNavigateToHome={() => navigateTo('dashboard')}
            birds={state.birds}
          />
        );
      case 'about':
        return <About />;
      case 'privacy':
        return <Privacy />;
      case 'terms':
        return <Terms />;
      case 'tournament-results':
        return <TournamentResults onBack={() => navigateTo('dashboard')} />;
      case 'admin-users':
        return <AdminUsers currentUserId={session?.user?.id} />;
      case 'admin-community-moderation':
        return <AdminCommunityModeration currentUserId={session?.user?.id} />;
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

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Painel';
      case 'birds':
        return 'Plantel';
      case 'birds-labels':
        return 'Etiquetas';
      case 'birds-history':
        return 'Histórico';
      case 'sexing':
        return 'Sexagem';
      case 'birds-ibama':
        return 'IBAMA Pendentes';
      case 'birds-trash':
        return 'Lixeira';
      case 'breeding':
        return 'Reprodução';
      case 'meds':
        return 'Medicamentos';
      case 'movements':
        return 'Movimentações';
      case 'finance':
        return 'Financeiro';
      case 'tasks':
        return 'Tarefas';
      case 'tournaments':
        return 'Torneios';
      case 'settings':
        return 'Configurações';
      case 'about':
        return 'Sobre';
      case 'privacy':
        return 'Privacidade';
      case 'terms':
        return 'Termos de Uso';
      case 'rings':
        return 'Anilhas';
      case 'community-inbox':
        return 'Inbox da Comunidade';
      case 'documents':
        return 'Licenças';
      case 'analytics':
        return 'Relatórios';
      case 'library':
        return 'Central de Biblioteca';
      case 'statistics':
        return 'Comunidade';
      case 'top-breeders':
        return 'Top Criadores';
      case 'recent-birds':
        return 'Aves Recentes';
      default:
        return tab.charAt(0).toUpperCase() + tab.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-4 text-lg font-semibold text-gray-700">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (isEmailVerificationPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl text-center my-auto">
          <Toaster position="bottom-center" />
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">E-mail enviado!</h2>
          <p className="text-slate-600 mt-4 leading-relaxed">
            Enviamos um link de ativação para:<br />
            <span className="font-bold text-slate-900 block mt-1">{verificationEmail}</span>
          </p>
          <p className="text-sm text-slate-500 mt-6 leading-relaxed">
            Clique no link dentro do e-mail para confirmar sua conta e começar a usar o sistema.
            <br />
            <span className="text-xs mt-2 block">(Não esqueça de olhar na pasta de Spam)</span>
          </p>

          <div className="mt-10 space-y-3">
            <button
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleResendVerification}
              disabled={isResendingVerification}
            >
              {isResendingVerification ? 'Reenviando...' : 'Reenviar e-mail de verificação'}
            </button>
            <button
              className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCheckVerification}
              disabled={isCheckingVerification}
            >
              {isCheckingVerification ? 'Verificando...' : 'Já verifiquei meu e-mail'}
            </button>
            <button
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
              onClick={handleLogout}
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    // Rotas públicas que funcionam sem login
    const publicRoutes = [
      'verification',
      'public-tournaments',
      'tournament-results',
      'statistics',
      'public-birds',
      'about',
      'privacy',
      'terms',
    ];

    if (publicRoutes.includes(activeTab)) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Suspense
            fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50" />}
          >
            {renderContent()}
          </Suspense>
          <Toaster position="bottom-center" />
        </div>
      );
    }

    // Se for rota pública (verificação de pássaro com ID), mostra sem autenticação
    if (isPublicRoute && birdIdFromUrl) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Suspense
            fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50" />}
          >
            <BirdVerification birdId={birdIdFromUrl} />
          </Suspense>
          <Toaster position="bottom-center" />
        </div>
      );
    }

    // Caso contrário, pede login
    return (
      <div className="min-h-screen bg-slate-50">
        <Suspense
          fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50" />}
        >
          <Auth
            onLogin={(settings) => {
              if (settings) {
                setState((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, ...settings },
                }));
              }
            }}
            onNavigateToPublicTournaments={() => navigateTo('public-tournaments')}
            onNavigateToResults={() => navigateTo('tournament-results')}
            onNavigateToPublicBirds={() => navigateTo('public-birds')}
          />
        </Suspense>
        <Toaster position="bottom-center" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <Toaster position="bottom-center" />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={navigateTo}
        settings={state.settings}
        updateSettings={updateSettings}
        onSave={persistSettings}
        onLogout={handleLogout}
        breederName={state.settings?.breederName || 'Criador'}
        logoUrl={state.settings?.logoUrl}
        plan={state.settings?.plan || 'Básico'}
        trialEndDate={state.settings?.trialEndDate}
        isAdmin={isAdmin}
        adminOnly={isAdminOnly}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-grow overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <PageHeader
              title={<>{getPageTitle(activeTab)}</>}
              subtitle=""
              actions={null}
            />

            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px]">Carregando...</div>
              }
            >
              {renderContent()}
            </Suspense>
          </div>
        </main>
        <Footer onContactClick={() => setIsContactOpen(true)} />
        <ContactModal
          isOpen={isContactOpen}
          onClose={() => setIsContactOpen(false)}
          defaultEmail={session?.user?.email ?? ''}
          defaultName={state?.settings?.responsibleName ?? ''}
        />
      </div>
    </div>
  );
};

export default App;
