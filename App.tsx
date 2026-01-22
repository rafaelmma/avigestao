import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
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
import { supabase, SUPABASE_MISSING } from './lib/supabase';
import { loadInitialData, loadTabData, loadDeletedPairs } from './services/dataService';

const STORAGE_KEY = 'avigestao_state';
const HYDRATE_TIMEOUT_MS = 15000; // 15s - reduced for faster UX

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

const DEFAULT_SESSION_TIMEOUT_MS = 8000;
const SESSION_RETRY_DELAY_MS = 2000;
const SESSION_RETRY_LIMIT = 3;
const SESSION_RETRY_MAX_DELAY_MS = 10000;

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
  const lastValidSessionRef = useRef<any>(null);
  const sessionRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRetryCountRef = useRef(0);
  const loadedTabsRef = useRef(new Set<string>());
  const sessionClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSession = async () => {
    const resp: any = await supabase.auth.getSession();
    return resp?.data?.session ?? null;
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
  const persistState = (value: AppState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
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
    if (!session || !hasHydratedOnce) return;
    persistState(state);
  }, [state, session, hasHydratedOnce]);
  // Bootstrap session
  useEffect(() => {
    if (supabaseUnavailable) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      const cached = loadCachedState();
      if (cached.hasCache) {
        setState(cached.state);
        setHasHydratedOnce(true);
        setIsLoading(false);
      }
      try {
        const session = await fetchSession();
        if (!mounted) return;
        sessionRetryCountRef.current = 0;
        setAuthError(null);
        await handleSession(session);
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
        if (data && Object.keys(data).length > 0) {
          setState(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.warn('Falha ao carregar dados da aba', tab, err);
      } finally {
        loadedTabsRef.current.add(tab);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, session, supabaseUnavailable]);
  const handleSession = async (newSession: any) => {
    if (!newSession) {
      // Don't clear immediately — returning from external pages (Stripe)
      // can cause a transient missing session. Revalidate immediately and
      // only clear after a short grace period if the session is still null.
      if (sessionClearRef.current) {
        clearTimeout(sessionClearRef.current);
      }
      // trigger a quick revalidation right away (focus/visibility handlers also do this)
      revalidateSession();

      // fallback: if session not recovered after grace period, clear state
      const GRACE_MS = isLikelyStripeReturn() ? 10000 : 4000;
      sessionClearRef.current = setTimeout(async () => {
        try {
          const s = await fetchSession();
          if (s) {
            // session recovered, hydrate normally
            await handleSession(s);
            return;
          }
        } catch (e) {
          console.warn('Re-check session failed', e);
        }

        if (lastValidSessionRef.current) {
          // keep last valid state to avoid UI flash
          console.info('Sessao temporariamente indisponivel, mantendo o ultimo estado valido');
          setAuthError(null);
          setHasHydratedOnce(true);
          setIsLoading(false);
          return;
        }

        // truly signed out — clear local state
        lastValidSessionRef.current = null;
        loadedTabsRef.current = new Set();
        setSession(null);
        setIsAdmin(false);
        setState(defaultState);
        setHasHydratedOnce(false);
        setIsLoading(false);
      }, GRACE_MS);

      return;
    }

    lastValidSessionRef.current = newSession;
    setSession(newSession);

    // Mostra cache local imediatamente e libera UI
    const cached = loadCachedState();
    if (cached.hasCache) {
      setState(cached.state);
      setHasHydratedOnce(true);
      setIsLoading(false);
    } else {
      setHasHydratedOnce(false);
      setIsLoading(true);
    }
    
    setAuthError(null);
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

    // Migração local desativada para evitar chamadas extras ao Supabase
    try { localStorage.setItem('avigestao_migrated', 'true'); } catch {}

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
      // Sem timeout para não abortar hidratação
      const data = await loadInitialData(userId);
      const settingsFailed = data.settingsFailed;
      const cachedSettings = loadCachedState().state.settings;
      let workingSettings = settingsFailed ? cachedSettings : (data.settings || defaultState.settings);

      let subscriptionEndDate = workingSettings?.subscriptionEndDate;
      let subscriptionCancelAtPeriodEnd = workingSettings?.subscriptionCancelAtPeriodEnd;
      let subscriptionStatus = workingSettings?.subscriptionStatus;

      const hasSettingsRow = !settingsFailed && !!workingSettings?.userId;
      if (!hasSettingsRow && !settingsFailed) {
        const fallbackSettings: BreederSettings = {
          ...(workingSettings || defaultState.settings),
          breederName: currentSession.user?.email || defaultState.settings.breederName,
          plan: workingSettings?.plan || defaultState.settings.plan,
        };
        workingSettings = fallbackSettings;
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
      } else if (!settingsFailed && !workingSettings?.breederName && currentSession.user?.email) {
        workingSettings = { ...(workingSettings || {}), breederName: currentSession.user.email };
      }
      // Checa status da assinatura no backend e forca plano PRO se estiver ativo
      if (supabase) {
        try {
          const token = currentSession.access_token;
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
              workingSettings = {
                ...(workingSettings || {}),
                plan: 'Profissional',
                trialEndDate: undefined
              } as BreederSettings;
            } else if (!isAdmin) {
              workingSettings = {
                ...(workingSettings || {}),
                plan: workingSettings?.trialEndDate ? workingSettings.plan : 'Básico'
              } as BreederSettings;
            }
          }
        } catch (e) {
          console.warn('Nao foi possivel verificar status da assinatura', e);
        }
      }

      // Se nao tem plano PRO nem trial, aplica trial de 7 dias e persiste
      if (!settingsFailed) {
        workingSettings = await ensureTrial(workingSettings || defaultState.settings);
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
      setState({
        ...defaultState,
        ...data,
        settings: normalizedSettings
      });

      // Carrega pares deletados em background
      if (!supabaseUnavailable) {
        try {
          const deletedData = await loadDeletedPairs(userId);
          setState(prev => ({ ...prev, ...deletedData }));
        } catch (err) {
          console.warn('Falha ao carregar pares deletados:', err);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setAuthError(err?.message || 'Erro ao carregar dados');
      // mantém estado atual para evitar voltar ao perfil default
    }
  };

  const navigateTo = (tab: string) => setActiveTab(tab);

  // Birds
  const addBird = async (bird: Bird): Promise<boolean> => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbBird = {
          id: bird.id,
          user_id: session.user.id,
          ring: bird.ringNumber,
          name: bird.name,
          species: bird.species,
          sex: bird.sex,
          color_mutation: bird.colorMutation,
          birth_date: bird.birthDate,
          status: bird.status,
          location: bird.location,
          photo_url: bird.photoUrl,
          father_id: bird.fatherId,
          mother_id: bird.motherId,
          manual_ancestors: bird.manualAncestors,
          classification: bird.classification,
          song_training_status: bird.songTrainingStatus,
          song_type: bird.songType,
          song_source: bird.songSource,
          training_start_date: bird.trainingStartDate,
          training_notes: bird.trainingNotes,
          is_repeater: bird.isRepeater,
          sexing: bird.sexing,
          documents: bird.documents,
          created_at: bird.createdAt || new Date().toISOString()
        };
        const { error } = await supabase.from('birds').insert(dbBird);
        if (error) {
          console.error('Erro ao salvar ave no Supabase:', error);
          return false;
        }
      }
      setState(prev => ({ ...prev, birds: [...prev.birds, bird] }));
      return true;
    } catch (e) {
      console.error('addBird failed', e);
      return false;
    }
  };
  const updateBird = async (bird: Bird) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbBird = {
          ring: bird.ringNumber,
          name: bird.name,
          species: bird.species,
          sex: bird.sex,
          color_mutation: bird.colorMutation,
          birth_date: bird.birthDate,
          status: bird.status,
          location: bird.location,
          photo_url: bird.photoUrl,
          father_id: bird.fatherId,
          mother_id: bird.motherId,
          manual_ancestors: bird.manualAncestors,
          classification: bird.classification,
          song_training_status: bird.songTrainingStatus,
          song_type: bird.songType,
          song_source: bird.songSource,
          training_start_date: bird.trainingStartDate,
          training_notes: bird.trainingNotes,
          is_repeater: bird.isRepeater,
          sexing: bird.sexing,
          documents: bird.documents
        };
        const { error } = await supabase.from('birds').update(dbBird).eq('id', bird.id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao atualizar ave:', error);
      }
    } catch (e) {
      console.error('updateBird failed', e);
    }
    setState(prev => ({
      ...prev,
      birds: prev.birds.map(b => (b.id === bird.id ? bird : b))
    }));
  };
  const deleteBird = async (id: string) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const { error } = await supabase.from('birds').update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('user_id', session.user.id);
        if (error) console.error('Erro ao deletar ave:', error);
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
  const permanentlyDeleteBird = (id: string) =>
    setState(prev => ({ ...prev, deletedBirds: (prev.deletedBirds || []).filter(b => b.id !== id) }));

  // Movements
  const addMovement = async (mov: MovementRecord) => {
    try {
      if (!supabaseUnavailable && session?.user?.id) {
        const dbMov = { id: mov.id, user_id: session.user.id, bird_id: mov.birdId, type: mov.type, date: mov.date, notes: mov.notes, gtr_url: mov.gtrUrl, destination: mov.destination, buyer_sispass: mov.buyerSispass };
        const { error } = await supabase.from('movements').insert(dbMov);
        if (error) console.error('Erro ao salvar movimentação:', error);
      }
    } catch (e) {
      console.error('addMovement failed', e);
    }
    setState(prev => ({ ...prev, movements: [mov, ...prev.movements] }));
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
  const permanentlyDeletePair = (id: string) =>
    setState(prev => ({ ...prev, deletedPairs: (prev.deletedPairs || []).filter(p => p.id !== id) }));

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

  const persistSettings = async (settings: BreederSettings) => {
    if (supabaseUnavailable || !session?.user?.id) return;
    const userId = session.user.id;
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
    } catch (err) {
      console.warn('Falha ao persistir settings', err);
      try {
        await supabase.from('settings').upsert(minimalPayload as any, { onConflict: 'user_id' });
      } catch (fallbackErr) {
        console.warn('Falha ao persistir settings (fallback)', fallbackErr);
      }
    }
  };
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
      default:
        return <Dashboard state={state} updateSettings={updateSettings} navigateTo={navigateTo} isAdmin={isAdmin} />;
    }
  };

  if (!session && !supabaseUnavailable) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando…</div>}>
        <Auth onLogin={() => { /* sessão será tratada via supabase listener */ }} />
      </Suspense>
    );
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








































