export type BirdStatus = 'Ativo' | 'Óbito' | 'Fugiu' | 'Vendido' | 'Doado';
export type Sex = 'Macho' | 'Fêmea' | 'Indeterminado';
export type BirdClassification = 'Galador' | 'Pássaro de Canto' | 'Ambos' | 'Não Definido';
export type TrainingStatus = 'Não Iniciado' | 'Em Encarte' | 'Fixado' | 'Pardo (Aprendizado)';
export type SubscriptionPlan = 'Básico' | 'Profissional';

export interface SexingData {
  protocol: string;        // Número do pedido/sexagem
  laboratory: string;      // Laboratório
  sentDate: string;        // Data de envio
  resultDate?: string;     // Data do resultado/chegada
  attachmentUrl?: string;  // Anexo do laudo (Base64)
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

export interface Bird {
  id: string;
  ringNumber: string;
  species: string;
  name: string;
  sex: Sex;
  colorMutation: string;
  birthDate: string;
  status: BirdStatus;
  location: string;
  photoUrl?: string;
  fatherId?: string;
  motherId?: string;
  manualAncestors?: Record<string, string>;
  createdAt: string;
  classification: BirdClassification;
  songTrainingStatus: TrainingStatus;
  songType: string;
  songSource?: string;        // Fonte (CD / Tutor / Mestre)
  trainingStartDate?: string; // Data inicio do encarte
  trainingNotes?: string;     // Observações de evolução do canto
  isRepeater: boolean;
  sexing?: SexingData; 
  documents?: BirdDocument[]; // Novo campo: Repositório de documentos da ave
  ibamaBaixaPendente?: boolean; // Controle de baixa IBAMA para óbitos
  ibamaBaixaData?: string; // Data de conclusão da baixa IBAMA
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
  birdId: string;
  type: 'Óbito' | 'Fuga' | 'Transporte' | 'Venda';
  date: string;
  notes: string;
  gtrUrl?: string;
  destination?: string;
  buyerSispass?: string;
  deletedAt?: string;
}

export interface Pair {
  id: string;
  maleId: string;
  femaleId: string;
  startDate: string;
  endDate?: string;
  status: 'Ativo' | 'Inativo';
  name: string;
  lastHatchDate?: string;
  archivedAt?: string;
  deletedAt?: string;
}

export interface Clutch {
  id: string;
  pairId: string;
  layDate: string;
  eggCount: number;
  fertileCount: number;
  hatchedCount: number;
  notes: string;
}

export interface Medication {
  id: string;
  name: string;
  type: string;
  batch: string;
  expiryDate: string;
  stock: number;
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
  birdId: string;
  medicationId: string;
  date: string;
  dosage: string;
  notes: string;
  treatmentId?: string; // Link para tratamento contínuo
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

export type CertificateType = 'A1 (Arquivo)' | 'A3 (Token USB)' | 'A3 (Cartão)' | 'Nuvem (BirdID/Vidaas)';

export interface DigitalCertificateData {
  issuer: string;       // Órgão emissor (ex: Serasa, Certisign)
  expiryDate: string;   // Validade
  installed: boolean;   // Se está configurado/detectado (simulação)
  type: CertificateType; // Novo Campo
}

export interface BreederSettings {
  breederName: string;
  userId?: string;
  cpfCnpj: string;
  sispassNumber: string;
  sispassDocumentUrl?: string;
  registrationDate: string;
  renewalDate: string;      // Vencimento Licenca SISPASS
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

  settings: BreederSettings;
}
