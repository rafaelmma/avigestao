
import { Bird, Medication, BreederSettings, Sex } from './types';

export const MAX_FREE_BIRDS = 5;

// Dias médios de incubação por espécie
export const SPECIES_INCUBATION_DAYS: Record<string, number> = {
  'Canário Belga': 13, // 13-14 dias
  'Canário da Terra': 13, // 12-13 dias
  'Curió': 13,         // 12-13 dias
  'Coleiro': 13,       // 12-13 dias
  'Tiziu': 12,         // 11-12 dias
  'Sabiá Laranjeira': 13, // 13-15 dias
  'Caboclinho': 13,    // 12-13 dias
  'Trinca-Ferro': 13,  // 13 dias
  'Bicudo': 13,        // 13 dias
  'Azulão': 14,        // 13-14 dias
  'Pintassilgo': 13,   // 13 dias
  'Agapornis': 23,     // 21-23 dias
  'Calopsita': 20,     // 18-21 dias
  'Periquito': 18,     // 18 dias
  'Manon': 15,         // 14-16 dias
  'Mandarin': 13       // 12-14 dias
};

// Logo Oficial AviGestão (Design Vetorial Nítido)
export const APP_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" fill="none">
  <!-- Fundo Circular Suave (Opcional) -->
  <circle cx="250" cy="230" r="180" fill="#ffffff" opacity="0"/>

  <!-- Guirlanda de Folhas (Wreath) -->
  <path d="M250 60 C140 60 60 140 60 250 C60 360 140 440 250 440 C360 440 440 360 440 250 C440 140 360 60 250 60 Z" stroke="none"/>
  
  <!-- Folhas Esquerdas -->
  <path d="M120 350 Q60 250 100 150" stroke="#4CAF50" stroke-width="3" fill="none" opacity="0.8"/>
  <ellipse cx="100" cy="150" rx="15" ry="25" transform="rotate(-20 100 150)" fill="#66BB6A" />
  <ellipse cx="80" cy="200" rx="15" ry="25" transform="rotate(-10 80 200)" fill="#43A047" />
  <ellipse cx="85" cy="260" rx="18" ry="30" transform="rotate(10 85 260)" fill="#66BB6A" />
  <ellipse cx="120" cy="320" rx="15" ry="25" transform="rotate(30 120 320)" fill="#43A047" />

  <!-- Folhas Direitas -->
  <path d="M380 350 Q440 250 400 150" stroke="#4CAF50" stroke-width="3" fill="none" opacity="0.8"/>
  <ellipse cx="400" cy="150" rx="15" ry="25" transform="rotate(20 400 150)" fill="#66BB6A" />
  <ellipse cx="420" cy="200" rx="15" ry="25" transform="rotate(10 420 200)" fill="#43A047" />
  <ellipse cx="415" cy="260" rx="18" ry="30" transform="rotate(-10 415 260)" fill="#66BB6A" />
  <ellipse cx="380" cy="320" rx="15" ry="25" transform="rotate(-30 380 320)" fill="#43A047" />

  <!-- Folhas Topo -->
  <ellipse cx="200" cy="80" rx="12" ry="20" transform="rotate(-40 200 80)" fill="#81C784" />
  <ellipse cx="300" cy="80" rx="12" ry="20" transform="rotate(40 300 80)" fill="#81C784" />
  
  <!-- Frutos/Detalhes Amarelos -->
  <circle cx="150" cy="100" r="6" fill="#FDD835"/>
  <circle cx="350" cy="100" r="6" fill="#FDD835"/>
  <circle cx="70" cy="230" r="5" fill="#FDD835"/>
  <circle cx="430" cy="230" r="5" fill="#FDD835"/>

  <!-- Galho -->
  <path d="M130 310 Q250 260 380 320" stroke="#795548" stroke-width="14" stroke-linecap="round"/>
  <path d="M130 310 Q250 260 380 320" stroke="#5D4037" stroke-width="4" stroke-linecap="round" opacity="0.3" transform="translate(0, 4)"/>

  <!-- Pássaro -->
  <!-- Cauda -->
  <path d="M150 280 L120 340 L170 320 Z" fill="#00897B"/>
  <path d="M150 280 L130 330" stroke="#004D40" stroke-width="1"/>

  <!-- Corpo -->
  <path d="M170 300 C150 240 180 180 250 160 C300 150 330 190 310 240 C290 290 220 310 170 300" fill="#FDD835"/> 
  <!-- Asa -->
  <path d="M180 230 Q250 220 230 280 C210 280 190 260 180 230" fill="#43A047"/>
  <path d="M185 235 Q230 230 220 270" stroke="#2E7D32" stroke-width="2" fill="none" opacity="0.3"/>

  <!-- Cabeça -->
  <circle cx="275" cy="185" r="35" fill="#FB8C00"/>
  
  <!-- Olho -->
  <circle cx="285" cy="175" r="4" fill="#212121"/>
  <circle cx="287" cy="173" r="1.5" fill="white"/>

  <!-- Bico -->
  <path d="M305 180 L325 185 L305 195 Z" fill="#3E2723"/>

  <!-- Pés -->
  <path d="M220 300 L220 320" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/>
  <path d="M250 290 L250 310" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/>

  <!-- Texto Principal -->
  <text x="250" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="65">
    <tspan fill="#2E7D32">Avi</tspan><tspan fill="#F57C00">Gestão</tspan>
  </text>
  
  <!-- Subtítulo -->
  <text x="250" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="16" letter-spacing="4" fill="#546E7A">
    CONTROLE DE CRIATÓRIO
  </text>
