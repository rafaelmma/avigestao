import { supabase } from "../lib/supabase";
import { INITIAL_SETTINGS, getDefaultBirdImage, isDefaultBirdImage } from "../constants";
import { Bird, BreederSettings, Clutch, ContinuousTreatment, MaintenanceTask, Medication, MedicationApplication, MovementRecord, Pair, TournamentEvent, Transaction } from "../types";

export async function loadInitialData(userId: string) {
  const queries = await Promise.all([
    supabase.from("birds").select("*").eq("user_id", userId),
    supabase.from("movements").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("tournaments").select("*").eq("user_id", userId),
    supabase.from("medications").select("*").eq("user_id", userId),
    supabase.from("pairs").select("*").eq("user_id", userId),
    supabase.from("clutches").select("*").eq("user_id", userId),
    supabase.from("applications").select("*").eq("user_id", userId),
    supabase.from("treatments").select("*").eq("user_id", userId),
    supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const [birds, movements, transactions, tasks, tournaments, medications, pairs, clutches, applications, treatments, settings] = queries;

  return {
    birds: (birds.data ?? []).map(mapBirdFromDb),
    movements: (movements.data ?? []).map(mapMovementFromDb),
    transactions: (transactions.data ?? []).map(mapTransactionFromDb),
    tasks: (tasks.data ?? []).map(mapTaskFromDb),
    tournaments: (tournaments.data ?? []).map(mapTournamentFromDb),
    medications: (medications.data ?? []).map(mapMedicationFromDb),
    pairs: (pairs.data ?? []).map(mapPairFromDb),
    clutches: (clutches.data ?? []).map(mapClutchFromDb),
    applications: (applications.data ?? []).map(mapApplicationFromDb),
    treatments: (treatments.data ?? []).map(mapTreatmentFromDb),
    settings: settings.data ? mapSettingsFromDb(settings.data) : INITIAL_SETTINGS,
  };
}

export const mapBirdFromDb = (row: any): Bird => {
  const species = row.species ?? '';
  const sex = row.sex ?? 'Indeterminado';
  const rawPhotoUrl = row.photo_url ?? row.photoUrl ?? undefined;
  const photoUrl = isDefaultBirdImage(rawPhotoUrl)
    ? getDefaultBirdImage(species, sex)
    : rawPhotoUrl;

  return {
    id: row.id,
    ringNumber: row.ring ?? row.ringNumber ?? '',
    species,
    name: row.name ?? '',
    sex,
    colorMutation: row.color_mutation ?? row.colorMutation ?? '',
    birthDate: row.birth_date ?? row.birthDate ?? '',
    status: row.status ?? 'Ativo',
    location: row.location ?? '',
    photoUrl,
    fatherId: row.father_id ?? row.fatherId ?? undefined,
    motherId: row.mother_id ?? row.motherId ?? undefined,
    manualAncestors: row.manual_ancestors ?? row.manualAncestors ?? undefined,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    classification: (row.classification ?? 'Nao Definido') as any,
    songTrainingStatus: (row.song_training_status ?? row.songTrainingStatus ?? 'Nao Iniciado') as any,
    songType: row.song_type ?? row.songType ?? '',
    songSource: row.song_source ?? row.songSource ?? undefined,
    trainingStartDate: row.training_start_date ?? row.trainingStartDate ?? undefined,
    trainingNotes: row.training_notes ?? row.trainingNotes ?? undefined,
    isRepeater: row.is_repeater ?? row.isRepeater ?? false,
    sexing: row.sexing ?? undefined,
    documents: row.documents ?? undefined,
  };
};

export const mapMovementFromDb = (row: any): MovementRecord => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? '',
  type: row.type,
  date: row.date,
  notes: row.notes ?? '',
  gtrUrl: row.gtr_url ?? row.gtrUrl ?? undefined,
  destination: row.destination ?? undefined,
  buyerSispass: row.buyer_sispass ?? row.buyerSispass ?? undefined,
});

export const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  description: row.description ?? '',
  amount: Number(row.amount ?? 0),
  date: row.date ?? '',
  type: row.type ?? 'Despesa',
  category: row.category ?? 'Outros',
  subcategory: row.subcategory ?? undefined,
});

export const mapTaskFromDb = (row: any): MaintenanceTask => ({
  id: row.id,
  title: row.title ?? '',
  dueDate: row.due_date ?? row.dueDate ?? '',
  isCompleted: row.is_completed ?? row.isCompleted ?? false,
  priority: (row.priority ?? 'Media') as any,
  birdId: row.bird_id ?? row.birdId ?? undefined,
  frequency: row.frequency ?? undefined,
  remindMe: row.remind_me ?? row.remindMe ?? undefined,
});

