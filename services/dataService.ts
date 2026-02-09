import { INITIAL_SETTINGS, getDefaultBirdImage, isDefaultBirdImage } from '../constants';
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
  Sex,
  BirdStatus,
  BirdClassification,
  TrainingStatus,
  MovementType,
  SexingData,
  BirdDocument,
  DigitalCertificateData,
} from '../types';

const MED_CAT_CACHE_KEY = 'avigestao_med_catalog_v1';
const MED_CAT_CACHE_TTL = 1000 * 60 * 60 * 24; // 24h
// const MED_CAT_PREFETCH_DELAY = 5000; // 5s depois do load inicial (removido)
// safeSingleSettings removed — settings are loaded from Firestore in the migration flow.

export const getCachedMedicationCatalog = (): MedicationCatalogItem[] | null => {
  if (typeof localStorage === 'undefined') return null;
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
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MED_CAT_CACHE_KEY, JSON.stringify({ data: items, cachedAt: Date.now() }));
  } catch {
    /* ignore cache errors */
  }
};

export async function loadInitialData(userId: string) {
  // ESTRATÉGIA: localStorage é SEMPRE principal

  // 1. SEMPRE tentar localStorage PRIMEIRO (instantâneo + confiável)
  const cachedState = loadCachedState(userId);
  if (cachedState.hasCache) {
    console.log('✓ Usando dados do localStorage (PRINCIPAL)');
    return cachedState.state!;
  }

  // Initial data for dashboard and core UI only.
  try {
    // Carregar apenas via Firestore
    const [
      birds,
      transactions,
      tasks,
      tournaments,
      clutches,
      pairs,
      archivedPairs,
      movements,
      medications,
      applications,
    ] = await Promise.all([
      // Firestore service functions
      (await import('./firestoreService')).getBirds(userId),
      (await import('./firestoreService')).getTransactions(userId),
      (await import('./firestoreService')).getTasks(userId),
      (await import('./firestoreService')).getTournaments(userId),
      (await import('./firestoreService')).getClutches(userId),
      (await import('./firestoreService')).getPairs(userId),
      Promise.resolve([]), // archivedPairs: not available, placeholder
      (await import('./firestoreService')).getMovements(userId),
      (await import('./firestoreService')).getMedications(userId),
      (await import('./firestoreService')).getApplications(userId),
    ]);

    const settings = ((await import('./firestoreService')).getSettings(userId)) as Promise<BreederSettings | null>;
    const resolvedSettings = await settings;

    return {
      birds,
      movements,
      transactions,
      tasks,
      tournaments,
      medications,
      pairs,
      archivedPairs,
      clutches,
      applications,
      treatments: [],
      medicationCatalog: [],
      settings: resolvedSettings ?? INITIAL_SETTINGS,
      settingsFailed: false,
    };
  } catch (err) {
    console.error('❌ Falha ao carregar dados iniciais do Firestore:', err);
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
    case 'movements':
      return {
        movements: await (await import('./firestoreService')).getMovements(userId),
      };
    case 'breeding':
      return {
        pairs: await (await import('./firestoreService')).getPairs(userId),
        clutches: await (await import('./firestoreService')).getClutches(userId),
      };
    case 'meds': {
      const medications = await (await import('./firestoreService')).getMedications(userId);
      const applications = await (await import('./firestoreService')).getApplications(userId);
      const treatments = await (await import('./firestoreService')).getTreatments(userId);
      let medicationCatalog = getCachedMedicationCatalog() || [];
      if (medicationCatalog.length === 0) {
        const items = await (await import('./firestoreService')).getMedicationCatalog();
        medicationCatalog = items;
        cacheMedicationCatalog(items);
      }
      return { medications, applications, treatments, medicationCatalog };
    }
    case 'birds':
    case 'sexing': {
      // IMPORTANTE: Carregar birds com fallback para localStorage se Firestore falhar
      const birdsFromFirestore = await (await import('./firestoreService')).getBirds(userId);
      if (birdsFromFirestore && birdsFromFirestore.length > 0) {
        return { birds: birdsFromFirestore };
      }

      const cachedState = loadCachedState(userId);
      if (cachedState.hasCache && cachedState.state?.birds) {
        return { birds: cachedState.state.birds };
      }

      return { birds: [] };
    }
    case 'tasks':
      return {
        tasks: await (await import('./firestoreService')).getTasks(userId),
      };
    case 'tournaments':
      return {
        tournaments: await (await import('./firestoreService')).getTournaments(userId),
      };
    case 'finance':
      return {
        transactions: await (await import('./firestoreService')).getTransactions(userId),
      };
    default:
      return {};
  }
}