</svg>
`)}`;

const buildDefaultBirdIcon = (accent: string, bg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="120" fill="${bg}"/>
  <path d="M36 176 C70 164 124 160 184 166 C206 168 222 172 236 178" stroke="${accent}" stroke-width="12" stroke-linecap="round" fill="none"/>
  <path d="M74 168 C60 156 48 148 36 144" stroke="${accent}" stroke-width="8" stroke-linecap="round" fill="none"/>
  <path d="M58 138 C52 128 40 122 30 122 C40 132 48 142 54 152" fill="${accent}"/>
  <path d="M102 158 C96 144 84 138 72 136 C84 146 92 154 96 166" fill="${accent}"/>
  <path d="M186 168 C176 154 160 144 142 140 C126 136 112 138 100 144 C90 150 86 162 90 172 C96 186 112 190 130 184 C146 178 158 168 172 166 C186 164 200 168 212 178 C210 160 202 148 190 138 C192 122 184 106 170 96 C156 86 136 84 120 90 C108 94 100 104 98 116 C92 120 88 126 86 132 C90 126 96 122 104 120 C118 116 136 118 150 126 C164 134 176 150 186 168 Z" fill="${accent}"/>
  <circle cx="176" cy="92" r="14" fill="${accent}"/>
  <path d="M186 90 L212 98 L186 106 Z" fill="${accent}"/>
  <path d="M86 150 L58 162 L92 168 Z" fill="${accent}"/>
</svg>
`)}`;

export const DEFAULT_BIRD_ICONS = {
  male: buildDefaultBirdIcon('#2563EB', '#DBEAFE'),
  female: buildDefaultBirdIcon('#EC4899', '#FCE7F3'),
  indeterminate: buildDefaultBirdIcon('#475569', '#E2E8F0')
};

export const SPECIES_IMAGES: Record<string, { male: string; female: string }> = {
  'Canário Belga': { male: '/birds/canario-belga-macho.jpg', female: '/birds/canario-belga-femea.jpg' },
  'Canário da Terra': { male: '/birds/canario-da-terra-macho.jpg', female: '/birds/canario-da-terra-femea.jpg' },
  'Curió': { male: '/birds/curio-macho.jpg', female: '/birds/curio-femea.jpg' },
  'Coleiro': { male: '/birds/coleiro-macho.jpg', female: '/birds/coleiro-femea.jpg' },
  'Tiziu': { male: '/birds/tiziu-macho.jpg', female: '/birds/tiziu-femea.jpg' },
  'Sabiá Laranjeira': { male: '/birds/sabia-laranjeira-macho.jpg', female: '/birds/sabia-laranjeira-femea.jpg' },
  'Caboclinho': { male: '/birds/caboclinho-macho.jpg', female: '/birds/caboclinho-femea.jpg' },
  'Trinca-Ferro': { male: '/birds/trinca-ferro-macho.jpg', female: '/birds/trinca-ferro-femea.jpg' },
  'Bicudo': { male: '/birds/bicudo-macho.jpg', female: '/birds/bicudo-femea.jpg' },
  'Azulão': { male: '/birds/azulao-macho.jpg', female: '/birds/azulao-femea.jpg' },
  'Pintassilgo': { male: '/birds/pintassilgo-macho.jpg', female: '/birds/pintassilgo-femea.jpg' },
  'Agapornis': { male: '/birds/agapornis-macho.jpg', female: '/birds/agapornis-femea.jpg' },
  'Calopsita': { male: '/birds/calopsita-macho.jpg', female: '/birds/calopsita-femea.jpg' },
  'Periquito': { male: '/birds/periquito-macho.jpg', female: '/birds/periquito-femea.jpg' },
  'Manon': { male: '/birds/manon-macho.jpg', female: '/birds/manon-femea.jpg' },
  'Mandarin': { male: '/birds/mandarin-macho.jpg', female: '/birds/mandarin-femea.jpg' }
};

export const getDefaultBirdImage = (species: string, sex: Sex | string) => {
  if (sex === 'Fêmea') return DEFAULT_BIRD_ICONS.female;
  if (sex === 'Macho') return DEFAULT_BIRD_ICONS.male;
  return DEFAULT_BIRD_ICONS.indeterminate;
};

export const isDefaultBirdImage = (url?: string) => {
  if (!url) return true;
  return url === DEFAULT_BIRD_ICONS.male || url === DEFAULT_BIRD_ICONS.female || url === DEFAULT_BIRD_ICONS.indeterminate;
};

export const BRAZILIAN_SPECIES = Object.keys(SPECIES_IMAGES);

export const INITIAL_SETTINGS: BreederSettings = {
  breederName: 'Meu Criatório',
  cpfCnpj: '000.000.000-00',
  sispassNumber: '1234567-8',
  registrationDate: '2023-01-01',
  renewalDate: '2025-12-31',
  lastRenewalDate: '2024-08-01',
  certificate: {
    issuer: '',
    expiryDate: '',
    installed: false,
    type: 'A1 (Arquivo)' // Default Type
  },
  logoUrl: APP_LOGO, 
  primaryColor: '#10B981',
  accentColor: '#F59E0B',
  plan: 'Básico'
};

export const MOCK_BIRDS: Bird[] = [
  {
    id: '1',
    ringNumber: 'SIS-2023-001',
    species: 'Curió',
    name: 'Mestre',
    sex: 'Macho',
    colorMutation: 'Clássico',
    birthDate: '2022-10-10',
    status: 'Ativo',
    location: 'Gaiola 01',
    photoUrl: getDefaultBirdImage('Curió', 'Macho'),
    createdAt: new Date().toISOString(),
    classification: 'Pássaro de Canto',
    songTrainingStatus: 'Fixado',
    songType: 'Praia Clássico',
    isRepeater: true
  }
];

export const MOCK_MEDS: Medication[] = [
  {
    id: 'm1',
    name: 'Avitrin Complexo Vitamínico',
    type: 'Suplemento / Vitaminas',
    batch: 'AV-2024-01',
    expiryDate: '2026-06-30',
    stock: 2
  },
  {
    id: 'm2',
    name: 'Allax (Ivomec)',
    type: 'Antiparasitário (Ácaros)',
    batch: 'ALX-998',
    expiryDate: '2025-12-15',
    stock: 1
  },
  {
    id: 'm3',
    name: 'Coccidex',
    type: 'Antibiótico / Coccidiose',
    batch: 'CX-2023',
    expiryDate: '2025-08-20',
    stock: 3
  },
  {
    id: 'm4',
    name: 'Glicopan Pet',
    type: 'Suplemento Energético',
    batch: 'GLI-554',
    expiryDate: '2026-01-10',
    stock: 1
  },
  {
    id: 'm5',
    name: 'Avitrin E',
    type: 'Vitamina E (Reprodução)',
    batch: 'AVE-112',
    expiryDate: '2025-11-05',
    stock: 4
  },
  {
    id: 'm6',
    name: 'Enrofloxacina 10%',
    type: 'Antibiótico (Respiratório)',
    batch: 'ENR-887',
    expiryDate: '2026-03-15',
    stock: 2
  },
  {
    id: 'm7',
    name: 'Mercepton',
    type: 'Protetor Hepático',
    batch: 'MER-332',
    expiryDate: '2025-10-30',
    stock: 5
  },
  {
    id: 'm8',
    name: 'Organew',
    type: 'Probiótico',
    batch: 'ORG-776',
    expiryDate: '2026-09-01',
    stock: 1
  },
  {
    id: 'm9',
    name: 'Nalyt 100',
    type: 'Antibiótico (Amplo Espectro)',
    batch: 'NAL-123',
    expiryDate: '2025-05-20',
    stock: 1
  },
  {
    id: 'm10',
    name: 'Cálcio',
    type: 'Suplemento Mineral',
    batch: 'CAL-009',
    expiryDate: '2027-01-01',
    stock: 3
  },
  {
    id: 'm11',
    name: 'Avitrin Plumas',
    type: 'Suplemento (Muda)',
    batch: 'AVP-445',
    expiryDate: '2026-02-28',
    stock: 2
  },
  {
    id: 'm12',
    name: 'Hidrovit',
    type: 'Eletrólitos / Reidratante',
    batch: 'HID-221',
    expiryDate: '2025-07-15',
    stock: 2
  }
];
