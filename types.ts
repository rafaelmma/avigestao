// ============================================================================
// TIPOS ENUMERADOS (correspondentes aos enums do banco Supabase)
// ============================================================================
export type BirdStatus =
  | 'Ativo'
  | 'Inativo'
  | 'Vendido'
  | 'Doado'
  | 'Falecido'
  | 'Criação'
  | 'Óbito'
  | 'Fuga'
  | 'Transferência';
export type Sex = 'Macho' | 'Fêmea' | 'Desconhecido';
export type BirdClassification = 'Exemplar' | 'Reprodutor' | 'Descarte';
export type TrainingStatus = 'Não Iniciado' | 'Em Progresso' | 'Concluído' | 'Certificado';
export type MovementType =
  | 'Entrada'
  | 'Saída'
  | 'Transferência'
  | 'Venda'
  | 'Doação'
  | 'Óbito'
  | 'Fuga';
export type MedicationType =
  | 'Antibiótico'
  | 'Vitamina'
  | 'Antiparasitário'
  | 'Desinfetante'
  | 'Outro';
export type EventType = 'Nascimento' | 'Sexagem' | 'Certificação' | 'Concurso' | 'Venda' | 'Outro';
export type SharePlatform = 'WhatsApp' | 'Email' | 'Facebook' | 'Instagram' | 'Twitter' | 'Outro';
export type SubscriptionPlan = 'Básico' | 'Profissional';

export interface SexingData {
  protocol: string; // Número do pedido/sexagem
  laboratory: string; // Laboratório
  sentDate: string; // Data de envio
  resultDate?: string; // Data do resultado/chegada
  attachmentUrl?: string; // Anexo do laudo (Base64)
  notes?: string;
}

export interface BirdDocument {
  id: string;
  title: string;
  date: string;
  type: 'Exame' | 'Foto' | 'Documento' | 'Outro';
  url?: string;
  notes?: string;
}

export type RingStatus = 'estoque' | 'usada' | 'perdida';

export interface RingBatch {
  id: string;
  supplier?: string;
  species?: string;
  quantity?: number;
  sizeMm?: string;
  year?: string;
  state?: string;
  color?: string;
  startNumber?: string;
  endNumber?: string;
  engravingType?: string;
  personalization?: string;
  notes?: string;
  createdAt?: string;
}

export interface RingItem {
  id: string;
  batchId?: string;
  code?: string;
  number?: string;
  year?: string;
  state?: string;
  color?: string;
  species?: string;
  sizeMm?: string;
  personalization?: string;
  status: RingStatus;
  assignedBirdId?: string;
  assignedBirdName?: string;
  assignedAt?: string;
  lostReason?: string;
  createdAt?: string;
}

export interface Bird {
  id: string;
  breederId: string; // UUID do criador (user_id)
  name: string;
  species: string;
  sex?: Sex;
  status: BirdStatus;
  ringNumber?: string;
  birthDate?: string;
  colorMutation?: string;
  classification?: BirdClassification;
  location?: string;
  fatherId?: string; // UUID do pai (bird)
  motherId?: string; // UUID da mãe (bird)
  songTrainingStatus?: TrainingStatus;
  songType?: string;
  songSource?: string;
  trainingStartDate?: string;
  trainingNotes?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  isPublic?: boolean; // Se o pássaro é visível publicamente
  // Campos legados (para compatibilidade com dados antigos)
  manualAncestors?: Record<string, string>;
  isRepeater?: boolean;
  sexing?: SexingData;
  documents?: BirdDocument[];
  ibamaBaixaPendente?: boolean;
  ibamaBaixaData?: string;
  deletedAt?: string;
}

