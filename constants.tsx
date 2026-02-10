import { Bird, Medication, BreederSettings, Sex } from './types';

export const MAX_FREE_BIRDS = 5;

// Dias médios de incubação por espécie
export const SPECIES_INCUBATION_DAYS: Record<string, number> = {
  'Canário Belga': 13, // 13-14 dias
  'Canário da Terra': 13, // 12-13 dias
  Curió: 13, // 12-13 dias
  Coleiro: 13, // 12-13 dias
  Tiziu: 12, // 11-12 dias
  'Sabiá Laranjeira': 13, // 13-15 dias
  Caboclinho: 13, // 12-13 dias
  'Trinca-Ferro': 13, // 13 dias
  Bicudo: 13, // 13 dias
  Azulão: 14, // 13-14 dias
  Pintassilgo: 13, // 13 dias
  Agapornis: 23, // 21-23 dias
  Calopsita: 20, // 18-21 dias
  Periquito: 18, // 18 dias
  Manon: 15, // 14-16 dias
  Mandarin: 13, // 12-14 dias
};

// Logo Completa (imagem real do usuário)
export const APP_LOGO = '/logo.png';

// Logo Icon (mesma imagem para sidebar - será redimensionada via CSS)
export const APP_LOGO_ICON = '/logo.png';

export const DEFAULT_BIRD_ICONS = {
  male: {
    adulto: '/birds/adulto_azul.png',
    filhote: '/birds/filhote_azul.png',
  },
  female: {
    adulto: '/birds/adulto_rosa.png',
    filhote: '/birds/filhote_rosa.png',
  },
  indeterminate: {
    adulto: '/birds/adulto_azul.png',
    filhote: '/birds/filhote_azul.png',
  },
};

// Dias máximos para ser considerado filhote (4 meses)
export const FLEDGLING_MAX_DAYS = 120;

export const SPECIES_IMAGES: Record<string, { male: string; female: string }> = {
  'Canário Belga': {
    male: '/birds/canario-belga-macho.jpg',
    female: '/birds/canario-belga-femea.jpg',
  },
  'Canário da Terra': {
    male: '/birds/canario-da-terra-macho.jpg',
    female: '/birds/canario-da-terra-femea.jpg',
  },
  Curió: { male: '/birds/curio-macho.jpg', female: '/birds/curio-femea.jpg' },
  Coleiro: { male: '/birds/coleiro-macho.jpg', female: '/birds/coleiro-femea.jpg' },
  Tiziu: { male: '/birds/tiziu-macho.jpg', female: '/birds/tiziu-femea.jpg' },
  'Sabiá Laranjeira': {
    male: '/birds/sabia-laranjeira-macho.jpg',
    female: '/birds/sabia-laranjeira-femea.jpg',
  },
  Caboclinho: { male: '/birds/caboclinho-macho.jpg', female: '/birds/caboclinho-femea.jpg' },
  'Trinca-Ferro': {
    male: '/birds/trinca-ferro-macho.jpg',
    female: '/birds/trinca-ferro-femea.jpg',
  },
  Bicudo: { male: '/birds/bicudo-macho.jpg', female: '/birds/bicudo-femea.jpg' },
  Azulão: { male: '/birds/azulao-macho.jpg', female: '/birds/azulao-femea.jpg' },
  Pintassilgo: { male: '/birds/pintassilgo-macho.jpg', female: '/birds/pintassilgo-femea.jpg' },
  Agapornis: { male: '/birds/agapornis-macho.jpg', female: '/birds/agapornis-femea.jpg' },
  Calopsita: { male: '/birds/calopsita-macho.jpg', female: '/birds/calopsita-femea.jpg' },
  Periquito: { male: '/birds/periquito-macho.jpg', female: '/birds/periquito-femea.jpg' },
  Manon: { male: '/birds/manon-macho.jpg', female: '/birds/manon-femea.jpg' },
  Mandarin: { male: '/birds/mandarin-macho.jpg', female: '/birds/mandarin-femea.jpg' },
};

