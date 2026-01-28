import { supabase } from './supabase';
import { Bird } from '../types';

/**
 * Sincroniza pássaros do localStorage para Supabase
 * Cria um backup primeiro, depois copia todos os pássaros
 */
export async function syncBirdsToSupabase(userId: string): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  try {
    // 1. Carregar dados do localStorage
    const stored = localStorage.getItem('avigestao_state_v2');
    if (!stored) {
      return {
        success: false,
        migrated: 0,
        failed: 0,
        errors: ['Nenhum dado no localStorage para sincronizar']
      };
    }

    const data = JSON.parse(stored);
    const birds: Bird[] = data?.birds || [];

    if (birds.length === 0) {
      return {
        success: false,
        migrated: 0,
        failed: 0,
        errors: ['Nenhum pássaro encontrado no localStorage']
      };
    }

    console.log(`Iniciando sincronização de ${birds.length} pássaros...`);

    // 2. Inserir cada pássaro no Supabase
    for (const bird of birds) {
      try {
        const { error } = await supabase.from('birds').insert({
          id: bird.id,
          breeder_id: userId,
          name: bird.name,
          species: bird.species,
          sex: bird.sex,
          status: bird.status,
          ring_number: bird.ringNumber,
          birth_date: bird.birthDate,
          color_mutation: bird.colorMutation,
          classification: bird.classification,
          location: bird.location,
          father_id: bird.fatherId,
          mother_id: bird.motherId,
          song_training_status: bird.songTrainingStatus,
          song_type: bird.songType,
          training_notes: bird.trainingNotes,
          photo_url: bird.photoUrl
        });

        if (error) {
          // Se já existe, ignorar (já foi migrado)
          if (error.code === '23505') {
            console.warn(`Pássaro ${bird.name} (${bird.id}) já existe no Supabase`);
          } else {
            throw error;
          }
        } else {
          migrated++;
          console.log(`✓ Pássaro ${bird.name} sincronizado`);
        }
      } catch (err) {
        failed++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${bird.name}: ${errorMsg}`);
        console.error(`✗ Erro ao sincronizar ${bird.name}:`, err);
      }
    }

    return {
      success: failed === 0,
      migrated,
      failed,
      errors
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      migrated: 0,
      failed: birds.length,
      errors: [errorMsg]
    };
  }
}

/**
 * Carrega pássaros do Supabase com fallback para localStorage
 */
export async function loadBirdsForUser(userId: string): Promise<Bird[]> {
  try {
    // Tentar carregar do Supabase
    const { data, error } = await supabase
      .from('birds')
      .select('*')
      .eq('breeder_id', userId);

    if (!error && data && data.length > 0) {
      console.log(`Carregadas ${data.length} pássaros do Supabase`);
      return data.map(b => ({
        id: b.id,
        name: b.name,
        species: b.species,
        sex: b.sex,
        status: b.status,
        ringNumber: b.ring_number,
        birthDate: b.birth_date,
        colorMutation: b.color_mutation,
        classification: b.classification,
        location: b.location,
        fatherId: b.father_id,
        motherId: b.mother_id,
        songTrainingStatus: b.song_training_status,
        songType: b.song_type,
        trainingNotes: b.training_notes,
        photoUrl: b.photo_url
      } as Bird));
    }
  } catch (err) {
    console.warn('Erro ao carregar do Supabase, usando localStorage:', err);
  }

  // Fallback para localStorage
  const stored = localStorage.getItem('avigestao_state_v2');
  if (stored) {
    const data = JSON.parse(stored);
    return data?.birds || [];
  }

  return [];
}

/**
 * Salva novo pássaro no Supabase e localStorage
 */
export async function saveBirdToSupabase(
  bird: Bird,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Salvar no Supabase
    const { error } = await supabase.from('birds').upsert({
      id: bird.id,
      breeder_id: userId,
      name: bird.name,
      species: bird.species,
      sex: bird.sex,
      status: bird.status,
      ring_number: bird.ringNumber,
      birth_date: bird.birthDate,
      color_mutation: bird.colorMutation,
      classification: bird.classification,
      location: bird.location,
      father_id: bird.fatherId,
      mother_id: bird.motherId,
      song_training_status: bird.songTrainingStatus,
      song_type: bird.songType,
      training_notes: bird.trainingNotes,
      photo_url: bird.photoUrl
    });

    if (error) {
      console.warn('Erro ao salvar no Supabase:', error);
      // Continua mesmo assim, localStorage já tem os dados
    }

    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: errorMsg
    };
  }
}
