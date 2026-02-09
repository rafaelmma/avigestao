import { Bird } from '../types';

const readLocalBirds = (): Bird[] => {
  const stored = localStorage.getItem('avigestao_state_v2');
  if (!stored) return [];
  const data = JSON.parse(stored);
  return data?.birds || [];
};

/**
 * Sincroniza pássaros do localStorage para o backend atual
 * (Supabase removido; mantém apenas o fluxo local)
 */
export async function syncBirdsToSupabase(_userId: string): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const birdsList = readLocalBirds();
  if (birdsList.length === 0) {
    return {
      success: false,
      migrated: 0,
      failed: 0,
      errors: ['Nenhum pássaro encontrado no localStorage'],
    };
  }

  return {
    success: true,
    migrated: birdsList.length,
    failed: 0,
    errors: [],
  };
}

/**
 * Carrega pássaros com fallback para localStorage
 */
export async function loadBirdsForUser(_userId: string): Promise<Bird[]> {
  return readLocalBirds();
}

/**
 * Salva novo pássaro (stub local)
 */
export async function saveBirdToSupabase(
  _bird: Bird,
  _userId: string,
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