export async function loadDeletedPairs() {
  return {
    deletedPairs: [],
  };
}

export const mapBirdFromDb = (row: Record<string, unknown>): Bird => {
  const species = (row['species'] ?? '') as string;
  const sex = (typeof row['sex'] === 'string' ? (row['sex'] as Sex) : ('Desconhecido' as Sex)) as Sex;
  const rawPhotoUrl = (row['photo_url'] ?? row['photoUrl'] ?? undefined) as string | undefined;
  const birthDate = (row['birth_date'] ?? row['birthDate'] ?? undefined) as string | undefined;
  const photoUrl = isDefaultBirdImage(rawPhotoUrl)
    ? getDefaultBirdImage(species, String(sex), birthDate)
    : rawPhotoUrl;

  return {
    id: String(row['id'] ?? ''),
    breederId: String(row['breeder_id'] ?? row['breederId'] ?? ''),
    ringNumber: String(row['ring_number'] ?? row['ring'] ?? row['ringNumber'] ?? ''),
    species,
    name: String(row['name'] ?? ''),
    sex: sex as Sex,
    colorMutation: String(row['color_mutation'] ?? row['colorMutation'] ?? ''),
    birthDate: birthDate,
    status: (typeof row['status'] === 'string' ? (row['status'] as BirdStatus) : ('Ativo' as BirdStatus)) as BirdStatus,
    location: String(row['location'] ?? ''),
    photoUrl,
    fatherId: (row['father_id'] ?? row['fatherId'] ?? undefined) as string | undefined,
    motherId: (row['mother_id'] ?? row['motherId'] ?? undefined) as string | undefined,
    classification: (typeof row['classification'] === 'string' ? (row['classification'] as BirdClassification) : ('Exemplar' as BirdClassification)) as BirdClassification,
    songTrainingStatus: (typeof row['song_training_status'] === 'string' ? (row['song_training_status'] as TrainingStatus) : ('Não Iniciado' as TrainingStatus)) as TrainingStatus,
    songType: (row['song_type'] ?? row['songType'] ?? undefined) as string | undefined,
    trainingNotes: (row['training_notes'] ?? row['trainingNotes'] ?? undefined) as string | undefined,
    createdAt: (row['created_at'] ?? row['createdAt'] ?? new Date().toISOString()) as string,
    updatedAt: (row['updated_at'] ?? row['updatedAt'] ?? undefined) as string | undefined,
    // Campos legados (compatibilidade)
    manualAncestors: (row['manual_ancestors'] ?? row['manualAncestors'] ?? undefined) as Record<string, string> | undefined,
    isRepeater: (row['is_repeater'] ?? row['isRepeater'] ?? false) as boolean,
    sexing: (row['sexing'] ?? undefined) as SexingData | undefined,
    documents: (row['documents'] ?? undefined) as BirdDocument[] | undefined,
    ibamaBaixaPendente: (row['ibama_baixa_pendente'] ?? row['ibamaBaixaPendente'] ?? false) as boolean,
    ibamaBaixaData: (row['ibama_baixa_data'] ?? row['ibamaBaixaData'] ?? undefined) as string | undefined,
    deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
  };
};

