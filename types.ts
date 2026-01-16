
export type BirdStatus = 'Ativo' | 'Falecido' | 'Vendido' | 'Transferido' | 'Fugido';
export type Sex = 'Macho' | 'Fêmea' | 'Indeterminado';
export type BirdClassification = 'Galador' | 'Pássaro de Canto' | 'Ambos' | 'Não Definido';
export type TrainingStatus = 'Não Iniciado' | 'Em Encarte' | 'Fixado' | 'Pardo (Aprendizado)';
export type SubscriptionPlan = 'Básico' | 'Profissional';

export interface SexingData {
  protocol: string;        // NÃºmero do pedido/sexagem
  laboratory: string;      // LaboratÃ³rio
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
  trainingNotes?: string;     // ObservaÃ§Ãµes de evoluÃ§Ã£o do canto
  isRepeater: boolean;
  sexing?: SexingData; 
  documents?: BirdDocument[]; // Novo campo: RepositÃ³rio de documentos da ave
}

export type TransactionCategory = 
  | 'Venda de Aves' 
  | 'ServiÃ§os' 
  | 'AlimentaÃ§Ã£o' 
  | 'SaÃºde' 
  | 'Manejo e Insumos' 
  | 'Estrutura' 
  | 'Taxas e LicenÃ§as' 
  | 'Outros';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'Receita' | 'Despesa';
  category: TransactionCategory;
  subcategory?: string; // Novo campo para subitens (ex: RaÃ§Ã£o, Medicamento)
}

export interface MaintenanceTask {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
  priority: 'Baixa' | 'MÃ©dia' | 'Alta';
  birdId?: string;
  frequency?: 'Ãšnica' | 'DiÃ¡ria' | 'Semanal' | 'Mensal'; // Adicionado
  remindMe?: boolean; // Adicionado: Flag para destacar aviso
}

export interface TournamentEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  type: 'Torneio' | 'Encontro' | 'ExposiÃ§Ã£o';
  category: 'Fibra' | 'Canto' | 'Morfologia' | 'Social';
  notes?: string;
  organizer?: string;
  
  // Novos Campos Melhorados
  result?: string; // Mantido para compatibilidade (ex: "1Âº Lugar")
  trophy?: boolean; // Se ganhou trofÃ©u
  score?: number; // PontuaÃ§Ã£o ou Cantos
  
  participatingBirds?: string[]; // IDs dos pÃ¡ssaros
  preparationChecklist?: { item: string; checked: boolean }[]; // Checklist
}

export interface MovementRecord {
  id: string;
  birdId: string;
  type: 'Ã“bito' | 'Fuga' | 'Transporte' | 'Venda';
  date: string;
  notes: string;
  gtrUrl?: string;
  destination?: string;
  buyerSispass?: string;
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
}

export interface MedicationApplication {
  id: string;
  birdId: string;
  medicationId: string;
  date: string;
  dosage: string;
  notes: string;
  treatmentId?: string; // Link para tratamento contÃ­nuo
}

export interface ContinuousTreatment {
  id: string;
  birdId: string; // Pode ser 'ALL' para tratamento coletivo ou ID do pÃ¡ssaro
  medicationId: string;
  startDate: string;
  endDate?: string; // Opcional (se for contÃ­nuo indefinido)
  frequency: 'DiÃ¡rio' | '12h em 12h' | 'Semanal' | 'Mensal';
  dosage: string;
  status: 'Ativo' | 'Pausado' | 'ConcluÃ­do';
  lastApplicationDate?: string;
  notes?: string;
}

export type CertificateType = 'A1 (Arquivo)' | 'A3 (Token USB)' | 'A3 (CartÃ£o)' | 'Nuvem (BirdID/Vidaas)';

export interface DigitalCertificateData {
  issuer: string;       // OrgÃ£o emissor (ex: Serasa, Certisign)
  expiryDate: string;   // Validade
  installed: boolean;   // Se estÃ¡ configurado/detectado (simulaÃ§Ã£o)
  type: CertificateType; // Novo Campo
}

export interface BreederSettings {
  breederName: string;
  userId?: string;
  cpfCnpj: string;
  sispassNumber: string;
  sispassDocumentUrl?: string;
registrationDate: string;
  renewalDate: string;      // Vencimento LicenÃ§a SISPASS
  lastRenewalDate?: string; // Ãšltima RenovaÃ§Ã£o SISPASS
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  plan: SubscriptionPlan;
  trialEndDate?: string; // NOVA PROPRIEDADE: Data fim do perÃ­odo de teste
  dashboardLayout?: string[];
  certificate?: DigitalCertificateData; // Dados do Certificado Digital
}

export interface AppState {
  birds: Bird[];
  deletedBirds?: Bird[];
  
  pairs: Pair[];
  deletedPairs?: Pair[]; // Lixeira Casais

  clutches: Clutch[];
  // Clutches geralmente sÃ£o deletadas junto com o casal ou diretamente, simplificando nÃ£o ter lixeira para clutch por enquanto ou herdar do pai.
  
  medications: Medication[];
  deletedMedications?: Medication[]; // Lixeira Meds

  applications: MedicationApplication[];
  deletedApplications?: MedicationApplication[]; // Lixeira AplicaÃ§Ãµes
  
  treatments: ContinuousTreatment[]; // Novo array de tratamentos
  deletedTreatments?: ContinuousTreatment[];

  movements: MovementRecord[];
  deletedMovements?: MovementRecord[]; // Lixeira MovimentaÃ§Ãµes

  transactions: Transaction[];
  deletedTransactions?: Transaction[]; // Lixeira Financeiro

  tasks: MaintenanceTask[];
  deletedTasks?: MaintenanceTask[]; // Lixeira Tarefas

  tournaments: TournamentEvent[];
  deletedTournaments?: TournamentEvent[]; // Lixeira Eventos

  settings: BreederSettings;
}



