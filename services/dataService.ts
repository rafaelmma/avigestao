import { supabase } from "../lib/supabase";
import { INITIAL_SETTINGS, getDefaultBirdImage, isDefaultBirdImage } from "../constants";
import {
  Bird,
  BreederSettings,
  Clutch,
  ContinuousTreatment,
  MaintenanceTask,
  Medication,
  MedicationApplication,
  MedicationCatalogItem,
  MovementRecord,
  Pair,
  TournamentEvent,
  Transaction,
} from "../types";

const MED_CAT_CACHE_KEY = "avigestao_med_catalog_v1";
const MED_CAT_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
const MED_CAT_PREFETCH_DELAY = 5000; // 5s depois do load inicial
const isAbortError = (err: any) => {
  const msg = (err?.message || err?.details || '').toString();
  return err?.name === 'AbortError' || msg.includes('AbortError') || msg.includes('aborted');
};

const isTransientError = (err: any) => {
  const code = (err?.code || err?.status || '').toString();
  const msg = (err?.message || err?.details || '').toString().toLowerCase();
  if (['408','429','500','502','503','504'].includes(code)) return true;
  if (msg.includes('timeout') || msg.includes('temporarily') || msg.includes('network') || msg.includes('fetch')) return true;
  return false;
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const safeSelect = async <T>(queryFactory: () => any, mapFn: (row: any) => T, retries = 2): Promise<T[]> => {
  let attempt = 0;
  while (true) {
    try {
      const { data, error } = await queryFactory();
      if (error) throw error;
      return (data ?? []).map(mapFn);
    } catch (err) {
      if (isAbortError(err)) return [];
      if (attempt < retries && isTransientError(err)) {
        await sleep(300 * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      if (import.meta?.env?.DEV) console.warn("Falha ao carregar dados:", err);
      return [];
    }
  }
};

type SettingsFetchResult = { settings: BreederSettings | null; failed: boolean };

const safeSingleSettings = async (queryFactory: () => any, retries = 2): Promise<SettingsFetchResult> => {
  let attempt = 0;
  while (true) {
    try {
      const { data, error } = await queryFactory();
      if (error) throw error;
      return { settings: data ? mapSettingsFromDb(data) : null, failed: false };
    } catch (err) {
      if (isAbortError(err)) return { settings: null, failed: true };
      if (attempt < retries && isTransientError(err)) {
        await sleep(300 * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      if (import.meta?.env?.DEV) console.warn("Falha ao carregar settings:", err);
      return { settings: null, failed: true };
    }
  }
};

export const getCachedMedicationCatalog = (): MedicationCatalogItem[] | null => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(MED_CAT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed.cachedAt) return null;
    if (Date.now() - parsed.cachedAt > MED_CAT_CACHE_TTL) return null;
    return parsed.data as MedicationCatalogItem[];
  } catch {
    return null;
  }
};

export const cacheMedicationCatalog = (items: MedicationCatalogItem[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MED_CAT_CACHE_KEY, JSON.stringify({ data: items, cachedAt: Date.now() }));
  } catch {
    /* ignore cache errors */
  }
};

export async function loadInitialData(userId: string) {
  // ESTRATÉGIA: localStorage é SEMPRE principal
  // Supabase é apenas sincronização em background (nunca sobrescreve localStorage)
  
  // 1. SEMPRE tentar localStorage PRIMEIRO (instantâneo + confiável)
  const cachedState = loadCachedState(userId);
  if (cachedState.hasCache) {
    console.log('✓ Usando dados do localStorage (PRINCIPAL)');
    // Sincronizar com Supabase em background (não bloqueia UI)
    syncWithSupabaseInBackground(userId).catch(err => 
      console.warn('⚠ Erro ao sincronizar com Supabase em background:', err)
    );
    return cachedState.state!;
  }

  // 2. Se NÃO há cache em localStorage, tentar Supabase (para primeira vez)
  console.log('⚠ Nenhum cache em localStorage, carregando do Supabase...');
  
  let birdsFromSupabase: Bird[] = [];
  try {
    const { data: supabaseBirds, error } = await supabase
      .from('birds')
      .select('*')
      .eq('breeder_id', userId);
    
    if (!error && supabaseBirds && supabaseBirds.length > 0) {
      console.log(`✓ Carregados ${supabaseBirds.length} pássaros do Supabase (primeira vez)`);
      birdsFromSupabase = supabaseBirds.map(mapBirdFromDb);
    }
  } catch (err) {
    console.warn('⚠ Erro ao carregar birds do Supabase na primeira vez:', err);
  }

  const settingsPromise = safeSingleSettings(
    () => supabase.from("settings").select("*").eq("user_id", userId).maybeSingle()
  );

  // Initial data for dashboard and core UI only.
  try {
    const [birds, transactions, tasks, tournaments, clutches, pairs, archivedPairs, movements, settingsResult] = await Promise.all([
        // Se temos birds do Supabase, usar; senão carregar
        birdsFromSupabase.length > 0 
          ? Promise.resolve(birdsFromSupabase)
          : safeSelect(() => supabase.from("birds").select("*").eq("breeder_id", userId), mapBirdFromDb),
        safeSelect(() => supabase.from("transactions").select("*").eq("user_id", userId), mapTransactionFromDb),
        safeSelect(() => supabase.from("tasks").select("*").eq("user_id", userId), mapTaskFromDb),
        safeSelect(() => supabase.from("tournaments").select("*").eq("user_id", userId), mapTournamentFromDb),
        safeSelect(() => supabase.from("clutches").select("*").eq("user_id", userId), mapClutchFromDb),
        safeSelect(() => supabase.from("pairs").select("*").eq("user_id", userId).is("deleted_at", null).is("archived_at", null), mapPairFromDb),
        safeSelect(() => supabase.from("pairs").select("*").eq("user_id", userId).not("archived_at", "is", null).is("deleted_at", null), mapPairFromDb),
        safeSelect(() => supabase.from("movements").select("*").eq("user_id", userId).is("deleted_at", null), mapMovementFromDb),
        settingsPromise,
      ]) as any;

    const settings = settingsResult.settings;

    return {
      birds,
      movements,
      transactions,
      tasks,
      tournaments,
      medications: [],
      pairs,
      archivedPairs,
      clutches,
      applications: [],
      treatments: [],
      medicationCatalog: [],
      settings: settings ?? INITIAL_SETTINGS,
      settingsFailed: settingsResult.failed,
    };
  } catch (err) {
    console.error('❌ Falha ao carregar inicial do Supabase:', err);
    // NÃO retornar vazio! Retornar o que temos do localStorage como fallback
    // Se não tem nada, retornar estado padrão vazio
    console.log('⚠ Retornando estado padrão vazio (primeira vez, sem dados)');
    return {
      birds: [],
      movements: [],
      transactions: [],
      tasks: [],
      tournaments: [],
      medications: [],
      pairs: [],
      archivedPairs: [],
      clutches: [],
      applications: [],
      treatments: [],
      medicationCatalog: [],
      settings: INITIAL_SETTINGS,
      settingsFailed: true,
    };
  }
}

export async function loadTabData(userId: string, tab: string) {
  switch (tab) {
    case "movements":
      return {
        movements: await safeSelect(() => supabase.from("movements").select("*").eq("user_id", userId).is("deleted_at", null), mapMovementFromDb),
      };
    case "breeding":
      return {
        pairs: await safeSelect(() => supabase.from("pairs").select("*").eq("user_id", userId).is("deleted_at", null), mapPairFromDb),
        clutches: await safeSelect(() => supabase.from("clutches").select("*").eq("user_id", userId), mapClutchFromDb),
      };
    case "meds": {
      const medications = await safeSelect(() => supabase.from("medications").select("*").eq("user_id", userId), mapMedicationFromDb);
      const applications = await safeSelect(() => supabase.from("applications").select("*").eq("user_id", userId), mapApplicationFromDb);
      const treatments = await safeSelect(() => supabase.from("treatments").select("*").eq("user_id", userId), mapTreatmentFromDb);
      let medicationCatalog = getCachedMedicationCatalog() || [];
      if (medicationCatalog.length === 0) {
        const items = await safeSelect(
          () => supabase.from("medication_catalog").select("*"),
          mapMedicationCatalogFromDb
        );
        medicationCatalog = items;
        cacheMedicationCatalog(items);
      }
      return { medications, applications, treatments, medicationCatalog };
    }
    case "birds":
    case "sexing": {
      // IMPORTANTE: Carregar birds com fallback para localStorage se Supabase falhar
      const birdsFromSupabase = await safeSelect(
        () => supabase.from("birds").select("*").eq("breeder_id", userId),
        mapBirdFromDb
      );
      
      // Se conseguiu carregar do Supabase, retorna
      if (birdsFromSupabase && birdsFromSupabase.length > 0) {
        console.log(`✓ Carregados ${birdsFromSupabase.length} pássaros do Supabase na aba '${tab}'`);
        return { birds: birdsFromSupabase };
      }
      
      // Se falhou, tenta localStorage como fallback
      const cachedState = loadCachedState(userId);
      if (cachedState.hasCache && cachedState.state?.birds) {
        console.log(`⚠ Supabase falhou, usando localStorage como fallback (${cachedState.state.birds.length} aves)`);
        return { birds: cachedState.state.birds };
      }
      
      // Se não tem nada, retorna array vazio
      console.warn(`❌ Nenhuma ave encontrada em Supabase ou localStorage para aba '${tab}'`);
      return { birds: [] };
    }
    case "tasks":
      return {
        tasks: await safeSelect(() => supabase.from("tasks").select("*").eq("user_id", userId), mapTaskFromDb),
      };
    case "tournaments":
      return {
        tournaments: await safeSelect(() => supabase.from("tournaments").select("*").eq("user_id", userId), mapTournamentFromDb),
      };
    case "finance":
      return {
        transactions: await safeSelect(() => supabase.from("transactions").select("*").eq("user_id", userId), mapTransactionFromDb),
      };
    default:
      return {};
  }
}

export async function loadDeletedPairs(userId: string) {
  return {
    deletedPairs: await safeSelect(
      () => supabase.from("pairs").select("*").eq("user_id", userId).not("deleted_at", "is", null),
      mapPairFromDb
    ),
  };
}

export const mapBirdFromDb = (row: any): Bird => {
  const species = row.species ?? "";
  const sex = row.sex ?? "Desconhecido";
  const rawPhotoUrl = row.photo_url ?? row.photoUrl ?? undefined;
  const birthDate = row.birth_date ?? row.birthDate ?? undefined;
  const photoUrl = isDefaultBirdImage(rawPhotoUrl) ? getDefaultBirdImage(species, sex, birthDate) : rawPhotoUrl;

  return {
    id: row.id,
    breederId: row.breeder_id ?? row.breederId ?? "",
    ringNumber: row.ring_number ?? row.ring ?? row.ringNumber ?? "",
    species,
    name: row.name ?? "",
    sex: (row.sex ?? "Desconhecido") as any,
    colorMutation: row.color_mutation ?? row.colorMutation ?? "",
    birthDate: row.birth_date ?? row.birthDate ?? undefined,
    status: (row.status ?? "Ativo") as any,
    location: row.location ?? "",
    photoUrl,
    fatherId: row.father_id ?? row.fatherId ?? undefined,
    motherId: row.mother_id ?? row.motherId ?? undefined,
    classification: (row.classification ?? "Exemplar") as any,
    songTrainingStatus: (row.song_training_status ?? "Não Iniciado") as any,
    songType: row.song_type ?? row.songType ?? undefined,
    trainingNotes: row.training_notes ?? row.trainingNotes ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.updatedAt ?? undefined,
    // Campos legados (compatibilidade)
    manualAncestors: row.manual_ancestors ?? row.manualAncestors ?? undefined,
    isRepeater: row.is_repeater ?? row.isRepeater ?? false,
    sexing: row.sexing ?? undefined,
    documents: row.documents ?? undefined,
    ibamaBaixaPendente: row.ibama_baixa_pendente ?? row.ibamaBaixaPendente ?? false,
    ibamaBaixaData: row.ibama_baixa_data ?? row.ibamaBaixaData ?? undefined,
    deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
  };
};

export const mapMovementFromDb = (row: any): MovementRecord => ({
  id: row.id,
  userId: row.user_id ?? row.userId ?? undefined,
  birdId: row.bird_id ?? row.birdId ?? undefined,
  type: (row.type ?? "Transferência") as any,
  date: row.date ?? undefined,
  notes: row.notes ?? undefined,
  destination: row.destination ?? undefined,
  buyerSispass: row.buyer_sispass ?? row.buyerSispass ?? undefined,
  gtrUrl: row.gtr_url ?? row.gtrUrl ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  description: row.description ?? "",
  amount: Number(row.amount ?? 0),
  date: row.date ?? "",
  type: row.type ?? "Despesa",
  category: row.category ?? "Outros",
  subcategory: row.subcategory ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapTaskFromDb = (row: any): MaintenanceTask => ({
  id: row.id,
  title: row.title ?? "",
  dueDate: row.due_date ?? row.dueDate ?? "",
  isCompleted: row.is_completed ?? row.isCompleted ?? false,
  priority: (row.priority ?? "Média") as any,
  birdId: row.bird_id ?? row.birdId ?? undefined,
  frequency: row.frequency ?? undefined,
  remindMe: row.remind_me ?? row.remindMe ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapTournamentFromDb = (row: any): TournamentEvent => ({
  id: row.id,
  title: row.title ?? "",
  date: row.date ?? "",
  location: row.location ?? "",
  type: row.type ?? "Torneio",
  category: row.category ?? "Canto",
  notes: row.notes ?? undefined,
  organizer: row.organizer ?? undefined,
  result: row.result ?? undefined,
  trophy: row.trophy ?? undefined,
  score: row.score ?? undefined,
  participatingBirds: row.participating_birds ?? row.participatingBirds ?? undefined,
  preparationChecklist: row.preparation_checklist ?? row.preparationChecklist ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapMedicationFromDb = (row: any): Medication => ({
  id: row.id,
  userId: row.user_id ?? row.userId ?? "",
  name: row.name ?? "",
  type: (row.type ?? "Outro") as any,
  batch: row.batch ?? undefined,
  expiryDate: row.expiry_date ?? row.expiryDate ?? undefined,
  stock: row.stock ?? 0,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapMedicationCatalogFromDb = (row: any): MedicationCatalogItem => ({
  id: row.id,
  name: row.name ?? "",
  category: row.category ?? undefined,
  indication: row.indication ?? undefined,
  prescription: row.prescription ?? undefined,
  application: row.application ?? undefined,
  manufacturer: row.manufacturer ?? undefined,
  source: row.source ?? undefined,
});

export const mapPairFromDb = (row: any): Pair => ({
  id: row.id,
  userId: row.user_id ?? row.userId ?? "",
  maleId: row.male_id ?? row.maleId ?? undefined,
  femaleId: row.female_id ?? row.femaleId ?? undefined,
  startDate: row.start_date ?? row.startDate ?? "",
  endDate: row.end_date ?? row.endDate ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapClutchFromDb = (row: any): Clutch => ({
  id: row.id,
  userId: row.user_id ?? row.userId ?? "",
  pairId: row.pair_id ?? row.pairId ?? "",
  layDate: row.lay_date ?? row.layDate ?? "",
  eggCount: row.egg_count ?? row.eggCount ?? 0,
  fertileCount: row.fertile_count ?? row.fertileCount ?? 0,
  hatchedCount: row.hatched_count ?? row.hatchedCount ?? 0,
  notes: row.notes ?? "",
});

export const mapApplicationFromDb = (row: any): MedicationApplication => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? undefined,
  medicationId: row.medication_id ?? row.medicationId ?? undefined,
  date: row.date ?? "",
  dosage: row.dosage ?? "",
  notes: row.notes ?? "",
  treatmentId: row.treatment_id ?? row.treatmentId ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapTreatmentFromDb = (row: any): ContinuousTreatment => {
  const rawBirdId = row.bird_id ?? row.birdId ?? null;
  return {
    id: row.id,
    birdId: rawBirdId ? rawBirdId : "ALL",
    medicationId: row.medication_id ?? row.medicationId ?? "",
    startDate: row.start_date ?? row.startDate ?? "",
    endDate: row.end_date ?? row.endDate ?? undefined,
    frequency: (row.frequency ?? "Diário") as any,
    dosage: row.dosage ?? "",
    status: (row.status ?? "Ativo") as any,
    lastApplicationDate: row.last_application_date ?? row.lastApplicationDate ?? undefined,
    notes: row.notes ?? undefined,
    deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
  };
};

export const mapSettingsFromDb = (row: any): BreederSettings => ({
  breederName: row.breeder_name ?? row.breederName ?? INITIAL_SETTINGS.breederName,
  userId: row.user_id ?? row.userId ?? undefined,
  cpfCnpj: row.cpf_cnpj ?? row.cpfCnpj ?? "",
  sispassNumber: row.sispass_number ?? row.sispassNumber ?? "",
  sispassDocumentUrl: row.sispass_document_url ?? row.sispassDocumentUrl ?? undefined,
  registrationDate: row.registration_date ?? row.registrationDate ?? "",
  renewalDate: row.renewal_date ?? row.renewalDate ?? "",
  lastRenewalDate: row.last_renewal_date ?? row.lastRenewalDate ?? undefined,
  logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
  primaryColor: row.primary_color ?? row.primaryColor ?? INITIAL_SETTINGS.primaryColor,
  accentColor: row.accent_color ?? row.accentColor ?? INITIAL_SETTINGS.accentColor,
  plan: row.plan ?? INITIAL_SETTINGS.plan,
  trialEndDate: normalizeTrialEndDate(row.trial_end_date ?? row.trialEndDate),
  dashboardLayout: row.dashboard_layout ?? row.dashboardLayout ?? undefined,
  certificate: row.certificate ?? undefined,
  subscriptionEndDate: row.subscription_end_date ?? row.subscriptionEndDate ?? undefined,
  subscriptionCancelAtPeriodEnd: row.subscription_cancel_at_period_end ?? row.subscriptionCancelAtPeriodEnd ?? undefined,
  subscriptionStatus: row.subscription_status ?? row.subscriptionStatus ?? undefined,
});

function normalizeTrialEndDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  // Expirou? Trate como trial inexistente para evitar reativar permissões PRO.
  return parsed.getTime() >= Date.now() ? parsed.toISOString().split("T")[0] : undefined;
}

/**
 * Sincroniza dados com Supabase em background (não bloqueia UI)
 * Usado quando localStorage é carregado primeiro
 */
async function syncWithSupabaseInBackground(userId: string) {
  try {
    // Sincroniza birds silenciosamente
    await safeSelect(
      () => supabase.from("birds").select("*").eq("breeder_id", userId),
      mapBirdFromDb
    );
    // Se chegou aqui, Supabase está respondendo
    console.log('✓ Sincronizado com Supabase com sucesso');
  } catch (err) {
    console.warn('Background sync com Supabase falhou (será tentado novamente):', err);
    // Continua mesmo assim - localStorage já tem os dados
  }
}

// Função para carregar do cache (já deve existir em App.tsx)
function loadCachedState(userId: string) {
  try {
    const storageKey = `avigestao_state_v2:${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return { hasCache: false, state: null };
    
    const { data } = JSON.parse(stored);
    return {
      hasCache: true,
      state: {
        birds: data.birds || [],
        movements: data.movements || [],
        transactions: data.transactions || [],
        tasks: data.tasks || [],
        tournaments: data.tournaments || [],
        medications: data.medications || [],
        pairs: data.pairs || [],
        archivedPairs: data.archivedPairs || [],
        clutches: data.clutches || [],
        applications: data.applications || [],
        treatments: data.treatments || [],
        medicationCatalog: data.medicationCatalog || [],
        settings: data.settings || INITIAL_SETTINGS,
        settingsFailed: false,
      }
    };
  } catch (err) {
    console.warn('Erro ao carregar cache:', err);
    return { hasCache: false, state: null };
  }
}