export const mapMovementFromDb = (row: Record<string, unknown>): MovementRecord => ({
  id: String(row['id'] ?? ''),
  userId: (row['user_id'] ?? row['userId'] ?? undefined) as string | undefined,
  birdId: (row['bird_id'] ?? row['birdId'] ?? undefined) as string | undefined,
  type: (typeof row['type'] === 'string' ? (row['type'] as MovementType) : ('Transferência' as MovementType)) as MovementType,
  date: (row['date'] ?? undefined) as string | undefined,
  notes: (row['notes'] ?? undefined) as string | undefined,
  destination: (row['destination'] ?? undefined) as string | undefined,
  buyerSispass: (row['buyer_sispass'] ?? row['buyerSispass'] ?? undefined) as string | undefined,
  gtrUrl: (row['gtr_url'] ?? row['gtrUrl'] ?? undefined) as string | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapTransactionFromDb = (row: Record<string, unknown>): Transaction => ({
  id: String(row['id'] ?? ''),
  description: String(row['description'] ?? ''),
  amount: Number(row['amount'] ?? 0),
  date: String(row['date'] ?? ''),
  type: (typeof row['type'] === 'string' ? (row['type'] as Transaction['type']) : ('Despesa' as Transaction['type'])) as Transaction['type'],
  category: (typeof row['category'] === 'string' ? (row['category'] as Transaction['category']) : ('Outros' as Transaction['category'])) as Transaction['category'],
  subcategory: (row['subcategory'] ?? undefined) as string | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapTaskFromDb = (row: Record<string, unknown>): MaintenanceTask => ({
  id: String(row['id'] ?? ''),
  title: String(row['title'] ?? ''),
  dueDate: String(row['due_date'] ?? row['dueDate'] ?? ''),
  isCompleted: (row['is_completed'] ?? row['isCompleted'] ?? false) as boolean,
  priority: (typeof row['priority'] === 'string' ? (row['priority'] as MaintenanceTask['priority']) : ('Média' as MaintenanceTask['priority'])) as MaintenanceTask['priority'],
  birdId: (row['bird_id'] ?? row['birdId'] ?? undefined) as string | undefined,
  frequency:
    typeof row['frequency'] === 'string' &&
    ['Única', 'Diária', 'Semanal', 'Mensal'].includes(row['frequency'])
      ? (row['frequency'] as MaintenanceTask['frequency'])
      : undefined,
  remindMe: (row['remind_me'] ?? row['remindMe'] ?? undefined) as boolean | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapTournamentFromDb = (row: Record<string, unknown>): TournamentEvent => ({
  id: String(row['id'] ?? ''),
  title: String(row['title'] ?? ''),
  date: String(row['date'] ?? ''),
  location: String(row['location'] ?? ''),
  type: (typeof row['type'] === 'string' ? (row['type'] as TournamentEvent['type']) : ('Torneio' as TournamentEvent['type'])) as TournamentEvent['type'],
  category: (typeof row['category'] === 'string' ? (row['category'] as TournamentEvent['category']) : ('Canto' as TournamentEvent['category'])) as TournamentEvent['category'],
  notes: (row['notes'] ?? undefined) as string | undefined,
  organizer: (row['organizer'] ?? undefined) as string | undefined,
  result: (row['result'] ?? undefined) as string | undefined,
  trophy: (row['trophy'] ?? undefined) as boolean | undefined,
  score: (row['score'] ?? undefined) as number | undefined,
  participatingBirds: (row['participating_birds'] ?? row['participatingBirds'] ?? undefined) as string[] | undefined,
  preparationChecklist: (row['preparation_checklist'] ?? row['preparationChecklist'] ?? undefined) as { item: string; checked: boolean }[] | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapMedicationFromDb = (row: Record<string, unknown>): Medication => ({
  id: String(row['id'] ?? ''),
  userId: String(row['user_id'] ?? row['userId'] ?? ''),
  name: String(row['name'] ?? ''),
  type: (typeof row['type'] === 'string' ? (row['type'] as Medication['type']) : ('Outro' as Medication['type'])) as Medication['type'],
  batch: (row['batch'] ?? undefined) as string | undefined,
  expiryDate: (row['expiry_date'] ?? row['expiryDate'] ?? undefined) as string | undefined,
  stock: Number(row['stock'] ?? 0),
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapMedicationCatalogFromDb = (row: Record<string, unknown>): MedicationCatalogItem => ({
  id: String(row['id'] ?? ''),
  name: String(row['name'] ?? ''),
  category: (row['category'] ?? undefined) as string | undefined,
  indication: (row['indication'] ?? undefined) as string | undefined,
  prescription: (row['prescription'] ?? undefined) as string | undefined,
  application: (row['application'] ?? undefined) as string | undefined,
  manufacturer: (row['manufacturer'] ?? undefined) as string | undefined,
  source: (row['source'] ?? undefined) as string | undefined,
});

export const mapPairFromDb = (row: Record<string, unknown>): Pair => ({
  id: String(row['id'] ?? ''),
  userId: String(row['user_id'] ?? row['userId'] ?? ''),
  maleId: (row['male_id'] ?? row['maleId'] ?? undefined) as string | undefined,
  femaleId: (row['female_id'] ?? row['femaleId'] ?? undefined) as string | undefined,
  startDate: String(row['start_date'] ?? row['startDate'] ?? ''),
  endDate: (row['end_date'] ?? row['endDate'] ?? undefined) as string | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapClutchFromDb = (row: Record<string, unknown>): Clutch => ({
  id: String(row['id'] ?? ''),
  userId: String(row['user_id'] ?? row['userId'] ?? ''),
  pairId: String(row['pair_id'] ?? row['pairId'] ?? ''),
  layDate: String(row['lay_date'] ?? row['layDate'] ?? ''),
  eggCount: Number(row['egg_count'] ?? row['eggCount'] ?? 0),
  fertileCount: Number(row['fertile_count'] ?? row['fertileCount'] ?? 0),
  hatchedCount: Number(row['hatched_count'] ?? row['hatchedCount'] ?? 0),
  notes: String(row['notes'] ?? ''),
});

export const mapApplicationFromDb = (row: Record<string, unknown>): MedicationApplication => ({
  id: String(row['id'] ?? ''),
  birdId: (row['bird_id'] ?? row['birdId'] ?? undefined) as string | undefined,
  medicationId: (row['medication_id'] ?? row['medicationId'] ?? undefined) as string | undefined,
  date: String(row['date'] ?? ''),
  dosage: String(row['dosage'] ?? ''),
  notes: (row['notes'] ?? '' ) as string,
  treatmentId: (row['treatment_id'] ?? row['treatmentId'] ?? undefined) as string | undefined,
  deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
});

export const mapTreatmentFromDb = (row: Record<string, unknown>): ContinuousTreatment => {
  const rawBirdId = (row['bird_id'] ?? row['birdId'] ?? null) as string | null;
  return {
    id: String(row['id'] ?? ''),
    birdId: rawBirdId ? rawBirdId : 'ALL',
    medicationId: String(row['medication_id'] ?? row['medicationId'] ?? ''),
    startDate: String(row['start_date'] ?? row['startDate'] ?? ''),
    endDate: (row['end_date'] ?? row['endDate'] ?? undefined) as string | undefined,
    frequency: (row['frequency'] ?? 'Diário') as ContinuousTreatment['frequency'],
    dosage: String(row['dosage'] ?? ''),
    status: (row['status'] ?? 'Ativo') as ContinuousTreatment['status'],
    lastApplicationDate: (row['last_application_date'] ?? row['lastApplicationDate'] ?? undefined) as string | undefined,
    notes: (row['notes'] ?? undefined) as string | undefined,
    deletedAt: (row['deleted_at'] ?? row['deletedAt'] ?? undefined) as string | undefined,
  };
};

export const mapSettingsFromDb = (row: Record<string, unknown>): BreederSettings => ({
  breederName: String(row['breeder_name'] ?? row['breederName'] ?? INITIAL_SETTINGS.breederName),
  userId: (row['user_id'] ?? row['userId'] ?? undefined) as string | undefined,
  cpfCnpj: String(row['cpf_cnpj'] ?? row['cpfCnpj'] ?? ''),
  breederCategory: String(row['breeder_category'] ?? row['breederCategory'] ?? ''),
  responsibleName: String(row['responsible_name'] ?? row['responsibleName'] ?? ''),
  speciesRaised: String(row['species_raised'] ?? row['speciesRaised'] ?? ''),
  breederEmail: String(row['breeder_email'] ?? row['breederEmail'] ?? ''),
  breederPhone: String(row['breeder_phone'] ?? row['breederPhone'] ?? ''),
  breederMobile: String(row['breeder_mobile'] ?? row['breederMobile'] ?? ''),
  breederWebsite: String(row['breeder_website'] ?? row['breederWebsite'] ?? ''),
  addressCep: String(row['address_cep'] ?? row['addressCep'] ?? ''),
  addressStreet: String(row['address_street'] ?? row['addressStreet'] ?? ''),
  addressNumber: String(row['address_number'] ?? row['addressNumber'] ?? ''),
  addressNeighborhood: String(row['address_neighborhood'] ?? row['addressNeighborhood'] ?? ''),
  addressCity: String(row['address_city'] ?? row['addressCity'] ?? ''),
  addressState: String(row['address_state'] ?? row['addressState'] ?? ''),
  addressComplement: String(row['address_complement'] ?? row['addressComplement'] ?? ''),
  sispassNumber: String(row['sispass_number'] ?? row['sispassNumber'] ?? ''),
  sispassDocumentUrl: (row['sispass_document_url'] ?? row['sispassDocumentUrl'] ?? undefined) as string | undefined,
  registrationDate: String(row['registration_date'] ?? row['registrationDate'] ?? ''),
  renewalDate: String(row['renewal_date'] ?? row['renewalDate'] ?? ''),
  lastRenewalDate: (row['last_renewal_date'] ?? row['lastRenewalDate'] ?? undefined) as string | undefined,
  logoUrl: (row['logo_url'] ?? row['logoUrl'] ?? undefined) as string | undefined,
  primaryColor: String(row['primary_color'] ?? row['primaryColor'] ?? INITIAL_SETTINGS.primaryColor),
  accentColor: String(row['accent_color'] ?? row['accentColor'] ?? INITIAL_SETTINGS.accentColor),
  plan: (row['plan'] ?? INITIAL_SETTINGS.plan) as BreederSettings['plan'],
  trialEndDate: normalizeTrialEndDate((row['trial_end_date'] ?? row['trialEndDate']) as string | undefined),
  dashboardLayout: parseStringArray(row['dashboard_layout'] ?? row['dashboardLayout']),
  certificate: parseCertificate(row['certificate']),
  subscriptionEndDate: (row['subscription_end_date'] ?? row['subscriptionEndDate'] ?? undefined) as string | undefined,
  subscriptionCancelAtPeriodEnd: (row['subscription_cancel_at_period_end'] ?? row['subscriptionCancelAtPeriodEnd'] ?? undefined) as boolean | undefined,
  subscriptionStatus: (row['subscription_status'] ?? row['subscriptionStatus'] ?? undefined) as string | undefined,
});

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string') as string[];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string') as string[];
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseCertificate(value: unknown): DigitalCertificateData | undefined {
  if (value && typeof value === 'object') {
    return value as DigitalCertificateData;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed as DigitalCertificateData;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function normalizeTrialEndDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return undefined;
  // Expirou? Trate como trial inexistente para evitar reativar permissões PRO.
  return parsed.getTime() >= Date.now() ? parsed.toISOString().split('T')[0] : undefined;
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
      },
    };
  } catch (err) {
    console.warn('Erro ao carregar cache:', err);
    return { hasCache: false, state: null };
  }
}
