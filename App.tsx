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
import { supabase, SUPABASE_MISSING } from './lib/supabase';
import { loadInitialData, loadTabData, loadDeletedPairs } from './services/dataService';
import { saveBirdToSupabase } from './lib/birdSync';

const STORAGE_KEY = 'avigestao_state_v2';
const storageKeyForUser = (userId?: string) => (userId ? `${STORAGE_KEY}::${userId}` : STORAGE_KEY);
const HYDRATE_TIMEOUT_MS = 60000; // 60s - increased for admin accounts with more data
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

    // If the cache does not specify a user, ignore it for safety when a userId is provided
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

// Remove tokens gravados pelo cliente Supabase (sb-*-auth-token)
const clearSupabaseAuthStorage = () => {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
};

const DEFAULT_SESSION_TIMEOUT_MS = 8000;
const SESSION_RETRY_DELAY_MS = 2000;
const SESSION_RETRY_LIMIT = 3;
const SESSION_RETRY_MAX_DELAY_MS = 10000;

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabaseUnavailable = SUPABASE_MISSING || !supabase;
  const lastValidSessionRef = useRef<any>(null);
  const sessionRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryCountRef = useRef(0);
  const loadedTabsRef = useRef(new Set<string>());
  const realtimeChannelsRef = useRef<any[]>([]);
  const sessionClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSettingsInProgressRef = useRef(false);

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
    clearSupabaseAuthStorage();
  };

  const getFreshAccessToken = async (forceRefresh = false): Promise<string | null> => {
    if (supabaseUnavailable) return null;
    try {
      let { data } = await supabase.auth.getSession();
      let accessToken = data?.session?.access_token || null;

      if (!accessToken || forceRefresh) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        accessToken = refreshed?.session?.access_token || null;
        
        // Se o refresh falhou com erro de autenticação, limpar storage corrompido
        if (refreshError && (refreshError.message?.includes('Invalid') || refreshError.message?.includes('expired'))) {
          console.warn('Sessão corrompida detectada, limpando storage');
          clearSupabaseAuthStorage();
          clearAllState(data?.session?.user?.id);
          return null;
        }
      }

      if (!accessToken) {
        clearAllState(data?.session?.user?.id);
        return null;
      }

      return accessToken;
    } catch (err) {
      console.warn('Falha ao obter token válido', err);
      clearSupabaseAuthStorage();
      return null;
    }
  };

  const fetchWithAuth = async (
    path: string,
    init?: RequestInit,
    tokenOverride?: string
  ): Promise<Response | null> => {
    const doFetch = async (token: string) =>
      fetch(path, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`
        }
      });

    let token = tokenOverride || (await getFreshAccessToken());
    if (!token) return null;

    let res = await doFetch(token);
    if (res.status === 401) {
      token = await getFreshAccessToken(true);
      if (!token) return res;
      res = await doFetch(token);

      if (res.status === 401) {
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch {/* ignore */}
        clearAllState();
      }
    }

    return res;
  };

  // Declare persistSettings early so it's available to all functions
  let persistSettings: (settings: BreederSettings) => Promise<void>;

  const fetchSession = async () => {
    try {
      const promise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 8000)
      );
      const resp: any = await Promise.race([promise, timeoutPromise]);
      return resp?.data?.session ?? null;
    } catch (err) {
      console.warn('Erro ao buscar sessão:', err);
      return null;
    }
  };

  const scheduleSessionRetry = (fn: () => void) => {
    if (sessionRetryRef.current) {
      clearTimeout(sessionRetryRef.current);
    }
    sessionRetryRef.current = setTimeout(() => {
      sessionRetryRef.current = null;
      fn();
    }, SESSION_RETRY_DELAY_MS);
  };

  const scheduleSessionRetryWithDelay = (fn: () => void, delayMs?: number) => {
    if (sessionRetryRef.current) {
      clearTimeout(sessionRetryRef.current);
    }
    const d = typeof delayMs === 'number' ? delayMs : SESSION_RETRY_DELAY_MS;
    sessionRetryRef.current = setTimeout(() => {
      sessionRetryRef.current = null;
      fn();
    }, d);
  };

  const revalidateSession = async () => {
    try {
      const session = await fetchSession();
      if (session) {
        sessionRetryCountRef.current = 0;
        await handleSession(session);
        return;
      }
    } catch (err: any) {
      console.warn('Falha ao revalidar sessão', err);
    }
    sessionRetryCountRef.current += 1;
    if (sessionRetryCountRef.current <= SESSION_RETRY_LIMIT) {
      const exp = Math.pow(2, sessionRetryCountRef.current - 1);
      const delay = Math.min(SESSION_RETRY_DELAY_MS * exp, SESSION_RETRY_MAX_DELAY_MS);
      scheduleSessionRetryWithDelay(revalidateSession, delay);
    }
  };

  const isLikelyStripeReturn = () => {
    try {
      if (typeof window === 'undefined') return false;
      const params = new URLSearchParams(window.location.search);
      if (params.has('session_id') || params.has('checkout_session_id') || params.has('stripe')) return true;
      const ref = document.referrer || '';
      if (/stripe\.com/.test(ref)) return true;
      return false;
    } catch {
      return false;
    }
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
  // Bootstrap session
  useEffect(() => {
    if (supabaseUnavailable) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const session = await fetchSession();
        if (!mounted) return;

        const userId = session?.user?.id;
        if (userId) {
          const cached = loadCachedState(userId);
          if (cached.hasCache) {
            setState(cached.state);
            setHasHydratedOnce(true);
            setIsLoading(false);
          }
        }

        sessionRetryCountRef.current = 0;
        setAuthError(null);
        await handleSession(session, 'INIT');
      } catch (err: any) {
        if (!mounted) return;
        setAuthError(err?.message || 'Erro ao iniciar sessão');
        setIsLoading(false);
      }
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (event: any, newSession: any) => {
      if (!mounted) return;
      await handleSession(newSession, event);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
      if (sessionRetryRef.current) {
        clearTimeout(sessionRetryRef.current);
        sessionRetryRef.current = null;
      }
    };
  }, [supabaseUnavailable]);

  // Revalida sessão ao voltar de outra aba/janela (ex: portal Stripe)
  useEffect(() => {
    if (supabaseUnavailable) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') revalidateSession();
    };
    window.addEventListener('focus', revalidateSession);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', revalidateSession);
      document.removeEventListener('visibilitychange', onVisibility);
      if (sessionRetryRef.current) {
        clearTimeout(sessionRetryRef.current);
        sessionRetryRef.current = null;
      }
    };
  }, [supabaseUnavailable]);

  // Carrega dados por aba sob demanda
  useEffect(() => {
    if (supabaseUnavailable || !session?.user?.id) return;
    const tab = activeTab;
    if (loadedTabsRef.current.has(tab)) return;

    let cancelled = false;
    const load = async () => {
      try {
        const data = await loadTabData(session.user.id, tab);
        if (cancelled) return;
        
        // IMPORTANTE: Nunca sobrescrever com dados vazios!
        // Se o array está vazio e já temos dados, não atualizar
        if (data && Object.keys(data).length > 0) {
          // Verificar se algum dado crucial está vazio quando deveria ter algo
          const hasEmptyArrayWhenShouldntBe = 
            (data.birds?.length === 0 && state.birds?.length > 0) ||
            (data.pairs?.length === 0 && state.pairs?.length > 0);
          
          if (hasEmptyArrayWhenShouldntBe) {
            console.warn('⚠ Supabase retornou dados vazios quando já havia dados. Ignorando para preservar localStorage.');
            return;
          }
          
          setState(prev => ({ ...prev, ...data }));
          console.log(`✓ Dados da aba '${tab}' carregados:`, data);
        }
      } catch (err: any) {
        const msg = (err?.message || '').toString();
        if (msg.includes('AbortError') || msg.includes('aborted')) {
          // navegação/abort controller durante troca de aba: ignora
        } else if (import.meta?.env?.DEV) {
          console.warn('❌ Falha ao carregar dados da aba', tab, err);
        }
      } finally {
        loadedTabsRef.current.add(tab);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, session, supabaseUnavailable]);

  const handleSession = async (newSession: any, event?: string) => {
    if (!newSession) {
      if (sessionClearRef.current) {
        clearTimeout(sessionClearRef.current);
      }

      // Se houve SIGNED_OUT explícito ou não parece retorno do Stripe, limpa já para evitar perfil antigo.
      if (event === 'SIGNED_OUT' || !isLikelyStripeReturn()) {
        clearAllState(lastValidSessionRef.current?.user?.id);
        return;
      }

      // Caso provável de retorno Stripe: dá uma graça curta antes de limpar
      revalidateSession();
      const GRACE_MS = 8000;
      sessionClearRef.current = setTimeout(async () => {
        try {
          const s = await fetchSession();
          if (s) {
            await handleSession(s);
            return;
          }
        } catch (e) {
          console.warn('Re-check session failed', e);
        }
        clearAllState(lastValidSessionRef.current?.user?.id);
      }, GRACE_MS);

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

    // Mostra cache local imediatamente e libera UI
    const cached = loadCachedState(newUserId);
    if (cached.hasCache) {
      setState(cached.state);
      setHasHydratedOnce(true);
      setIsLoading(false);
    } else {
      setHasHydratedOnce(false);
      setIsLoading(true);
    }
    
    setAuthError(null);
    // Se o token for inválido, força revalidação imediata
    const token = newSession.access_token;

    // Hidrata dados em background
    try {
      await Promise.race([
        Promise.all([checkAdmin(token), hydrateUserData(newSession)]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout hydrate')), HYDRATE_TIMEOUT_MS))
      ]);
    } catch (err: any) {
      console.error('Erro ao hidratar sessao:', err);
      if (err?.message === 'timeout hydrate') {
        // Silently continue with cached data if available
        if (!cached.hasCache) {
          setAuthError('Demorou para carregar seus dados. Usando dados locais.');
        }
      } else if (!cached.hasCache) {
        setAuthError(err?.message || 'Nao foi possivel carregar seus dados');
      }
    } finally {
      setHasHydratedOnce(true);
      setIsLoading(false);
    }
  };
  // Define persistSettings immediately so it's available to all functions
  persistSettings = async (settings: BreederSettings) => {
    if (supabaseUnavailable) {
      console.warn('Supabase unavailable');
      return;
    }
    
    // Revalidate session before saving
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.user?.id) {
      console.warn('Sessão inválida ou expirada, aguarde revalidação');
      return;
    }
    
    // Prevent multiple concurrent saves
    if (persistSettingsInProgressRef.current) {
      console.warn('Save already in progress, skipping duplicate');
      return;
    }
    
    persistSettingsInProgressRef.current = true;
    
    const userId = currentSession.user.id;
    const fullPayload = {
      user_id: userId,
      breeder_name: settings.breederName,
      cpf_cnpj: settings.cpfCnpj || null,
      sispass_number: settings.sispassNumber || null,
      sispass_document_url: settings.sispassDocumentUrl || null,
      registration_date: settings.registrationDate || null,
      renewal_date: settings.renewalDate || null,
      last_renewal_date: settings.lastRenewalDate || null,
      logo_url: settings.logoUrl || null,
      primary_color: settings.primaryColor,
      accent_color: settings.accentColor,
      plan: settings.plan,
      trial_end_date: settings.trialEndDate || null,
      dashboard_layout: settings.dashboardLayout || null,
      certificate: settings.certificate || null,
      subscription_end_date: settings.subscriptionEndDate || null,
      subscription_status: settings.subscriptionStatus || null,
      subscription_cancel_at_period_end: settings.subscriptionCancelAtPeriodEnd ?? null
    };

    const minimalPayload = {
      user_id: userId,
      breeder_name: settings.breederName,
      plan: settings.plan,
      trial_end_date: settings.trialEndDate || null,
      primary_color: settings.primaryColor,
      accent_color: settings.accentColor,
      cpf_cnpj: settings.cpfCnpj || null,
      sispass_number: settings.sispassNumber || null,
      sispass_document_url: settings.sispassDocumentUrl || null,
      registration_date: settings.registrationDate || null,
      renewal_date: settings.renewalDate || null,
      last_renewal_date: settings.lastRenewalDate || null,
      logo_url: settings.logoUrl || null,
      dashboard_layout: settings.dashboardLayout || null,
      certificate: settings.certificate || null
    };

    try {
      const { error } = await supabase.from('settings').upsert(fullPayload as any, { onConflict: 'user_id' });
      if (error) {
        console.warn('Falha ao persistir settings (completo)', error);
        await supabase.from('settings').upsert(minimalPayload as any, { onConflict: 'user_id' });
      }
    } catch (err: any) {
      // Ignora erros 401 silenciosamente (sessão expirada)
      if (err?.message?.includes('401') || err?.code === '401' || err?.message?.includes('Unauthorized')) {
        console.warn('Sessão expirada, configurações serão salvas após próximo login');
        return;
      }
      // Ignora AbortError silenciosamente
      if (err?.message?.includes('AbortError') || err?.message?.includes('aborted')) {
        console.warn('Request was aborted, will retry on next save');
        return;
      }
      // Ignora RLS policy violations (requer revalidação de sessão)
      if (err?.code === '42501' || err?.message?.includes('row-level security')) {
        console.warn('RLS policy violation - sessão requer revalidação');
        return;
      }
      console.warn('Falha ao persistir settings', err);
      try {
        await supabase.from('settings').upsert(minimalPayload as any, { onConflict: 'user_id' });
      } catch (fallbackErr) {
        console.warn('Falha ao persistir settings (fallback)', fallbackErr);
      }
    } finally {
      persistSettingsInProgressRef.current = false;
    }
  };

  const checkAdmin = async (tokenFromCaller?: string) => {
    try {
      const res = await fetchWithAuth('/api/admin/check', undefined, tokenFromCaller);
      if (!res || res.status === 401 || !res.ok) {
        if (res?.status === 401) {
          console.warn('Token inválido ao verificar admin - sessão expirada');
        }
        setIsAdmin(false);
        return;
      }

      const json = await res.json();
      setIsAdmin(!!json?.isAdmin);
    } catch (err) {
      console.warn('Erro ao verificar admin:', err);
      setIsAdmin(false);
    }
  };

  const ensureTrialForNewUser = async (settings: BreederSettings, userId: string): Promise<BreederSettings> => {
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

  const createFallbackSettings = async (
    workingSettings: BreederSettings | undefined,
    currentSession: any,
    userId: string,
    passedBreederName?: string
  ): Promise<BreederSettings> => {
    // Se recebeu breederName (novo signup), usa; senão tenta o que existe ou fallback para email
    const breederNameToUse = passedBreederName || 
                             workingSettings?.breederName || 
                             currentSession.user?.email || 
                             defaultState.settings.breederName;
    
    const fallbackSettings: BreederSettings = {
      ...(workingSettings || defaultState.settings),
      breederName: breederNameToUse,
      plan: workingSettings?.plan || defaultState.settings.plan,
    };
    
    try {
      await supabase
        .from('settings')
        .upsert({
          user_id: userId,
          breeder_name: fallbackSettings.breederName,
          plan: fallbackSettings.plan,
          trial_end_date: fallbackSettings.trialEndDate || null,
        } as any, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Falha ao salvar settings mínimos', e);
    }
    
    return fallbackSettings;
  };

  const fetchSubscriptionStatus = async (currentSession: any) => {
    const res = await fetchWithAuth('/api/subscription-status', { method: 'POST' }, currentSession?.access_token);

    if (!res || res.status === 401) {
      console.warn('Token expirado ao consultar assinatura; tentar na próxima sessão');
      return null;
    }

    if (res.ok) {
      return await res.json();
    }

    return null;
  };

  const applySubscriptionToSettings = (
    workingSettings: BreederSettings | undefined,
    sub: any
  ): { settings: BreederSettings; endDate: string | undefined; cancelAtPeriodEnd: boolean | undefined; status: string | undefined } => {
    const end = sub?.currentPeriodEnd || sub?.current_period_end;
    const endDate = end ? new Date(end).toISOString().split('T')[0] : undefined;
    const cancelAtPeriodEnd = sub?.cancelAtPeriodEnd ?? sub?.cancel_at_period_end;
    const status = sub?.status;

    const isActive = !!sub?.isActive;
    const isTrialSub = !!sub?.isTrial;

    let updatedSettings = workingSettings || ({} as BreederSettings);

    if (isActive || isTrialSub) {
      updatedSettings = {
        ...updatedSettings,
        plan: 'Profissional',
        trialEndDate: undefined
      } as BreederSettings;
    } else if (!isAdmin) {
      updatedSettings = {
        ...updatedSettings,
        plan: updatedSettings?.trialEndDate ? updatedSettings.plan : 'Básico'
      } as BreederSettings;
    }

    return { settings: updatedSettings, endDate, cancelAtPeriodEnd, status };
  };

  const computeEffectivePlan = (normalizedSettings: BreederSettings): SubscriptionPlan => {
    if (isAdmin) return 'Profissional';

    const trialActive = !!normalizedSettings.trialEndDate;
    const subscriptionActiveFromDate = (() => {
      if (!normalizedSettings.subscriptionEndDate) return false;
      const ts = new Date(normalizedSettings.subscriptionEndDate).getTime();
      return !Number.isNaN(ts) && ts >= Date.now();
    })();
    const subscriptionStatusActive = 
      normalizedSettings.subscriptionStatus === 'active' || 
      normalizedSettings.subscriptionStatus === 'trialing';

    return (subscriptionActiveFromDate || subscriptionStatusActive || trialActive) ? 'Profissional' : 'Básico';
  };

  const autoSaveSubscriptionData = async (
    userId: string,
    subscriptionEndDate: string | undefined,
    subscriptionCancelAtPeriodEnd: boolean | undefined,
    subscriptionStatus: string | undefined
  ) => {
    if (!(subscriptionEndDate || subscriptionCancelAtPeriodEnd || subscriptionStatus) || supabaseUnavailable) {
      return;
    }

    try {
      const payload = {
        user_id: userId,
        subscription_end_date: subscriptionEndDate || null,
        subscription_cancel_at_period_end: subscriptionCancelAtPeriodEnd ?? null,
        subscription_status: subscriptionStatus || null
      };
      await supabase.from('settings').upsert(payload as any, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('Falha ao auto-salvar dados de assinatura:', err);
    }
  };

  const hydrateUserData = async (currentSession: any) => {
    if (supabaseUnavailable || !currentSession?.user?.id) {
      setState(defaultState);
      return;
    }

    const userId = currentSession.user.id as string;

    // Migração local desativada para evitar chamadas extras ao Supabase
    try { localStorage.setItem('avigestao_migrated', 'true'); } catch {}

    try {
      const data = await loadInitialData(userId);
      const settingsFailed = data.settingsFailed;
      const cachedSettings = loadCachedState(userId).state.settings;
      let workingSettings = settingsFailed ? cachedSettings : (data.settings || defaultState.settings);

      let subscriptionEndDate = workingSettings?.subscriptionEndDate;
      let subscriptionCancelAtPeriodEnd = workingSettings?.subscriptionCancelAtPeriodEnd;
      let subscriptionStatus = workingSettings?.subscriptionStatus;

      const hasSettingsRow = !settingsFailed && !!workingSettings?.userId;
      
      // Create fallback settings for new users
      const pendingBreederName = (() => {
        try {
          const pending = localStorage.getItem('avigestao_pending_breeder_name');
          if (pending) {
            localStorage.removeItem('avigestao_pending_breeder_name');
            return pending;
          }
        } catch {}
        return undefined;
      })();

      if (!hasSettingsRow && !settingsFailed) {
        workingSettings = await createFallbackSettings(workingSettings, currentSession, userId, pendingBreederName);
      } else if (!settingsFailed && !workingSettings?.breederName && currentSession.user?.email) {
        workingSettings = { ...(workingSettings || {}), breederName: currentSession.user.email };
      }

      // Check subscription status from backend
      if (supabase) {
        try {
          const sub = await fetchSubscriptionStatus(currentSession);
          if (sub) {
            const result = applySubscriptionToSettings(workingSettings, sub);
            workingSettings = result.settings;
            subscriptionEndDate = result.endDate || subscriptionEndDate;
            subscriptionCancelAtPeriodEnd = result.cancelAtPeriodEnd ?? subscriptionCancelAtPeriodEnd;
            subscriptionStatus = result.status || subscriptionStatus;
          }
        } catch (e) {
          console.warn('Nao foi possivel verificar status da assinatura', e);
        }
      }

      // Apply trial for new users without PRO
      if (!settingsFailed && !hasSettingsRow) {
        workingSettings = await ensureTrialForNewUser(workingSettings || defaultState.settings, userId);
      }
      
      data.settings = workingSettings || defaultState.settings;

      const normalizedSettings: BreederSettings = {
        ...defaultState.settings,
        ...(workingSettings || {}),
        userId,
        trialEndDate: normalizeTrialEndDate(workingSettings?.trialEndDate),
        subscriptionEndDate,
        subscriptionCancelAtPeriodEnd,
        subscriptionStatus
      };

      normalizedSettings.plan = computeEffectivePlan(normalizedSettings);

      setState({
        ...defaultState,
        ...data,
        settings: normalizedSettings
      });

      // Auto-save subscription data
      await autoSaveSubscriptionData(userId, subscriptionEndDate, subscriptionCancelAtPeriodEnd, subscriptionStatus);

      // Load deleted pairs in background
      if (!supabaseUnavailable) {
        try {
          const deletedData = await loadDeletedPairs(userId);
          setState(prev => ({ ...prev, ...deletedData }));
        } catch (err) {
          console.warn('Falha ao carregar pares deletados:', err);
        }
      }

      // Setup Realtime subscriptions
      setupRealtimeSubscriptions(userId);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setAuthError(err?.message || 'Erro ao carregar dados');
    }
  };

  const setupRealtimeSubscriptions = (userId: string) => {
    if (supabaseUnavailable || !userId) return;

    // Limpa subscriptions antigas
    realtimeChannelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    realtimeChannelsRef.current = [];

    // Subscreve a mudanças em birds
    const birdsChannel = supabase
      .channel(`birds:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'birds',
        filter: `user_id=eq.${userId}`
      }, (payload: any) => {
        handleRealtimeChange('birds', payload);
      })
      .subscribe();

    // Subscreve a mudanças em movements
    const movementsChannel = supabase
      .channel(`movements:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'movements',
        filter: `user_id=eq.${userId}`
      }, (payload: any) => {
        handleRealtimeChange('movements', payload);
      })
      .subscribe();

    realtimeChannelsRef.current = [birdsChannel, movementsChannel];
  };

  const handleRealtimeChange = (table: string, payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (table === 'birds') {
      setState(prev => {
        let birds = [...prev.birds];
        if (eventType === 'INSERT') {
          const exists = birds.some(b => b.id === newRecord.id);
          if (!exists) {
            birds.push(mapBirdFromDb(newRecord));
            toast.success('Nova ave adicionada');
          }
        } else if (eventType === 'UPDATE') {
          const idx = birds.findIndex(b => b.id === newRecord.id);
          if (idx !== -1) {
            birds[idx] = mapBirdFromDb(newRecord);
            toast('Ave atualizada', { icon: '🔄' });
          }
        } else if (eventType === 'DELETE') {
          birds = birds.filter(b => b.id !== oldRecord.id);
          toast('Ave removida', { icon: '🗑️' });
        }
        return { ...prev, birds };
      });
    } else if (table === 'movements') {
      setState(prev => {
        let movements = [...prev.movements];
        if (eventType === 'INSERT') {
          const exists = movements.some(m => m.id === newRecord.id);
          if (!exists) {
            movements.push(mapMovementFromDb(newRecord));
            toast.success('Movimentação registrada');
          }
        } else if (eventType === 'UPDATE') {
          const idx = movements.findIndex(m => m.id === newRecord.id);
          if (idx !== -1) {
            movements[idx] = mapMovementFromDb(newRecord);
          }
        } else if (eventType === 'DELETE') {
          movements = movements.filter(m => m.id !== oldRecord.id);
        }
        return { ...prev, movements };
      });
    }
  };

  const mapBirdFromDb = (row: any): Bird => ({
    id: row.id,
    breederId: row.breeder_id ?? session?.user?.id ?? '',
    ringNumber: row.ring ?? '',
    name: row.name ?? '',
    species: row.species ?? '',
    sex: row.sex ?? 'Indeterminado',
    colorMutation: row.color_mutation ?? '',
    birthDate: row.birth_date ?? '',
    status: row.status ?? 'Ativo',
    location: row.location ?? '',
    photoUrl: row.photo_url,
    fatherId: row.father_id,
    motherId: row.mother_id,
    manualAncestors: row.manual_ancestors,
    classification: row.classification ?? 'Não Definido',
    songTrainingStatus: row.song_training_status ?? 'Não Iniciado',
    songType: row.song_type ?? '',
    songSource: row.song_source,
    trainingStartDate: row.training_start_date,
    trainingNotes: row.training_notes,
    isRepeater: row.is_repeater ?? false,
    sexing: row.sexing,
    documents: row.documents,
    ibamaBaixaPendente: row.ibama_baixa_pendente ?? false,
    ibamaBaixaData: row.ibama_baixa_data,
    createdAt: row.created_at ?? new Date().toISOString()
  });

  const mapMovementFromDb = (row: any): MovementRecord => ({
    id: row.id,
    birdId: row.bird_id ?? '',
    type: row.type ?? 'Transporte',
    date: row.date ?? '',
    notes: row.notes ?? '',
    gtrUrl: row.gtr_url,
    destination: row.destination,
    buyerSispass: row.buyer_sispass,
    deletedAt: row.deleted_at
  });

  const manualRefresh = async () => {
    if (!session?.user?.id || isRefreshing) return;
    setIsRefreshing(true);
    toast.loading('Atualizando dados...', { id: 'refresh' });
    try {
      await hydrateUserData(session);
      loadedTabsRef.current.clear(); // força recarregar todas as abas
      toast.success('Dados atualizados!', { id: 'refresh' });
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      toast.error('Erro ao atualizar', { id: 'refresh' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const navigateTo = (tab: string) => setActiveTab(tab);

  // Birds
  const addBird = async (bird: Bird): Promise<boolean> => {
    try {
      // 1. VALIDAÇÃO BÁSICA
      if (!bird.name || !bird.name.trim()) {
        throw new Error('Nome da ave é obrigatório');
      }

      // 2. VALIDAÇÃO: Verificar se ring_number já existe (APENAS se foi fornecido)
      // Filhotes recém-nascidos podem não ter anilha ainda
      if (bird.ringNumber && bird.ringNumber.trim()) {
        const ringNumberExists = state.birds.some(
          b => b.ringNumber && b.ringNumber?.toLowerCase() === bird.ringNumber?.toLowerCase()
        );
        
        if (ringNumberExists) {
          const existingBird = state.birds.find(
            b => b.ringNumber && b.ringNumber?.toLowerCase() === bird.ringNumber?.toLowerCase()
          );
          const msg = `❌ Número de anilha '${bird.ringNumber}' já está em uso na ave "${existingBird?.name}"`;
          toast.error(msg);
          console.warn('⚠ Validação: Ring number duplicado:', msg);
          return false;
        }
        console.log('✓ Validação OK: Ring number é único para o usuário');
      } else {
        console.log('ℹ Ave criada SEM anilha (pode ser filhote recém-nascido)');
      }

      // 3. ADICIONAR AO LOCAL STATE IMEDIATAMENTE (aparece na hora)
      setState(prev => ({ ...prev, birds: [...prev.birds, bird] }));
      const msgSucesso = bird.ringNumber ? '✅ Ave adicionada com sucesso!' : '✅ Filhote criado (anilha será adicionada depois)';
      toast.success(msgSucesso);
      
      // 4. SALVAR NO LOCALSTORAGE (backup instantâneo - PRINCIPAL)
      if (session?.user?.id) {
        try {
          const updatedState = { ...state, birds: [...state.birds, bird] };
          persistState(updatedState, session.user.id);
          console.log('✓ Ave salva no localStorage:', bird.name);
        } catch (err) {
          console.error('✗ Erro crítico ao salvar no localStorage:', err);
          throw new Error('Falha ao salvar no localStorage');
        }
      }

      // 5. SINCRONIZAR COM SUPABASE EM BACKGROUND (backup - não bloqueia UI)
      if (!supabaseUnavailable && session?.user?.id) {
        // Usar a mesma função para sincronizar
        saveBirdToSupabase(bird, session.user.id)
          .then((result) => {
            if (result.success) {
              console.log('✓ Ave sincronizada com Supabase:', bird.name);
            } else {
              console.warn('⚠ Aviso ao sincronizar Supabase:', result.error);
            }
          })
          .catch((err: any) => {
            console.warn('⚠ Erro ao sincronizar com Supabase (dados continuam no localStorage):', err);
            // Dados já estão no localStorage, então continua funcionando
          });
      }

      return true;
    } catch (e) {
      console.error('✗ addBird falhou:', e);
      const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Erro ao adicionar ave: ${errorMsg}`);
      return false;
    }
  };
  const updateBird = async (bird: Bird) => {
    try {
      // 1. ATUALIZAR NO LOCAL STATE IMEDIATAMENTE
      setState(prev => ({
        ...prev,
        birds: prev.birds.map(b => b.id === bird.id ? bird : b)
      }));
      toast.success('Ave atualizada com sucesso!');

      // 2. SALVAR NO LOCALSTORAGE (backup instantâneo - PRINCIPAL)
      if (session?.user?.id) {
        try {
          const updatedState = { 
            ...state, 
            birds: state.birds.map(b => b.id === bird.id ? bird : b)
          };
          persistState(updatedState, session.user.id);
          console.log('✓ Atualização salva no localStorage:', bird.name);
        } catch (err) {
          console.error('✗ Erro ao salvar atualização no localStorage:', err);
        }
      }

      // 3. SINCRONIZAR COM SUPABASE EM BACKGROUND (backup - não bloqueia)
      if (!supabaseUnavailable && session?.user?.id) {
        // Usar a mesma função para sincronizar
        saveBirdToSupabase(bird, session.user.id)
          .then((result) => {
            if (result.success) {
              console.log('✓ Atualização sincronizada com Supabase:', bird.name);
            } else {
              console.warn('⚠ Aviso ao sincronizar Supabase:', result.error);
            }
          })
          .catch((err: any) => {
            console.warn('⚠ Erro ao sincronizar atualização com Supabase (dados continuam no localStorage):', err);
          });
      }
    } catch (e) {
      console.error('✗ updateBird falhou:', e);
      toast.error('Erro ao atualizar ave');
    }
  };
  const deleteBird = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        // Deleta logicamente apenas na tabela principal (se existir)
        // A tabela birds é apenas sincronização de leitura, não mantém soft delete
      }
    } catch (e) {
      console.error('deleteBird failed', e);
    }
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
      // 1. Deletar REALMENTE do Supabase (exclusão permanente)
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase
          .from('birds')
          .delete()
          .eq('id', id)
          .eq('breeder_id', session.user.id);
        
        if (error) {
          console.error('❌ Erro ao deletar permanentemente ave:', error);
          toast.error('Erro ao deletar ave permanentemente');
          return;
        }
        console.log('✓ Ave deletada permanentemente do Supabase:', id);
      }

      // 2. Remover do estado local
      setState(prev => {
        const deletedBirds = (prev.deletedBirds || []).filter(b => b.id !== id);
        
        // Salvar no localStorage
        if (session?.user?.id) {
          try {
            const updatedState = { ...prev, deletedBirds };
            persistState(updatedState, session.user.id);
          } catch (err) {
            console.warn('Erro ao salvar deletedBirds no localStorage:', err);
          }
        }
        
        return { ...prev, deletedBirds };
      });
      
      toast.success('Ave removida permanentemente');
    } catch (e) {
      console.error('❌ permanentlyDeleteBird falhou:', e);
      toast.error('Erro ao deletar ave permanentemente');
    }
  };

  // Movements
  const addMovement = async (mov: MovementRecord) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbMov = { id: mov.id, user_id: session.user.id, bird_id: mov.birdId, type: mov.type, date: mov.date, notes: mov.notes, gtr_url: mov.gtrUrl, destination: mov.destination, buyer_sispass: mov.buyerSispass };
        const { error } = await supabase.from('movements').insert(dbMov);
        if (error) {
          console.error('Erro ao salvar movimentação:', error);
          throw error; // Lança erro para não continuar
        }
      }
    } catch (e) {
      console.error('addMovement failed', e);
      return; // Sai sem atualizar estado se falhar
    }
    
    // Só atualiza estado após sucesso no Supabase
    setState(prev => ({ ...prev, movements: [mov, ...prev.movements] }));
    
    // Atualizar status da ave baseado no tipo de movimentação
    const bird = state.birds.find(b => b.id === mov.birdId);
    if (bird) {
      let newStatus = bird.status;
      let ibamaBaixaPendente = bird.ibamaBaixaPendente || false;
      
      switch (mov.type) {
        case 'Óbito':
          newStatus = 'Óbito';
          ibamaBaixaPendente = true; // Precisa dar baixa no IBAMA
          break;
        case 'Venda':
          newStatus = 'Vendido';
          ibamaBaixaPendente = true; // Precisa registrar transferência no IBAMA
          break;
        case 'Doação':
          newStatus = 'Doado';
          ibamaBaixaPendente = true; // Precisa registrar doação no IBAMA
          break;
      }
      
      if (newStatus !== bird.status || ibamaBaixaPendente !== bird.ibamaBaixaPendente) {
        updateBird({ ...bird, status: newStatus, ibamaBaixaPendente });
      }
    }
  };
  const updateMovement = async (mov: MovementRecord) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbMov = { bird_id: mov.birdId, type: mov.type, date: mov.date, notes: mov.notes, gtr_url: mov.gtrUrl, destination: mov.destination, buyer_sispass: mov.buyerSispass };
        const { error } = await supabase.from('movements').update(dbMov).eq('id', mov.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar movimentação:', error);
      }
    } catch (e) {
      console.error('updateMovement failed', e);
    }
    setState(prev => ({
      ...prev,
      movements: prev.movements.map(m => (m.id === mov.id ? mov : m))
    }));
  };
  const deleteMovement = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('movements').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar movimentação:', error);
      }
    } catch (e) {
      console.error('deleteMovement failed', e);
    }
    setState(prev => {
      const found = prev.movements.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        movements: prev.movements.filter(m => m.id !== id),
        deletedMovements: [...(prev.deletedMovements || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
  };
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
  const addPair = async (pair: Pair) => {
    if (!pair.name || !pair.startDate || !pair.status) {
      console.warn('addPair validation failed: name, startDate e status são obrigatórios');
      return;
    }
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbPair = {
          id: pair.id,
          user_id: session.user.id,
          male_id: pair.maleId,
          female_id: pair.femaleId,
          name: pair.name,
          start_date: pair.startDate,
          end_date: pair.endDate,
          status: pair.status,
          last_hatch_date: pair.lastHatchDate
        };
        const { error } = await supabase.from('pairs').insert(dbPair);
        if (error) console.error('Erro ao salvar casal:', error);
      }
    } catch (e) {
      console.error('addPair failed', e);
    }
    setState(prev => ({ ...prev, pairs: [...prev.pairs, pair] }));
  };
  const updatePair = async (pair: Pair) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbPair = {
          male_id: pair.maleId,
          female_id: pair.femaleId,
          name: pair.name,
          start_date: pair.startDate,
          end_date: pair.endDate,
          status: pair.status,
          last_hatch_date: pair.lastHatchDate
        };
        const { error } = await supabase.from('pairs').update(dbPair).eq('id', pair.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar casal:', error);
      }
    } catch (e) {
      console.error('updatePair failed', e);
    }
    setState(prev => ({
      ...prev,
      pairs: prev.pairs.map(p => (p.id === pair.id ? pair : p))
    }));
  };
  const deletePair = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('pairs').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar casal:', error);
      }
    } catch (e) {
      console.error('deletePair failed', e);
    }
    setState(prev => {
      const found = prev.pairs.find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: prev.pairs.filter(p => p.id !== id),
        deletedPairs: [...(prev.deletedPairs || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
      // 1. Deletar REALMENTE do Supabase (exclusão permanente)
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase
          .from('pairs')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);
        
        if (error) {
          console.error('❌ Erro ao deletar permanentemente casal:', error);
          toast.error('Erro ao deletar casal permanentemente');
          return;
        }
        console.log('✓ Casal deletado permanentemente do Supabase:', id);
      }

      // 2. Remover do estado local
      setState(prev => {
        const deletedPairs = (prev.deletedPairs || []).filter(p => p.id !== id);
        
        // Salvar no localStorage
        if (session?.user?.id) {
          try {
            const updatedState = { ...prev, deletedPairs };
            persistState(updatedState, session.user.id);
          } catch (err) {
            console.warn('Erro ao salvar deletedPairs no localStorage:', err);
          }
        }
        
        return { ...prev, deletedPairs };
      });
      
      toast.success('Casal removido permanentemente');
    } catch (e) {
      console.error('❌ permanentlyDeletePair falhou:', e);
      toast.error('Erro ao deletar casal permanentemente');
    }
  };

  // Archive/Unarchive Pairs
  const archivePair = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('pairs').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao arquivar casal:', error);
      }
    } catch (e) {
      console.error('archivePair failed', e);
    }
    setState(prev => {
      const found = prev.pairs.find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: prev.pairs.filter(p => p.id !== id),
        archivedPairs: [...(prev.archivedPairs || []), { ...found, archivedAt: new Date().toISOString() }]
      };
    });
  };

  const unarchivePair = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('pairs').update({ archived_at: null }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao reativar casal:', error);
      }
    } catch (e) {
      console.error('unarchivePair failed', e);
    }
    setState(prev => {
      const found = (prev.archivedPairs || []).find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        pairs: [...prev.pairs, { ...found, archivedAt: undefined }],
        archivedPairs: (prev.archivedPairs || []).filter(p => p.id !== id)
      };
    });
  };

  const archiveFromTrashToPairs = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('pairs').update({ archived_at: new Date().toISOString(), deleted_at: null }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao mover para arquivo:', error);
      }
    } catch (e) {
      console.error('archiveFromTrashToPairs failed', e);
    }
    setState(prev => {
      const found = (prev.deletedPairs || []).find(p => p.id === id);
      if (!found) return prev;
      return {
        ...prev,
        deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id),
        archivedPairs: [...(prev.archivedPairs || []), { ...found, deletedAt: undefined, archivedAt: new Date().toISOString() }]
      };
    });
  };

  const addClutch = async (clutch: Clutch) => {
    if (!clutch.pairId || !clutch.layDate) {
      console.warn('addClutch validation failed: pairId e layDate são obrigatórios');
      return;
    }
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbClutch = {
          id: clutch.id,
          user_id: session.user.id,
          pair_id: clutch.pairId,
          lay_date: clutch.layDate,
          egg_count: clutch.eggCount,
          fertile_count: clutch.fertileCount,
          hatched_count: clutch.hatchedCount,
          notes: clutch.notes || ''
        };
        const { error } = await supabase.from('clutches').insert(dbClutch);
        if (error) console.error('Erro ao salvar postura:', error);
      }
    } catch (e) {
      console.error('addClutch failed', e);
    }
    setState(prev => ({ ...prev, clutches: [...prev.clutches, clutch] }));
  };
  const updateClutch = async (clutch: Clutch) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbClutch = {
          pair_id: clutch.pairId,
          lay_date: clutch.layDate,
          egg_count: clutch.eggCount,
          fertile_count: clutch.fertileCount,
          hatched_count: clutch.hatchedCount,
          notes: clutch.notes || ''
        };
        const { error } = await supabase.from('clutches').update(dbClutch).eq('id', clutch.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar postura:', error);
      }
    } catch (e) {
      console.error('updateClutch failed', e);
    }
    setState(prev => ({
      ...prev,
      clutches: prev.clutches.map(c => (c.id === clutch.id ? clutch : c))
    }));
  };

  // Medications
  const addMed = async (med: Medication) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbMed = {
          id: med.id,
          user_id: session.user.id,
          name: med.name,
          type: med.type,
          batch: med.batch,
          expiry_date: med.expiryDate,
          stock: med.stock
        };
        const { error } = await supabase.from('medications').insert(dbMed);
        if (error) console.error('Erro ao salvar medicamento:', error);
      }
    } catch (e) {
      console.error('addMed failed', e);
    }
    setState(prev => ({ ...prev, medications: [...prev.medications, med] }));
  };
  const updateMed = async (med: Medication) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbMed = {
          name: med.name,
          type: med.type,
          batch: med.batch,
          expiry_date: med.expiryDate,
          stock: med.stock
        };
        const { error } = await supabase.from('medications').update(dbMed).eq('id', med.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar medicamento:', error);
      }
    } catch (e) {
      console.error('updateMed failed', e);
    }
    setState(prev => ({
      ...prev,
      medications: prev.medications.map(m => (m.id === med.id ? med : m))
    }));
  };
  const deleteMed = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('medications').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar medicamento:', error);
      }
    } catch (e) {
      console.error('deleteMed failed', e);
    }
    setState(prev => {
      const found = prev.medications.find(m => m.id === id);
      if (!found) return prev;
      return {
        ...prev,
        medications: prev.medications.filter(m => m.id !== id),
        deletedMedications: [...(prev.deletedMedications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedMedications: (prev.deletedMedications || []).filter(m => m.id !== id) }));

  const applyMed = async (app: MedicationApplication) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbApp = {
          id: app.id,
          user_id: session.user.id,
          medication_id: app.medicationId,
          bird_id: app.birdId,
          date: app.date,
          dosage: app.dosage || '',
          notes: app.notes || '',
          treatment_id: app.treatmentId
        };
        const { error } = await supabase.from('applications').insert(dbApp);
        if (error) console.error('Erro ao salvar aplicação:', error);
      }
    } catch (e) {
      console.error('applyMed failed', e);
    }
    setState(prev => ({ ...prev, applications: [...prev.applications, app] }));
  };
  const updateApplication = async (app: MedicationApplication) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbApp = {
          medication_id: app.medicationId,
          bird_id: app.birdId,
          date: app.date,
          dosage: app.dosage || '',
          notes: app.notes || '',
          treatment_id: app.treatmentId
        };
        const { error } = await supabase.from('applications').update(dbApp).eq('id', app.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar aplicação:', error);
      }
    } catch (e) {
      console.error('updateApplication failed', e);
    }
    setState(prev => ({
      ...prev,
      applications: prev.applications.map(a => (a.id === app.id ? app : a))
    }));
  };
  const deleteApplication = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('applications').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar aplicação:', error);
      }
    } catch (e) {
      console.error('deleteApplication failed', e);
    }
    setState(prev => {
      const found = prev.applications.find(a => a.id === id);
      if (!found) return prev;
      return {
        ...prev,
        applications: prev.applications.filter(a => a.id !== id),
        deletedApplications: [...(prev.deletedApplications || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedApplications: (prev.deletedApplications || []).filter(a => a.id !== id) }));

  const addTreatment = async (t: ContinuousTreatment) => {
    if (!t.startDate || !t.frequency || !t.status) {
      console.warn('addTreatment validation failed: startDate, frequency e status são obrigatórios');
      return;
    }
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbTreat = { id: t.id, user_id: session.user.id, medication_id: t.medicationId, bird_id: t.birdId, start_date: t.startDate, end_date: t.endDate, frequency: t.frequency, dosage: t.dosage || '', status: t.status, notes: t.notes };
        const { error } = await supabase.from('treatments').insert(dbTreat);
        if (error) console.error('Erro ao salvar tratamento:', error);
      }
    } catch (e) {
      console.error('addTreatment failed', e);
    }
    setState(prev => ({ ...prev, treatments: [...prev.treatments, t] }));
  };
  const updateTreatment = async (t: ContinuousTreatment) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbTreat = { medication_id: t.medicationId, bird_id: t.birdId, start_date: t.startDate, end_date: t.endDate, frequency: t.frequency, dosage: t.dosage || '', status: t.status, notes: t.notes };
        const { error } = await supabase.from('treatments').update(dbTreat).eq('id', t.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar tratamento:', error);
      }
    } catch (e) {
      console.error('updateTreatment failed', e);
    }
    setState(prev => ({
      ...prev,
      treatments: prev.treatments.map(item => (item.id === t.id ? t : item))
    }));
  };
  const deleteTreatment = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('treatments').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar tratamento:', error);
      }
    } catch (e) {
      console.error('deleteTreatment failed', e);
    }
    setState(prev => {
      const found = prev.treatments.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        treatments: prev.treatments.filter(t => t.id !== id),
        deletedTreatments: [...(prev.deletedTreatments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedTreatments: (prev.deletedTreatments || []).filter(t => t.id !== id) }));

  // Finance
  const addTransaction = async (t: Transaction) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbTx = { id: t.id, user_id: session.user.id, type: t.type, amount: t.amount, date: t.date, category: t.category, subcategory: t.subcategory, description: t.description };
        const { error } = await supabase.from('transactions').insert(dbTx);
        if (error) console.error('Erro ao salvar transação:', error);
      }
    } catch (e) {
      console.error('addTransaction failed', e);
    }
    setState(prev => ({ ...prev, transactions: [...prev.transactions, t] }));
  };
  const deleteTransaction = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar transação:', error);
      }
    } catch (e) {
      console.error('deleteTransaction failed', e);
    }
    setState(prev => {
      const found = prev.transactions.find(tx => tx.id === id);
      if (!found) return prev;
      return {
        ...prev,
        transactions: prev.transactions.filter(tx => tx.id !== id),
        deletedTransactions: [...(prev.deletedTransactions || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedTransactions: (prev.deletedTransactions || []).filter(tx => tx.id !== id) }));

  // Tasks
  const addTask = async (t: MaintenanceTask) => {
    if (!t.title) {
      console.warn('addTask validation failed: title é obrigatório');
      return;
    }
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbTask = {
          id: t.id,
          user_id: session.user.id,
          title: t.title,
          due_date: t.dueDate,
          is_completed: t.isCompleted,
          bird_id: t.birdId,
          priority: t.priority,
          frequency: t.frequency,
          remind_me: t.remindMe ?? false
        };
        const { error } = await supabase.from('tasks').insert(dbTask);
        if (error) console.error('Erro ao salvar tarefa:', error);
      }
    } catch (e) {
      console.error('addTask failed', e);
    }
    setState(prev => ({ ...prev, tasks: [...prev.tasks, t] }));
  };
  const updateTask = async (t: MaintenanceTask) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbTask = {
          title: t.title,
          due_date: t.dueDate,
          is_completed: t.isCompleted,
          bird_id: t.birdId,
          priority: t.priority,
          frequency: t.frequency,
          remind_me: t.remindMe ?? false
        };
        const { error } = await supabase.from('tasks').update(dbTask).eq('id', t.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar tarefa:', error);
      }
    } catch (e) {
      console.error('updateTask failed', e);
    }
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => (task.id === t.id ? t : task))
    }));
  };
  const toggleTask = async (id: string) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const newCompleted = !task.isCompleted;
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('tasks').update({ is_completed: newCompleted }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao alternar tarefa:', error);
      }
    } catch (e) {
      console.error('toggleTask failed', e);
    }
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === id ? { ...task, isCompleted: newCompleted } : task
      )
    }));
  };
  const deleteTask = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar tarefa:', error);
      }
    } catch (e) {
      console.error('deleteTask failed', e);
    }
    setState(prev => {
      const found = prev.tasks.find(t => t.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== id),
        deletedTasks: [...(prev.deletedTasks || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedTasks: (prev.deletedTasks || []).filter(t => t.id !== id) }));

  // Tournaments
  const addEvent = async (e: TournamentEvent) => {
    if (!e.title) {
      console.warn('addEvent validation failed: title é obrigatório');
      return;
    }
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbEvent = {
          id: e.id,
          user_id: session.user.id,
          title: e.title,
          date: e.date,
          location: e.location,
          type: e.type,
          category: e.category,
          notes: e.notes,
          organizer: e.organizer,
          result: e.result,
          trophy: e.trophy,
          score: e.score,
          participating_birds: e.participatingBirds,
          preparation_checklist: e.preparationChecklist
        };
        const { error } = await supabase.from('tournaments').insert(dbEvent);
        if (error) console.error('Erro ao salvar evento:', error);
      }
    } catch (e) {
      console.error('addEvent failed', e);
    }
    setState(prev => ({ ...prev, tournaments: [...prev.tournaments, e] }));
  };
  const updateEvent = async (e: TournamentEvent) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbEvent = {
          title: e.title,
          date: e.date,
          location: e.location,
          type: e.type,
          category: e.category,
          notes: e.notes,
          organizer: e.organizer,
          result: e.result,
          trophy: e.trophy,
          score: e.score,
          participating_birds: e.participatingBirds,
          preparation_checklist: e.preparationChecklist
        };
        const { error } = await supabase.from('tournaments').update(dbEvent).eq('id', e.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar evento:', error);
      }
    } catch (e) {
      console.error('updateEvent failed', e);
    }
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments.map(ev => (ev.id === e.id ? e : ev))
    }));
  };
  const deleteEvent = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('tournaments').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar evento:', error);
      }
    } catch (e) {
      console.error('deleteEvent failed', e);
    }
    setState(prev => {
      const found = prev.tournaments.find(ev => ev.id === id);
      if (!found) return prev;
      return {
        ...prev,
        tournaments: prev.tournaments.filter(ev => ev.id !== id),
        deletedTournaments: [...(prev.deletedTournaments || []), { ...found, deletedAt: new Date().toISOString() }]
      };
    });
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
    setState(prev => ({ ...prev, deletedTournaments: (prev.deletedTournaments || []).filter(ev => ev.id !== id) }));

  const updateSettings = (settings: BreederSettings) =>
    setState(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));

  const handleLogout = async () => {
    // Reseta UI imediatamente para evitar travar no logout
    lastValidSessionRef.current = null;
    if (sessionRetryRef.current) {
      clearTimeout(sessionRetryRef.current);
      sessionRetryRef.current = null;
    }
    setIsAdmin(false);
    setSession(null);
    setState(defaultState);
    setActiveTab('dashboard');
    setIsLoading(false);

    // limpa caches (usuário atual e demais chaves com prefixo)
    const currentUserId = session?.user?.id;
    clearCachedState(currentUserId);
    clearAllCachedStates();
    clearSupabaseAuthStorage();

    // dispara signOut (escopo global) e aguarda para garantir limpeza de tokens
    if (!supabaseUnavailable) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err: any) {
        console.warn('Erro ao deslogar supabase', err);
      }
    }

    // redireciona para login limpo
    try {
      window.location.replace('/');
    } catch {
      /* ignore */
    }

    try {
      localStorage.removeItem('avigestao_migrated');
    } catch {
      /* ignore */
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard state={state} updateSettings={updateSettings} onSave={persistSettings} navigateTo={navigateTo} isAdmin={isAdmin} />;
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
      case 'documents':
        return <DocumentsManager settings={state.settings} updateSettings={updateSettings} onSave={persistSettings} />;
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
      case 'analytics':
        // Apenas usuários Profissional podem ver
        if (state.settings?.plan !== 'Profissional') {
          return (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Recurso Exclusivo PRO</h2>
              <p className="text-slate-600 mb-6">Analytics de verificações está disponível apenas para assinantes Profissional</p>
              <button
                onClick={() => navigateTo('settings')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Fazer Upgrade
              </button>
            </div>
          );
        }
        return <VerificationAnalytics />;
      default:
        return <Dashboard state={state} updateSettings={updateSettings} onSave={persistSettings} navigateTo={navigateTo} isAdmin={isAdmin} />;
    }
  };

  if (!session && !supabaseUnavailable) {
    // Verifica se é uma página de verificação de pássaro (sem autenticação necessária)
    const pathMatch = window.location.pathname.match(/^\/bird\/([a-zA-Z0-9-]+)$/);
    if (pathMatch) {
      const birdId = pathMatch[1];
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
          <BirdVerification birdId={birdId} />
        </Suspense>
      );
    }

    // Verifica se é uma página de reset de senha (token vem como hash)
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const hasResetToken = searchParams.has('resetToken');
    const isResetPassword = hash.includes('type=recovery') || hash.includes('type=magiclink') || hasResetToken;
    
    if (isResetPassword) {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
          <ResetPassword />
        </Suspense>
      );
    }
    
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
        <Auth onLogin={(settings?: Partial<BreederSettings>) => { 
          // Armazena breederName temporariamente se fornecido (novo signup)
          if (settings?.breederName) {
            try {
              localStorage.setItem('avigestao_pending_breeder_name', settings.breederName);
            } catch {}
          }
          /* sessão será tratada via supabase listener */ 
        }} />
      </Suspense>
    );
  }

  // Verifica reset de senha mesmo com sessão ativa (caso token expire)
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const hasResetToken = searchParams.has('resetToken');
  if (hash.includes('type=recovery') || hasResetToken) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
        <ResetPassword />
      </Suspense>
    );
  }

  // Verifica se é uma página de verificação de pássaro (acessível sem autenticação)
  const pathMatch = window.location.pathname.match(/^\/bird\/([a-zA-Z0-9-]+)$/);
  if (pathMatch) {
    const birdId = pathMatch[1];
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
        <BirdVerification birdId={birdId} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-[var(--primary-soft)] selection:text-[var(--primary)]">
      <Toaster position="top-right" />
      
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
        onRefresh={manualRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-bold">
            {authError}
          </div>
        )}
        <Suspense fallback={<div className="py-12 text-center">Carregando a página…</div>}>
          {renderContent()}
        </Suspense>
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









































