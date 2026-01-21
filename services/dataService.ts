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

const TIMEOUT_MS = 10000;
const MED_CAT_CACHE_KEY = "avigestao_med_catalog_v1";
const MED_CAT_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
const MED_CAT_PREFETCH_DELAY = 5000; // 5s depois do load inicial

const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
};

const safeSelect = async <T>(query: any, mapFn: (row: any) => T): Promise<T[]> => {
  try {
    const { data, error } = await withTimeout(query);
    if (error) throw error;
    return (data ?? []).map(mapFn);
  } catch (err) {
    console.warn("Falha ao carregar dados (ignorado):", err);
    return [];
  }
};

const safeSingleSettings = async (query: any): Promise<BreederSettings | null> => {
  try {
    const { data, error } = await withTimeout(query);
    if (error) throw error;
    return data ? mapSettingsFromDb(data) : null;
  } catch (err) {
    console.warn("Falha ao carregar settings (ignorado):", err);
    return null;
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
  const settingsPromise = safeSingleSettings(
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle()
  );

  // Carregamento crítico (sem catálogo) para renderizar rápido
  const [
    birds,
    movements,
    transactions,
    tasks,
    tournaments,
    medications,
    pairs,
    clutches,
    applications,
    treatments,
    settings,
  ] = await Promise.all([
    safeSelect(supabase.from("birds").select("*").eq("user_id", userId), mapBirdFromDb),
    safeSelect(supabase.from("movements").select("*").eq("user_id", userId), mapMovementFromDb),
    safeSelect(supabase.from("transactions").select("*").eq("user_id", userId), mapTransactionFromDb),
    safeSelect(supabase.from("tasks").select("*").eq("user_id", userId), mapTaskFromDb),
    safeSelect(supabase.from("tournaments").select("*").eq("user_id", userId), mapTournamentFromDb),
    safeSelect(supabase.from("medications").select("*").eq("user_id", userId), mapMedicationFromDb),
    safeSelect(supabase.from("pairs").select("*").eq("user_id", userId), mapPairFromDb),
    safeSelect(supabase.from("clutches").select("*").eq("user_id", userId), mapClutchFromDb),
    safeSelect(supabase.from("applications").select("*").eq("user_id", userId), mapApplicationFromDb),
    safeSelect(supabase.from("treatments").select("*").eq("user_id", userId), mapTreatmentFromDb),
    settingsPromise,
  ]);

  // Catálogo de medicamentos carregado em segundo plano com cache
  let medicationCatalog = getCachedMedicationCatalog() || [];
  if (medicationCatalog.length === 0) {
    // dispara após render inicial
    setTimeout(async () => {
      const items = await safeSelect(
        supabase.from("medication_catalog").select("*"),
        mapMedicationCatalogFromDb
      );
      cacheMedicationCatalog(items);
    }, MED_CAT_PREFETCH_DELAY);
  }

  return {
    birds,
    movements,
    transactions,
    tasks,
    tournaments,
    medications,
    pairs,
    clutches,
    applications,
    treatments,
    medicationCatalog,
    settings: settings ?? INITIAL_SETTINGS,
  };
}

export const mapBirdFromDb = (row: any): Bird => {
  const species = row.species ?? "";
  const sex = row.sex ?? "Indeterminado";
  const rawPhotoUrl = row.photo_url ?? row.photoUrl ?? undefined;
  const photoUrl = isDefaultBirdImage(rawPhotoUrl) ? getDefaultBirdImage(species, sex) : rawPhotoUrl;

  return {
    id: row.id,
    ringNumber: row.ring ?? row.ringNumber ?? "",
    species,
    name: row.name ?? "",
    sex,
    colorMutation: row.color_mutation ?? row.colorMutation ?? "",
    birthDate: row.birth_date ?? row.birthDate ?? "",
    status: row.status ?? "Ativo",
    location: row.location ?? "",
    photoUrl,
    fatherId: row.father_id ?? row.fatherId ?? undefined,
    motherId: row.mother_id ?? row.motherId ?? undefined,
    manualAncestors: row.manual_ancestors ?? row.manualAncestors ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    classification: (row.classification ?? "NÆo Definido") as any,
    songTrainingStatus: (row.song_training_status ?? row.songTrainingStatus ?? "NÆo Iniciado") as any,
    songType: row.song_type ?? row.songType ?? "",
    songSource: row.song_source ?? row.songSource ?? undefined,
    trainingStartDate: row.training_start_date ?? row.trainingStartDate ?? undefined,
    trainingNotes: row.training_notes ?? row.trainingNotes ?? undefined,
    isRepeater: row.is_repeater ?? row.isRepeater ?? false,
    sexing: row.sexing ?? undefined,
    documents: row.documents ?? undefined,
    deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
  };
};

export const mapMovementFromDb = (row: any): MovementRecord => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? "",
  type: row.type,
  date: row.date,
  notes: row.notes ?? "",
  gtrUrl: row.gtr_url ?? row.gtrUrl ?? undefined,
  destination: row.destination ?? undefined,
  buyerSispass: row.buyer_sispass ?? row.buyerSispass ?? undefined,
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
  priority: (row.priority ?? "Media") as any,
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
  name: row.name ?? "",
  type: row.type ?? "",
  batch: row.batch ?? "",
  expiryDate: row.expiry_date ?? row.expiryDate ?? "",
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
  maleId: row.male_id ?? row.maleId ?? "",
  femaleId: row.female_id ?? row.femaleId ?? "",
  startDate: row.start_date ?? row.startDate ?? "",
  endDate: row.end_date ?? row.endDate ?? undefined,
  status: row.status ?? "Ativo",
  name: row.name ?? "",
  lastHatchDate: row.last_hatch_date ?? row.lastHatchDate ?? undefined,
  deletedAt: row.deleted_at ?? row.deletedAt ?? undefined,
});

export const mapClutchFromDb = (row: any): Clutch => ({
  id: row.id,
  pairId: row.pair_id ?? row.pairId ?? "",
  layDate: row.lay_date ?? row.layDate ?? "",
  eggCount: row.egg_count ?? row.eggCount ?? 0,
  fertileCount: row.fertile_count ?? row.fertileCount ?? 0,
  hatchedCount: row.hatched_count ?? row.hatchedCount ?? 0,
  notes: row.notes ?? "",
});

export const mapApplicationFromDb = (row: any): MedicationApplication => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? "",
  medicationId: row.medication_id ?? row.medicationId ?? "",
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
    frequency: (row.frequency ?? "Diario") as any,
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