export type TransactionCategory =
  | 'Venda de Aves'
  | 'Serviços'
  | 'Alimentação'
  | 'Saúde'
  | 'Manejo e Insumos'
  | 'Estrutura'
  | 'Taxas e Licenças'
  | 'Outros';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'Receita' | 'Despesa';
  category: TransactionCategory;
  subcategory?: string; // Novo campo para subitens (ex: Ração, Medicamento)
  deletedAt?: string;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  priority: 'Baixa' | 'Média' | 'Alta';
  birdId?: string;
  frequency?: 'Única' | 'Diária' | 'Semanal' | 'Mensal'; // Adicionado
  remindMe?: boolean; // Adicionado: Flag para destacar aviso
  tournamentId?: string;
  tournamentName?: string;
  notes?: string;
  deletedAt?: string;
}

export interface TournamentEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  type: 'Torneio' | 'Encontro' | 'Exposição';
  category: 'Fibra' | 'Canto' | 'Morfologia' | 'Social';
  notes?: string;
  organizer?: string;

  // Novos Campos Melhorados
  result?: string; // Mantido para compatibilidade (ex: "1º Lugar")
  trophy?: boolean; // Se ganhou troféu
  score?: number; // Pontuação ou Cantos

  participatingBirds?: string[]; // IDs dos pássaros
  preparationChecklist?: { item: string; checked: boolean }[]; // Checklist
  deletedAt?: string;
}

export interface MovementRecord {
  id: string;
  userId?: string;
  birdId?: string;
  type?: MovementType;
  date?: string;
  notes?: string;
  destination?: string;
  buyerSispass?: string;
  gtrUrl?: string;
  deletedAt?: string;
  // Campos IBAMA
  ibamaBaixaPendente?: boolean; // Se precisa registrar no IBAMA
  ibamaBaixaData?: string; // Data que foi registrado no IBAMA
  // Campos do receptor (para Doação/Venda/Transferência)
  receptorName?: string; // Nome de quem recebeu
  receptorDocument?: string; // IBAMA ou CPF do receptor
  receptorDocumentType?: 'ibama' | 'cpf'; // Tipo de documento
}

export interface Pair {
  id: string;
  userId: string;
  maleId?: string;
  femaleId?: string;
  name?: string;
  status?: string;
  startDate: string;
  endDate?: string;
  lastHatchDate?: string;
  archivedAt?: string;
  deletedAt?: string;
}

export interface Clutch {
  id: string;
  userId: string;
  pairId: string;
  layDate: string;
  eggCount: number;
  fertileCount: number;
  hatchedCount: number;
  notes: string;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  type?: MedicationType;
  batch?: string;
  expiryDate?: string;
  stock?: number;
  deletedAt?: string;
}

export interface MedicationCatalogItem {
  id: string;
  name: string;
  category?: string;
  indication?: string;
  prescription?: string;
  application?: string;
  manufacturer?: string;
  source?: string;
}

export interface MedicationApplication {
  id: string;
  birdId?: string;
  medicationId?: string;
  date: string;
  dosage: string;
  notes: string;
  treatmentId?: string;
  deletedAt?: string;
}

export interface ContinuousTreatment {
  id: string;
  birdId: string; // Pode ser 'ALL' para tratamento coletivo ou ID do pássaro
  medicationId: string;
  startDate: string;
  endDate?: string; // Opcional (se for contínuo indefinido)
  frequency: 'Diário' | '12h em 12h' | 'Semanal' | 'Mensal';
  dosage: string;
  status: 'Ativo' | 'Pausado' | 'Concluído';
  lastApplicationDate?: string;
  notes?: string;
  deletedAt?: string;
}

export type CertificateType =
  | 'A1 (Arquivo)'
  | 'A3 (Token USB)'
  | 'A3 (Cartão)'
  | 'Nuvem (BirdID/Vidaas)';

export interface DigitalCertificateData {
  issuer: string; // Órgão emissor (ex: Serasa, Certisign)
  expiryDate: string; // Validade
  installed: boolean; // Se está configurado/detectado (simulação)
  type: CertificateType; // Novo Campo
}

export interface ViewPreferences {
  showBirdImages?: boolean; // Mostrar imagens dos pássaros
  badgeSize?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg'; // Tamanho da badge de status
  compactMode?: boolean; // Modo compacto (menos espaçamento)
}