export const getDefaultBirdImage = (species: string, sex: Sex | string, bornDate?: string) => {
  // Determinar se é filhote ou adulto baseado na data de nascimento
  let isFledgling = false;

  if (bornDate) {
    const born = new Date(bornDate);
    const today = new Date();
    const daysDifference = Math.floor((today.getTime() - born.getTime()) / (1000 * 60 * 60 * 24));
    isFledgling = daysDifference <= FLEDGLING_MAX_DAYS;
  }

  const stage = isFledgling ? 'filhote' : 'adulto';

  if (sex === 'Fêmea') return DEFAULT_BIRD_ICONS.female[stage];
  if (sex === 'Macho') return DEFAULT_BIRD_ICONS.male[stage];
  return DEFAULT_BIRD_ICONS.indeterminate[stage];
};

export const isDefaultBirdImage = (url?: string) => {
  if (!url) return true;
  return (
    url === DEFAULT_BIRD_ICONS.male.adulto ||
    url === DEFAULT_BIRD_ICONS.male.filhote ||
    url === DEFAULT_BIRD_ICONS.female.adulto ||
    url === DEFAULT_BIRD_ICONS.female.filhote ||
    url === DEFAULT_BIRD_ICONS.indeterminate.adulto ||
    url === DEFAULT_BIRD_ICONS.indeterminate.filhote
  );
};

export const BRAZILIAN_SPECIES = Object.keys(SPECIES_IMAGES);

export const INITIAL_SETTINGS: BreederSettings = {
  breederName: '',
  cpfCnpj: '',
  breederCategory: '',
  responsibleName: '',
  speciesRaised: '',
  breederEmail: '',
  breederPhone: '',
  breederMobile: '',
  breederWebsite: '',
  addressCep: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressComplement: '',
  sispassNumber: '',
  registrationDate: '',
  renewalDate: '',
  lastRenewalDate: '',
  certificate: {
    issuer: '',
    expiryDate: '',
    installed: false,
    type: 'A1 (Arquivo)', // Default Type
  },
  logoUrl: APP_LOGO,
  primaryColor: '#10B981',
  accentColor: '#F59E0B',
  plan: 'Básico',
  subscriptionEndDate: '',
  subscriptionCancelAtPeriodEnd: false,
  subscriptionStatus: '',
};

export const MOCK_BIRDS: Bird[] = [
  
];

export const MOCK_MEDS: Medication[] = [
  
  {
    id: 'm7',
    name: 'Mercepton',
    userId: 'system',
    type: 'Outro' as any,
    batch: 'MER-332',
    expiryDate: '2025-10-30',
    stock: 5,
  },
  {
    id: 'm8',
    name: 'Organew',
    userId: 'system',
    type: 'Outro' as any,
    batch: 'ORG-776',
    expiryDate: '2026-09-01',
    stock: 1,
  },
  {
    id: 'm9',
    name: 'Nalyt 100',
    userId: 'system',
    type: 'Antibiótico' as any,
    batch: 'NAL-123',
    expiryDate: '2025-05-20',
    stock: 1,
  },
  {
    id: 'm10',
    name: 'Cálcio',
    userId: 'system',
    type: 'Vitamina' as any,
    batch: 'CAL-009',
    expiryDate: '2027-01-01',
    stock: 3,
  },
  {
    id: 'm11',
    name: 'Avitrin Plumas',
    userId: 'system',
    type: 'Vitamina' as any,
    batch: 'AVP-445',
    expiryDate: '2026-02-28',
    stock: 2,
  },
  {
    id: 'm12',
    name: 'Hidrovit',
    userId: 'system',
    type: 'Outro' as any,
    batch: 'HID-221',
    expiryDate: '2025-07-15',
    stock: 2,
  },
];