export const mapTournamentFromDb = (row: any): TournamentEvent => ({
  id: row.id,
  title: row.title ?? '',
  date: row.date ?? '',
  location: row.location ?? '',
  type: row.type ?? 'Torneio',
  category: row.category ?? 'Canto',
  notes: row.notes ?? undefined,
  organizer: row.organizer ?? undefined,
  result: row.result ?? undefined,
  trophy: row.trophy ?? undefined,
  score: row.score ?? undefined,
  participatingBirds: row.participating_birds ?? row.participatingBirds ?? undefined,
  preparationChecklist: row.preparation_checklist ?? row.preparationChecklist ?? undefined,
});

export const mapMedicationFromDb = (row: any): Medication => ({
  id: row.id,
  name: row.name ?? '',
  type: row.type ?? '',
  batch: row.batch ?? '',
  expiryDate: row.expiry_date ?? row.expiryDate ?? '',
  stock: row.stock ?? 0,
});

export const mapPairFromDb = (row: any): Pair => ({
  id: row.id,
  maleId: row.male_id ?? row.maleId ?? '',
  femaleId: row.female_id ?? row.femaleId ?? '',
  startDate: row.start_date ?? row.startDate ?? '',
  endDate: row.end_date ?? row.endDate ?? undefined,
  status: row.status ?? 'Ativo',
  name: row.name ?? '',
  lastHatchDate: row.last_hatch_date ?? row.lastHatchDate ?? undefined,
});

export const mapClutchFromDb = (row: any): Clutch => ({
  id: row.id,
  pairId: row.pair_id ?? row.pairId ?? '',
  layDate: row.lay_date ?? row.layDate ?? '',
  eggCount: row.egg_count ?? row.eggCount ?? 0,
  fertileCount: row.fertile_count ?? row.fertileCount ?? 0,
  hatchedCount: row.hatched_count ?? row.hatchedCount ?? 0,
  notes: row.notes ?? '',
});

export const mapApplicationFromDb = (row: any): MedicationApplication => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? '',
  medicationId: row.medication_id ?? row.medicationId ?? '',
  date: row.date ?? '',
  dosage: row.dosage ?? '',
  notes: row.notes ?? '',
  treatmentId: row.treatment_id ?? row.treatmentId ?? undefined,
});

export const mapTreatmentFromDb = (row: any): ContinuousTreatment => ({
  id: row.id,
  birdId: row.bird_id ?? row.birdId ?? '',
  medicationId: row.medication_id ?? row.medicationId ?? '',
  startDate: row.start_date ?? row.startDate ?? '',
  endDate: row.end_date ?? row.endDate ?? undefined,
  frequency: (row.frequency ?? 'Diario') as any,
  dosage: row.dosage ?? '',
  status: (row.status ?? 'Ativo') as any,
  lastApplicationDate: row.last_application_date ?? row.lastApplicationDate ?? undefined,
  notes: row.notes ?? undefined,
});

export const mapSettingsFromDb = (row: any): BreederSettings => ({
  breederName: row.breeder_name ?? row.breederName ?? INITIAL_SETTINGS.breederName,
  userId: row.user_id ?? row.userId ?? undefined,
  cpfCnpj: row.cpf_cnpj ?? row.cpfCnpj ?? '',
  sispassNumber: row.sispass_number ?? row.sispassNumber ?? '',
  sispassDocumentUrl: row.sispass_document_url ?? row.sispassDocumentUrl ?? undefined,
  registrationDate: row.registration_date ?? row.registrationDate ?? '',
  renewalDate: row.renewal_date ?? row.renewalDate ?? '',
  lastRenewalDate: row.last_renewal_date ?? row.lastRenewalDate ?? undefined,
  logoUrl: row.logo_url ?? row.logoUrl ?? undefined,
  primaryColor: row.primary_color ?? row.primaryColor ?? INITIAL_SETTINGS.primaryColor,
  accentColor: row.accent_color ?? row.accentColor ?? INITIAL_SETTINGS.accentColor,
  plan: row.plan ?? INITIAL_SETTINGS.plan,
  trialEndDate: row.trial_end_date ?? row.trialEndDate ?? undefined,
  dashboardLayout: row.dashboard_layout ?? row.dashboardLayout ?? undefined,
  certificate: row.certificate ?? undefined,
});