export interface AlertPreferences {
  showSispassAlert?: boolean; // Mostrar alerta de SISPASS
  showCertificateAlert?: boolean; // Mostrar alerta de Certificado
  showSubscriptionAlert?: boolean; // Mostrar alerta de Assinatura
  sispassWarningDays?: number; // Dias antes para alertar SISPASS (padrão: 30)
  certificateWarningDays?: number; // Dias antes para alertar Certificado (padrão: 30)
  subscriptionWarningDays?: number; // Dias antes para alertar Assinatura (padrão: 10)
}

export type WidgetSize = 'small' | 'medium' | 'large';

export type DashboardDensity = 'compact' | 'balanced' | 'airy';

export interface WidgetSizeConfig {
  [widgetId: string]: WidgetSize;
}

export interface BreederSettings {
  breederName: string;
  userId?: string;
  cpfCnpj: string;
  breederCategory?: string;
  responsibleName?: string;
  speciesRaised?: string;
  breederEmail?: string;
  breederPhone?: string;
  breederMobile?: string;
  breederWebsite?: string;
  addressCep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressComplement?: string;
  sispassNumber: string;
  sispassDocumentUrl?: string;
  registrationDate: string;
  renewalDate: string; // Vencimento Licenca SISPASS
  lastRenewalDate?: string; // Ultima Renovacao SISPASS
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  plan: SubscriptionPlan;
  trialEndDate?: string; // NOVA PROPRIEDADE: Data fim do periodo de teste
  dashboardLayout?: string[];
  certificate?: DigitalCertificateData; // Dados do Certificado Digital
  subscriptionEndDate?: string; // Fim do periodo atual da assinatura
  subscriptionCancelAtPeriodEnd?: boolean; // Se a recorrencia foi cancelada
  subscriptionStatus?: string; // Estado bruto vindo do Stripe (active, trialing, etc)
  subscriptionProvider?: string; // ex: 'mercadopago', 'stripe', 'manual'
  stripeCustomerId?: string; // Customer ID do Stripe quando existe assinatura
  communityOptIn?: boolean; // Aceitar aparecer na comunidade
  communityShowProfile?: boolean; // Exibir perfil público
  communityShowResults?: boolean; // Exibir resultados/estatísticas
  communityAllowContact?: boolean; // Permitir contato via comunidade
  subscriptionMonths?: number; // número de meses comprados (1,3,6,12)
  viewPreferences?: ViewPreferences; // Preferências de visualização do usuário
  alertPreferences?: AlertPreferences; // Preferências de alertas do dashboard
  widgetSizes?: WidgetSizeConfig; // Tamanhos personalizados dos widgets
  dashboardDensity?: DashboardDensity; // Densidade visual do dashboard
  sidebarCollapsedSections?: Record<string, boolean>; // Seções colapsadas do menu lateral
  lastActiveTab?: string; // Última aba acessada pelo usuário
  onboardingDismissed?: boolean; // Dicas do primeiro acesso dispensadas
}
// Estado global da aplicação
export interface AppState {
  birds: Bird[];
  deletedBirds?: Bird[];

  pairs: Pair[];
  archivedPairs?: Pair[];
  deletedPairs?: Pair[];

  clutches: Clutch[];

  medications: Medication[];
  deletedMedications?: Medication[];
  medicationCatalog: MedicationCatalogItem[];

  applications: MedicationApplication[];
  deletedApplications?: MedicationApplication[];

  treatments: ContinuousTreatment[];
  deletedTreatments?: ContinuousTreatment[];

  movements: MovementRecord[];
  deletedMovements?: MovementRecord[];

  transactions: Transaction[];
  deletedTransactions?: Transaction[];

  tasks: MaintenanceTask[];
  deletedTasks?: MaintenanceTask[];

  tournaments: TournamentEvent[];
  deletedTournaments?: TournamentEvent[];

  ringBatches?: RingBatch[];
  rings?: RingItem[];

  settings: BreederSettings;
}
