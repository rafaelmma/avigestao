// Regiões climáticas do Brasil com dados sazonais específicos
export type BrazilianRegion = 
  | 'Norte' 
  | 'Nordeste' 
  | 'Centro-Oeste' 
  | 'Sudeste' 
  | 'Sul';

export type State = 
  | 'AM' | 'RR' | 'AP' | 'PA' | 'TO' | 'AC' // Norte
  | 'MA' | 'PI' | 'CE' | 'RN' | 'PB' | 'PE' | 'AL' | 'SE' | 'BA' // Nordeste
  | 'MT' | 'MS' | 'GO' | 'DF' // Centro-Oeste
  | 'MG' | 'ES' | 'RJ' | 'SP' // Sudeste
  | 'PR' | 'SC' | 'RS'; // Sul

export interface RegionClimateData {
  region: BrazilianRegion;
  states: State[];
  description: string;
  temperatureRange: { min: number; max: number }; // Anual
  seasonalPatterns: {
    [month: string]: {
      season: string;
      temperature: { min: number; max: number };
      photoperiod: string;
      humidity: { min: number; max: number };
      rainfall: 'Alto' | 'Médio' | 'Baixo';
    };
  };
}

export const BRAZILIAN_REGIONS: Record<BrazilianRegion, RegionClimateData> = {
  'Norte': {
    region: 'Norte',
    states: ['AM', 'RR', 'AP', 'PA', 'TO', 'AC'],
    description: 'Região Amazônica - Clima Tropical Quente e Úmido',
    temperatureRange: { min: 24, max: 32 },
    seasonalPatterns: {
      'Janeiro': {
        season: 'Cheia/Verão',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 30min',
        humidity: { min: 70, max: 90 },
        rainfall: 'Alto'
      },
      'Fevereiro': {
        season: 'Cheia/Verão',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 20min',
        humidity: { min: 70, max: 90 },
        rainfall: 'Alto'
      },
      'Março': {
        season: 'Cheia/Verão',
        temperature: { min: 24, max: 31 },
        photoperiod: '12h 10min',
        humidity: { min: 75, max: 90 },
        rainfall: 'Alto'
      },
      'Abril': {
        season: 'Transição',
        temperature: { min: 24, max: 30 },
        photoperiod: '12h',
        humidity: { min: 75, max: 85 },
        rainfall: 'Médio'
      },
      'Maio': {
        season: 'Seca Inicial',
        temperature: { min: 23, max: 30 },
        photoperiod: '11h 50min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Junho': {
        season: 'Seca',
        temperature: { min: 22, max: 29 },
        photoperiod: '11h 40min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Baixo'
      },
      'Julho': {
        season: 'Seca/Inverno',
        temperature: { min: 21, max: 29 },
        photoperiod: '11h 50min',
        humidity: { min: 55, max: 70 },
        rainfall: 'Baixo'
      },
      'Agosto': {
        season: 'Seca/Inverno',
        temperature: { min: 23, max: 31 },
        photoperiod: '12h 10min',
        humidity: { min: 50, max: 70 },
        rainfall: 'Baixo'
      },
      'Setembro': {
        season: 'Transição',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 20min',
        humidity: { min: 55, max: 75 },
        rainfall: 'Médio'
      },
      'Outubro': {
        season: 'Pré-cheia',
        temperature: { min: 25, max: 33 },
        photoperiod: '12h 30min',
        humidity: { min: 65, max: 85 },
        rainfall: 'Médio'
      },
      'Novembro': {
        season: 'Pré-cheia',
        temperature: { min: 25, max: 33 },
        photoperiod: '12h 30min',
        humidity: { min: 70, max: 90 },
        rainfall: 'Alto'
      },
      'Dezembro': {
        season: 'Cheia/Verão',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 30min',
        humidity: { min: 70, max: 90 },
        rainfall: 'Alto'
      }
    }
  },

  'Nordeste': {
    region: 'Nordeste',
    states: ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'],
    description: 'Semiárido e Litoral - Clima Tropical Seco e Quente',
    temperatureRange: { min: 20, max: 32 },
    seasonalPatterns: {
      'Janeiro': {
        season: 'Verão Quente',
        temperature: { min: 24, max: 32 },
        photoperiod: '13h',
        humidity: { min: 60, max: 80 },
        rainfall: 'Médio'
      },
      'Fevereiro': {
        season: 'Verão Quente',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 50min',
        humidity: { min: 65, max: 85 },
        rainfall: 'Médio'
      },
      'Março': {
        season: 'Verão Quente',
        temperature: { min: 23, max: 31 },
        photoperiod: '12h 35min',
        humidity: { min: 70, max: 85 },
        rainfall: 'Médio'
      },
      'Abril': {
        season: 'Outono',
        temperature: { min: 22, max: 29 },
        photoperiod: '12h 15min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Maio': {
        season: 'Seca/Inverno',
        temperature: { min: 20, max: 28 },
        photoperiod: '12h',
        humidity: { min: 55, max: 70 },
        rainfall: 'Baixo'
      },
      'Junho': {
        season: 'Seca/Inverno',
        temperature: { min: 19, max: 27 },
        photoperiod: '11h 50min',
        humidity: { min: 50, max: 65 },
        rainfall: 'Baixo'
      },
      'Julho': {
        season: 'Seca Extrema/Inverno',
        temperature: { min: 18, max: 26 },
        photoperiod: '11h 55min',
        humidity: { min: 45, max: 60 },
        rainfall: 'Baixo'
      },
      'Agosto': {
        season: 'Seca Extrema',
        temperature: { min: 20, max: 28 },
        photoperiod: '12h 10min',
        humidity: { min: 40, max: 55 },
        rainfall: 'Baixo'
      },
      'Setembro': {
        season: 'Pré-verão',
        temperature: { min: 22, max: 30 },
        photoperiod: '12h 25min',
        humidity: { min: 45, max: 65 },
        rainfall: 'Baixo'
      },
      'Outubro': {
        season: 'Primavera',
        temperature: { min: 24, max: 31 },
        photoperiod: '12h 40min',
        humidity: { min: 55, max: 75 },
        rainfall: 'Baixo'
      },
      'Novembro': {
        season: 'Primavera',
        temperature: { min: 24, max: 32 },
        photoperiod: '12h 45min',
        humidity: { min: 60, max: 80 },
        rainfall: 'Médio'
      },
      'Dezembro': {
        season: 'Verão',
        temperature: { min: 25, max: 33 },
        photoperiod: '13h',
        humidity: { min: 65, max: 85 },
        rainfall: 'Médio'
      }
    }
  },

  'Centro-Oeste': {
    region: 'Centro-Oeste',
    states: ['MT', 'MS', 'GO', 'DF'],
    description: 'Cerrado - Clima Tropical de Altitude com Estações Marcadas',
    temperatureRange: { min: 16, max: 31 },
    seasonalPatterns: {
      'Janeiro': {
        season: 'Verão Quente e Úmido',
        temperature: { min: 22, max: 31 },
        photoperiod: '13h 5min',
        humidity: { min: 65, max: 85 },
        rainfall: 'Alto'
      },
      'Fevereiro': {
        season: 'Verão Quente e Úmido',
        temperature: { min: 22, max: 31 },
        photoperiod: '12h 50min',
        humidity: { min: 65, max: 85 },
        rainfall: 'Alto'
      },
      'Março': {
        season: 'Verão Quente',
        temperature: { min: 21, max: 30 },
        photoperiod: '12h 30min',
        humidity: { min: 70, max: 85 },
        rainfall: 'Alto'
      },
      'Abril': {
        season: 'Outono',
        temperature: { min: 19, max: 28 },
        photoperiod: '12h 10min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Maio': {
        season: 'Outono/Pré-seca',
        temperature: { min: 17, max: 26 },
        photoperiod: '11h 50min',
        humidity: { min: 50, max: 65 },
        rainfall: 'Baixo'
      },
      'Junho': {
        season: 'Seca/Inverno',
        temperature: { min: 15, max: 25 },
        photoperiod: '11h 40min',
        humidity: { min: 40, max: 55 },
        rainfall: 'Baixo'
      },
      'Julho': {
        season: 'Seca/Inverno Frio',
        temperature: { min: 14, max: 26 },
        photoperiod: '11h 50min',
        humidity: { min: 35, max: 50 },
        rainfall: 'Baixo'
      },
      'Agosto': {
        season: 'Seca/Quente',
        temperature: { min: 16, max: 28 },
        photoperiod: '12h 10min',
        humidity: { min: 30, max: 45 },
        rainfall: 'Baixo'
      },
      'Setembro': {
        season: 'Transição',
        temperature: { min: 19, max: 30 },
        photoperiod: '12h 25min',
        humidity: { min: 40, max: 60 },
        rainfall: 'Baixo'
      },
      'Outubro': {
        season: 'Primavera Quente',
        temperature: { min: 21, max: 31 },
        photoperiod: '12h 40min',
        humidity: { min: 50, max: 70 },
        rainfall: 'Médio'
      },
      'Novembro': {
        season: 'Primavera Úmida',
        temperature: { min: 22, max: 31 },
        photoperiod: '12h 50min',
        humidity: { min: 60, max: 80 },
        rainfall: 'Alto'
      },
      'Dezembro': {
        season: 'Verão',
        temperature: { min: 22, max: 31 },
        photoperiod: '13h 5min',
        humidity: { min: 65, max: 85 },
        rainfall: 'Alto'
      }
    }
  },

  'Sudeste': {
    region: 'Sudeste',
    states: ['MG', 'ES', 'RJ', 'SP'],
    description: 'Clima Subtropical - Quatro Estações Bem Definidas',
    temperatureRange: { min: 12, max: 28 },
    seasonalPatterns: {
      'Janeiro': {
        season: 'Verão Quente e Úmido',
        temperature: { min: 20, max: 28 },
        photoperiod: '13h 10min',
        humidity: { min: 70, max: 85 },
        rainfall: 'Alto'
      },
      'Fevereiro': {
        season: 'Verão Quente',
        temperature: { min: 20, max: 28 },
        photoperiod: '12h 55min',
        humidity: { min: 70, max: 85 },
        rainfall: 'Alto'
      },
      'Março': {
        season: 'Verão Final',
        temperature: { min: 19, max: 27 },
        photoperiod: '12h 30min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Abril': {
        season: 'Outono',
        temperature: { min: 17, max: 24 },
        photoperiod: '12h 10min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Maio': {
        season: 'Outono Frio',
        temperature: { min: 14, max: 21 },
        photoperiod: '11h 50min',
        humidity: { min: 55, max: 70 },
        rainfall: 'Médio'
      },
      'Junho': {
        season: 'Inverno',
        temperature: { min: 12, max: 19 },
        photoperiod: '11h 40min',
        humidity: { min: 50, max: 65 },
        rainfall: 'Baixo'
      },
      'Julho': {
        season: 'Inverno Frio',
        temperature: { min: 12, max: 19 },
        photoperiod: '11h 50min',
        humidity: { min: 45, max: 60 },
        rainfall: 'Baixo'
      },
      'Agosto': {
        season: 'Inverno Final',
        temperature: { min: 13, max: 21 },
        photoperiod: '12h 10min',
        humidity: { min: 45, max: 60 },
        rainfall: 'Baixo'
      },
      'Setembro': {
        season: 'Primavera',
        temperature: { min: 15, max: 23 },
        photoperiod: '12h 25min',
        humidity: { min: 50, max: 65 },
        rainfall: 'Médio'
      },
      'Outubro': {
        season: 'Primavera Quente',
        temperature: { min: 18, max: 25 },
        photoperiod: '12h 40min',
        humidity: { min: 55, max: 70 },
        rainfall: 'Médio'
      },
      'Novembro': {
        season: 'Primavera Tardia',
        temperature: { min: 19, max: 27 },
        photoperiod: '12h 50min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Alto'
      },
      'Dezembro': {
        season: 'Verão',
        temperature: { min: 20, max: 28 },
        photoperiod: '13h 10min',
        humidity: { min: 70, max: 85 },
        rainfall: 'Alto'
      }
    }
  },

  'Sul': {
    region: 'Sul',
    states: ['PR', 'SC', 'RS'],
    description: 'Subtropical a Temperado - Invernos Frios, Verões Moderados',
    temperatureRange: { min: 8, max: 26 },
    seasonalPatterns: {
      'Janeiro': {
        season: 'Verão',
        temperature: { min: 18, max: 26 },
        photoperiod: '13h 20min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Fevereiro': {
        season: 'Verão',
        temperature: { min: 18, max: 26 },
        photoperiod: '13h',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Março': {
        season: 'Verão Final',
        temperature: { min: 17, max: 24 },
        photoperiod: '12h 30min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Abril': {
        season: 'Outono',
        temperature: { min: 14, max: 21 },
        photoperiod: '12h 10min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Maio': {
        season: 'Outono Frio',
        temperature: { min: 11, max: 18 },
        photoperiod: '11h 50min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Alto'
      },
      'Junho': {
        season: 'Inverno',
        temperature: { min: 8, max: 15 },
        photoperiod: '11h 35min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Alto'
      },
      'Julho': {
        season: 'Inverno Frio',
        temperature: { min: 8, max: 15 },
        photoperiod: '11h 45min',
        humidity: { min: 55, max: 70 },
        rainfall: 'Médio'
      },
      'Agosto': {
        season: 'Inverno Final',
        temperature: { min: 9, max: 17 },
        photoperiod: '12h 10min',
        humidity: { min: 55, max: 70 },
        rainfall: 'Médio'
      },
      'Setembro': {
        season: 'Primavera',
        temperature: { min: 12, max: 20 },
        photoperiod: '12h 30min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Outubro': {
        season: 'Primavera Quente',
        temperature: { min: 15, max: 22 },
        photoperiod: '12h 50min',
        humidity: { min: 60, max: 75 },
        rainfall: 'Médio'
      },
      'Novembro': {
        season: 'Primavera Tardia',
        temperature: { min: 17, max: 24 },
        photoperiod: '13h 10min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      },
      'Dezembro': {
        season: 'Verão',
        temperature: { min: 18, max: 26 },
        photoperiod: '13h 20min',
        humidity: { min: 65, max: 80 },
        rainfall: 'Médio'
      }
    }
  }
};

export function getRegionByState(state: State): BrazilianRegion {
  for (const [region, data] of Object.entries(BRAZILIAN_REGIONS)) {
    if (data.states.includes(state)) {
      return region as BrazilianRegion;
    }
  }
  return 'Sudeste'; // Default
}

export function getAllStates(): State[] {
  return Object.values(BRAZILIAN_REGIONS)
    .flatMap(r => r.states)
    .sort();
}
