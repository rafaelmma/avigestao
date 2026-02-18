import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp,
  writeBatch,
  deleteField,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logError, logWarning } from '../lib/logger';
import {
  Bird,
  Pair,
  Clutch,
  Medication,
  MedicationApplication,
  MovementRecord,
  Transaction,
  MaintenanceTask,
  TournamentEvent,
  ContinuousTreatment,
  BreederSettings,
  MedicationCatalogItem,
  RingBatch,
  RingItem,
} from '../types';
import { DEFAULT_MEDICATION_CATALOG } from '../constants/medicationCatalog';

// Helper para processar campos undefined como deleteField (Firestore não aceita undefined)
const cleanUndefined = (obj: Record<string, unknown>, isNested: boolean = false): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Apenas usar deleteField no nível superior, não em objetos aninhados
      if (!isNested) {
        result[key] = deleteField();
      }
      // Em objetos aninhados, simplesmente não incluir o campo
    } else if (value === '') {
      // Remover strings vazias - deleteField apenas no nível superior
      if (!isNested) {
        result[key] = deleteField();
      }
      // Em objetos aninhados, não incluir campos vazios
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) {
      // Limpeza profunda (recursiva) para objetos aninhados
      const cleanedNested = cleanUndefined(value as Record<string, unknown>, true);
      // Só incluir o campo aninhado se ainda tem propriedades após limpeza
      if (Object.keys(cleanedNested).length > 0) {
        result[key] = cleanedNested;
      }
    } else if (Array.isArray(value)) {
      // Para arrays, limpar undefined dentro do array
      result[key] = value.map((item) => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date) && !(item instanceof Timestamp)) {
          return cleanUndefined(item as Record<string, unknown>, true);
        }
        return item;
      });
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Helper para remover campos undefined (sem usar deleteField)
const removeUndefined = (obj: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

// (timestampToISO removed — não utilizado)

const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const debugLog = (...args: unknown[]) => {
  if (import.meta?.env?.DEV) {
    console.log(...args);
  }
};

const getBreederPublicProfile = async (
  userId: string,
): Promise<{
  breederName?: string;
  logoUrl?: string;
  accentColor?: string;
  primaryColor?: string;
} | null> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        breederName: data.breederName || undefined,
        logoUrl: data.logoUrl || undefined,
        accentColor: data.accentColor || undefined,
        primaryColor: data.primaryColor || undefined,
      };
    }
  } catch (error) {
     console.error('Erro ao buscar nome do criador:', getErrorMessage(error));
  }
  return null;
};

const buildPublicBirdPayload = (
  birdId: string,
  bird: Bird,
  userId: string,
  breederProfile?: {
    breederName?: string;
    logoUrl?: string;
    accentColor?: string;
    primaryColor?: string;
  } | null,
) => {
  return cleanUndefined({
    id: birdId,
    breederId: bird.breederId || userId,
    breederName: breederProfile?.breederName,
    breederLogo: breederProfile?.logoUrl,
    breederAccentColor: breederProfile?.accentColor,
    breederPrimaryColor: breederProfile?.primaryColor,
    name: bird.name,
    species: bird.species,
    sex: bird.sex || 'Desconhecido',
    status: bird.status || 'Ativo',
    ringNumber: bird.ringNumber,
    birthDate: bird.birthDate,
    colorMutation: bird.colorMutation,
    classification: bird.classification,
    fatherId: bird.fatherId,
    motherId: bird.motherId,
    manualAncestors: bird.manualAncestors,
    photoUrl: bird.photoUrl,
    createdAt: bird.createdAt || Timestamp.now(),
    updatedAt: Timestamp.now(),
    isPublic: true,
  });
};

const syncPublicBird = async (userId: string, birdId: string, bird: Bird): Promise<void> => {
  try {
    const publicRef = doc(db, 'public_birds', birdId);
    if (bird.isPublic) {
      const breederProfile = await getBreederPublicProfile(userId);
      await setDoc(publicRef, buildPublicBirdPayload(birdId, bird, userId, breederProfile), {
        merge: true,
      });
    } else {
      await deleteDoc(publicRef);
    }
  } catch (error) {
      // Não poluir logs de produção com erros de permissão — logar apenas em DEV
      debugLog('Erro ao sincronizar pássaro público:', getErrorMessage(error));
  }
};

// ============= BIRDS =============
export const getBirds = async (userId: string): Promise<Bird[]> => {
  try {
    console.log('[getBirds] Recarregando pássaros do Firestore para userId:', userId);
    const birdsRef = collection(db, 'users', userId, 'birds');
    // Retornar apenas pássaros ativos (filtrar soft-deleted)
    const snapshot = await getDocs(birdsRef);
    console.log('[getBirds] Total de documentos obtidos:', snapshot.docs.length);
    
    const birds = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Bird))
      .filter((b) => !((b as any).deleted === true || !!b.deletedAt));
    
    console.log('[getBirds] Pássaros após filtro (excluindo deletados):', birds.length);
    birds.forEach((b) => {
      console.log(`[getBirds] Pássaro: ${b.id} - name="${b.name}", sex="${b.sex}", sexing=${JSON.stringify(b.sexing)}`);
    });
    
    debugLog('getBirds retornando:', birds);
    return birds;
  } catch (error) {
    console.error('Erro ao buscar birds:', error);
    return [];
  }
};

// Retorna apenas pássaros que foram movidos para a lixeira (soft-deleted)
export const getDeletedBirds = async (userId: string): Promise<Bird[]> => {
  try {
    const birdsRef = collection(db, 'users', userId, 'birds');
    const snapshot = await getDocs(birdsRef);
    const birds = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) } as Bird))
      .filter((b) => (b as any).deleted === true || !!b.deletedAt);
    return birds;
  } catch (error) {
    console.error('Erro ao buscar pássaros na lixeira:', error);
    return [];
  }
};

// ============= RINGS =============
export const getRingBatches = async (userId: string): Promise<RingBatch[]> => {
  try {
    const batchesRef = collection(db, 'users', userId, 'ring_batches');
    const snapshot = await getDocs(batchesRef);
    return snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as RingBatch,
    );
  } catch (error) {
    console.error('Erro ao buscar lotes de anilhas:', error);
    return [];
  }
};

export const addRingBatchInFirestore = async (
  userId: string,
  batch: Omit<RingBatch, 'id'>,
): Promise<string | null> => {
  try {
    const batchesRef = collection(db, 'users', userId, 'ring_batches');
    const docRef = await addDoc(
      batchesRef,
      removeUndefined({
        ...batch,
        createdAt: Timestamp.now(),
      }),
    );
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar lote de anilhas:', error);
    return null;
  }
};

export const updateRingBatchInFirestore = async (
  userId: string,
  batchId: string,
  updates: Partial<RingBatch>,
): Promise<boolean> => {
  try {
    const batchRef = doc(db, 'users', userId, 'ring_batches', batchId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
    });
    await updateDoc(batchRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar lote de anilhas:', error);
    return false;
  }
};

export const getRings = async (userId: string): Promise<RingItem[]> => {
  try {
    const ringsRef = collection(db, 'users', userId, 'rings');
    const snapshot = await getDocs(ringsRef);
    return snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as RingItem,
    );
  } catch (error) {
    console.error('Erro ao buscar anilhas:', error);
    return [];
  }
};

export const addRingItemsInFirestore = async (
  userId: string,
  items: Omit<RingItem, 'id'>[],
): Promise<string[]> => {
  if (!items.length) return [];

  const ringsRef = collection(db, 'users', userId, 'rings');
  const ids: string[] = [];
  const maxBatchSize = 450;
  let batch = writeBatch(db);
  let count = 0;

  for (const item of items) {
    const docRef = doc(ringsRef);
    ids.push(docRef.id);
    batch.set(
      docRef,
      removeUndefined({
        ...item,
        createdAt: Timestamp.now(),
      }),
    );
    count += 1;

    if (count >= maxBatchSize) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return ids;
};

export const updateRingItemInFirestore = async (
  userId: string,
  ringId: string,
  updates: Partial<RingItem>,
): Promise<boolean> => {
  try {
    const ringRef = doc(db, 'users', userId, 'rings', ringId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
    });
    await updateDoc(ringRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar anilha:', error);
    return false;
  }
};

export const deleteRingItemInFirestore = async (
  userId: string,
  ringId: string,
): Promise<boolean> => {
  try {
    const ringRef = doc(db, 'users', userId, 'rings', ringId);
    await deleteDoc(ringRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar anilha:', error);
    return false;
  }
};

export const addBird = async (userId: string, bird: Omit<Bird, 'id'>): Promise<string | null> => {
  try {
    const birdsRef = collection(db, 'users', userId, 'birds');
    // Garantir que breederId está definido antes de salvar
    const birdWithBreederId = {
      ...bird,
      breederId: bird.breederId || userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(birdsRef, birdWithBreederId);

    // Criar índice público para permitir busca via QR code
    const indexRef = doc(db, 'bird_index', docRef.id);
    await setDoc(indexRef, {
      userId,
      birdId: docRef.id,
      createdAt: Timestamp.now(),
    });

    debugLog('[addBird] Índice público criado para:', docRef.id);

    if (bird.isPublic) {
      try {
        await syncPublicBird(userId, docRef.id, { ...bird, id: docRef.id } as Bird);
      } catch (err: unknown) {
        if (import.meta?.env?.DEV) {
          console.debug('[addBird] Falha ao sincronizar pássaro público (ignorado):', getErrorMessage(err));
        }
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar bird:', error);
    return null;
  }
};

export const updateBird = async (
  userId: string,
  birdId: string,
  updates: Partial<Bird>,
): Promise<boolean> => {
  try {
    console.log('[updateBird-Firestore] INICIANDO atualização:', { userId, birdId, updatesKeys: Object.keys(updates) });
    console.log('[updateBird-Firestore] Payload a ser escrito:', updates);
    
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    
    console.log('[updateBird-Firestore] Payload limpo (após cleanUndefined):', cleanedUpdates);
    
    // Usar updateDoc ao invés de setDoc para evitar que campos antigos sejam preservados
    // updateDoc faz update de verdade sem merge de campos antigos
    await updateDoc(birdRef, cleanedUpdates);
    console.log('[updateBird-Firestore] ✓ updateDoc executado com sucesso');

    // Leitura de verificação: ler o documento após a escrita para garantir que
    // o Firestore persistiu os valores.
    try {
      const after = await getDoc(birdRef);
      if (after.exists()) {
        const afterData = after.data() as Bird;
        console.log('[updateBird-Firestore] ✓ Documento APÓS update (verificação):', {
          id: afterData.id,
          sex: afterData.sex,
          sexing: afterData.sexing,
          documents: afterData.documents,
          updatedAt: afterData.updatedAt,
        });
        // Dump completo do sexing para debug
        console.log('[updateBird-Firestore] SEXING COMPLETO APÓS UPDATE:', JSON.stringify(afterData.sexing, null, 2));
        
        // Validar que os campos foram de fato persistidos
        const expectedFields = ['sex', 'sexing', 'documents'];
        for (const field of expectedFields) {
          if (field in cleanedUpdates) {
            const persisted = (afterData as any)[field];
            const expected = (cleanedUpdates as any)[field];
            const match = JSON.stringify(persisted) === JSON.stringify(expected);
            console.log(`[updateBird-Firestore] Campo "${field}": ${match ? '✓ MATCH' : '✗ MISMATCH'} (persisted=${JSON.stringify(persisted)}, expected=${JSON.stringify(expected)})`);
          }
        }
      } else {
        console.warn('[updateBird-Firestore] ✗ Documento NÃO EXISTE após update!');
      }
    } catch (err) {
      console.error('[updateBird-Firestore] Erro na verificação pós-escrita:', getErrorMessage(err));
    }

    // Garantir que o índice público existe (para pássaros antigos)
    const indexRef = doc(db, 'bird_index', birdId);
    const indexSnapshot = await getDoc(indexRef);

    if (!indexSnapshot.exists()) {
      await setDoc(indexRef, {
        userId,
        birdId,
        createdAt: Timestamp.now(),
      });
      debugLog('[updateBird] Índice público criado para pássaro existente:', birdId);
    }

    const updatedSnapshot = await getDoc(birdRef);
    if (updatedSnapshot.exists()) {
      try {
        await syncPublicBird(userId, birdId, updatedSnapshot.data() as Bird);
      } catch (err: unknown) {
        if (import.meta?.env?.DEV) {
          console.debug('[updateBird] Falha ao sincronizar pássaro público (ignorado):', getErrorMessage(err));
        }
      }
    }

    console.log('[updateBird-Firestore] ✓✓✓ Atualização COMPLETA com sucesso');
    return true;
  } catch (error) {
    console.error('[updateBird-Firestore] ✗ Erro ao atualizar bird:', error);
    return false;
  }
};

export const syncPublicBirdsForUser = async (userId: string, birds: Bird[]): Promise<void> => {
  try {
    const publicBirds = (birds || []).filter((bird) => bird?.isPublic && bird.id);
    const birdsById = new Map(birds.filter((b) => b.id).map((b) => [b.id, b]));

    const resolveAncestor = (root: Bird, path: string): Bird | undefined => {
      let current: Bird | undefined = root;
      for (const step of path) {
        if (!current) return undefined;
        const nextId = step === 'f' ? current.fatherId : current.motherId;
        if (!nextId) return undefined;
        current = birdsById.get(nextId);
      }
      return current;
    };

    const ancestorPaths = [
      'f',
      'm',
      'ff',
      'fm',
      'mf',
      'mm',
      'fff',
      'ffm',
      'fmf',
      'fmm',
      'mff',
      'mfm',
      'mmf',
      'mmm',
    ];

    const hydratedPublicBirds = publicBirds.map((bird) => {
      const manualAncestors = { ...(bird.manualAncestors || {}) } as Record<string, string>;
      ancestorPaths.forEach((path) => {
        if (!manualAncestors[path]) {
          const ancestor = resolveAncestor(bird, path);
          if (ancestor?.name) {
            manualAncestors[path] = ancestor.name;
          }
        }
      });
      return { ...bird, manualAncestors } as Bird;
    });

    await Promise.all(hydratedPublicBirds.map((bird) => syncPublicBird(userId, bird.id, bird)));
  } catch (error) {
    console.error('Erro ao sincronizar pássaros públicos do usuário:', error);
  }
};

export const deleteBird = async (userId: string, birdId: string): Promise<boolean> => {
  try {
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    // Usar setDoc com merge para evitar erro "No document to update" quando o
    // documento não existir (evita warnings em produção).
    await setDoc(
      birdRef,
      {
        deleted: true,
        deletedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.error('Erro ao deletar bird:', error);
    return false;
  }
};

export const permanentlyDeleteBirdInFirestore = async (
  userId: string,
  birdId: string,
): Promise<boolean> => {
  try {
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    await deleteDoc(birdRef);

    // Remover índices públicos relacionados
    const indexRef = doc(db, 'bird_index', birdId);
    await deleteDoc(indexRef);

    const publicRef = doc(db, 'public_birds', birdId);
    await deleteDoc(publicRef);

    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar bird permanentemente:', getErrorMessage(error));
    return false;
  }
};

// ============= PAIRS =============
export const getPairs = async (userId: string): Promise<Pair[]> => {
  try {
    const pairsRef = collection(db, 'users', userId, 'pairs');
    const snapshot = await getDocs(pairsRef);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Pair),
    );
  } catch (error) {
    console.error('Erro ao buscar pairs:', error);
    return [];
  }
};

export const addPair = async (userId: string, pair: Omit<Pair, 'id'>): Promise<string | null> => {
  try {
    const pairsRef = collection(db, 'users', userId, 'pairs');
    const docRef = await addDoc(pairsRef, {
      ...pair,
      userId: pair.userId || userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar pair:', error);
    return null;
  }
};

export const updatePair = async (
  userId: string,
  pairId: string,
  updates: Partial<Pair>,
): Promise<boolean> => {
  try {
    const pairRef = doc(db, 'users', userId, 'pairs', pairId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    // Usar setDoc com merge para upsert e evitar erro se o doc não existir
    await setDoc(pairRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar pair:', error);
    return false;
  }
};

export const deletePair = async (userId: string, pairId: string): Promise<boolean> => {
  try {
    const pairRef = doc(db, 'users', userId, 'pairs', pairId);
    // Usar setDoc com merge para marcar soft-delete sem depender do documento existir
    await setDoc(
      pairRef,
      {
        deleted: true,
        deletedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.error('Erro ao deletar pair:', error);
    return false;
  }
};

export const permanentlyDeletePairInFirestore = async (
  userId: string,
  pairId: string,
): Promise<boolean> => {
  try {
    const pairRef = doc(db, 'users', userId, 'pairs', pairId);
    await deleteDoc(pairRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar pair permanentemente:', error);
    return false;
  }
};

// ============= SETTINGS =============
export const getSettings = async (userId: string): Promise<BreederSettings | null> => {
  try {
    console.log('Buscando configurações para o usuário:', userId);
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
      console.log('Configurações encontradas em preferences:', snapshot.data());
      return snapshot.data() as BreederSettings;
    }
    const generalRef = doc(db, 'users', userId, 'settings', 'general');
    const generalSnapshot = await getDoc(generalRef);
    if (generalSnapshot.exists()) {
      console.log('Configurações encontradas em general:', generalSnapshot.data());
      return generalSnapshot.data() as BreederSettings;
    }
    console.log('Nenhuma configuração encontrada para o usuário:', userId);
    return null;
  } catch (error) {
    logError('Erro ao buscar settings:', error);
    return null;
  }
};

export const saveSettings = async (userId: string, settings: BreederSettings): Promise<boolean> => {
  try {
    console.log('[saveSettings] Iniciando salvamento para usuário:', userId);
    console.log('[saveSettings] Dados a salvar:', {
      sispassNumber: settings.sispassNumber,
      renewalDate: settings.renewalDate,
      lastRenewalDate: settings.lastRenewalDate
    });
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const generalRef = doc(db, 'users', userId, 'settings', 'general');
    const cleanedUpdates = cleanUndefined({
      ...settings,
      updatedAt: Timestamp.now(),
    });
    await Promise.all([
      setDoc(settingsRef, cleanedUpdates, { merge: true }),
      setDoc(generalRef, cleanedUpdates, { merge: true }),
    ]);
    console.log('[saveSettings] Salvamento concluído com sucesso!');
    return true;
  } catch (error) {
    logError('Erro ao salvar settings:', error);
    console.error('[saveSettings] Erro detalhado:', error);
    return false;
  }
};

// ============= MEDICATION CATALOG =============
export const getMedicationCatalog = async (): Promise<MedicationCatalogItem[]> => {
  try {
    // Tentar carregar do Firestore (coleção global, não por usuário)
    const catalogRef = collection(db, 'medicationCatalog');
    const snapshot = await getDocs(catalogRef);

    if (snapshot.docs.length > 0) {
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as MedicationCatalogItem),
      );
    }

    // Se não existir, retornar catálogo padrão
    debugLog('[getMedicationCatalog] Usando catálogo padrão');
    return DEFAULT_MEDICATION_CATALOG;
  } catch (error) {
    console.error('Erro ao buscar catálogo de medicamentos:', error);
    return DEFAULT_MEDICATION_CATALOG;
  }
};

// ============= MEDICATIONS =============
export const getMedications = async (userId: string): Promise<Medication[]> => {
  try {
    const medsRef = collection(db, 'users', userId, 'medications');
    const snapshot = await getDocs(medsRef);
    const medications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, // Document ID do Firestore tem prioridade
      } as Medication;
    });
    return medications;
  } catch (error) {
    console.error('Erro ao buscar medications:', error);
    return [];
  }
};

export const addMedicationInFirestore = async (
  userId: string,
  medication: Medication,
): Promise<string | null> => {
  try {
    const medId = medication.id;
    if (!medId) {
      console.error('[addMedicationInFirestore] Medicamento sem ID!', medication);
      return null;
    }

    debugLog('[addMedicationInFirestore] Salvando medicamento com ID:', medId);

    const medRef = doc(db, 'users', userId, 'medications', medId);
    const medData = removeUndefined({
      ...medication,
      id: medId, // Garante que o ID dentro do documento bata com o doc.id
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(medRef, medData);

    debugLog('[addMedicationInFirestore] Medicamento salvo com sucesso! ID:', medId);
    return medId;
  } catch (error) {
    console.error('Erro ao adicionar medicamento:', error);
    return null;
  }
};

export const updateMedicationInFirestore = async (
  userId: string,
  medId: string,
  updates: Partial<Medication>,
): Promise<boolean> => {
  try {
    const medRef = doc(db, 'users', userId, 'medications', medId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: medId, // Garante que o ID está sempre atualizado
      updatedAt: Timestamp.now(),
    });

    // Usar setDoc com merge: true para fazer upsert (create if not exists)
    await setDoc(medRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar medicamento:', error);
    return false;
  }
};

export const deleteMedicationInFirestore = async (
  userId: string,
  medication: Medication,
): Promise<boolean> => {
  try {
    debugLog('[deleteMedicationInFirestore] Soft delete do medicamento:', medication.id);
    const medRef = doc(db, 'users', userId, 'medications', medication.id);

    const medWithoutDeleted = { ...(medication as unknown as Record<string, unknown>) };
    if ('deleted' in medWithoutDeleted) delete medWithoutDeleted['deleted'];

    const updatedMed = removeUndefined({
      ...medWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(medRef, updatedMed, { merge: true });
    debugLog('[deleteMedicationInFirestore] Sucesso! Medicamento marcado como deletado');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar medicamento:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteMedicationInFirestore = async (
  userId: string,
  medId: string,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteMedicationInFirestore] Deletando permanentemente:', medId);

    const medRef = doc(db, 'users', userId, 'medications', medId);

    const beforeSnapshot = await getDoc(medRef);
    debugLog(
      '[permanentlyDeleteMedicationInFirestore] Documento existe ANTES?',
      beforeSnapshot.exists(),
    );

    await deleteDoc(medRef);
    debugLog('[permanentlyDeleteMedicationInFirestore] deleteDoc executado!');

    const afterSnapshot = await getDoc(medRef);
    debugLog(
      '[permanentlyDeleteMedicationInFirestore] Documento existe DEPOIS?',
      afterSnapshot.exists(),
    );

    return true;
  } catch (error: unknown) {
    console.error('[permanentlyDeleteMedicationInFirestore] ERRO:', getErrorMessage(error));
    return false;
  }
};

// ============= MOVEMENTS =============
export const getMovements = async (userId: string): Promise<MovementRecord[]> => {
  try {
    const movementsRef = collection(db, 'users', userId, 'movements');
    const snapshot = await getDocs(movementsRef);

    debugLog('[getMovements] Total de docs no snapshot:', snapshot.docs.length);
    debugLog(
      '[getMovements] IDs dos movimentos:',
      snapshot.docs.map((d) => d.id),
    );

    const movements = snapshot.docs.map((doc) => {
      const data = doc.data();
      // SEMPRE usar o document ID do Firestore como ID principal
      // Ignorar o campo "id" interno do documento para evitar conflitos
      return {
        ...data,
        id: doc.id, // Document ID do Firestore tem prioridade
      } as MovementRecord;
    });

    // Sort client-side to avoid composite index
    return movements.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Erro ao buscar movements:', error);
    return [];
  }
};

export const addMovementInFirestore = async (
  userId: string,
  movement: MovementRecord,
): Promise<string | null> => {
  try {
    // Usar o ID do movimento como document ID no Firestore
    // Se não tiver ID, gerar um novo UUID
    const movementId = movement.id;
    if (!movementId) {
      console.error('[addMovementInFirestore] Movimento sem ID!', movement);
      return null;
    }

    debugLog('[addMovementInFirestore] Salvando movimento com ID:', movementId);

    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    await setDoc(movementRef, {
      ...movement,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    debugLog('[addMovementInFirestore] Movimento salvo com sucesso! ID:', movementId);
    return movementId;
  } catch (error) {
    console.error('Erro ao adicionar movement:', error);
    return null;
  }
};

export const updateMovementInFirestore = async (
  userId: string,
  movementId: string,
  updates: Partial<MovementRecord>,
): Promise<boolean> => {
  try {
    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    // Usar setDoc com merge para evitar erro se o movimento não existir e permitir upsert
    await setDoc(movementRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar movement:', error);
    return false;
  }
};

export const deleteMovementInFirestore = async (
  userId: string,
  movement: MovementRecord,
): Promise<boolean> => {
  try {
    debugLog('[deleteMovementInFirestore] Deletando movimento:', movement.id);
    const movementRef = doc(db, 'users', userId, 'movements', movement.id);

    // Criar cópia do movimento sem o campo "deleted" antigo (se existir)
    const movementWithoutDeleted = { ...(movement as unknown as Record<string, unknown>) };
    const deleted = movementWithoutDeleted['deleted'];
    if ('deleted' in movementWithoutDeleted) delete movementWithoutDeleted['deleted'];

    // Mesclar o movimento completo com deletedAt
    const updatedMovement = {
      ...movementWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    debugLog('[deleteMovementInFirestore] updatedMovement:', updatedMovement);
    debugLog(
      '[deleteMovementInFirestore] Campo "deleted" removido?',
      deleted !== undefined ? 'sim' : 'não',
    );
    debugLog(
      '[deleteMovementInFirestore] deletedAt é Timestamp?',
      updatedMovement.deletedAt instanceof Timestamp,
    );

    // Usar setDoc com merge para fazer upsert - garante que todos os campos são salvos
    await setDoc(movementRef, updatedMovement, { merge: true });
    debugLog(
      '[deleteMovementInFirestore] Sucesso! Movimento marcado como deletado no Firestore',
    );
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar movement:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteMovementInFirestore = async (
  userId: string,
  movementId: string,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteMovementInFirestore] Iniciando...');
    debugLog('[permanentlyDeleteMovementInFirestore] userId:', userId);
    debugLog('[permanentlyDeleteMovementInFirestore] movementId:', movementId);

    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    debugLog('[permanentlyDeleteMovementInFirestore] movementRef path:', movementRef.path);

    // Verificar se o documento existe ANTES do delete
    const beforeSnapshot = await getDoc(movementRef);
    debugLog(
      '[permanentlyDeleteMovementInFirestore] Documento existe ANTES do delete?',
      beforeSnapshot.exists(),
    );
    if (beforeSnapshot.exists()) {
      debugLog(
        '[permanentlyDeleteMovementInFirestore] Dados do doc ANTES:',
        beforeSnapshot.data(),
      );
    }

    await deleteDoc(movementRef);
    debugLog('[permanentlyDeleteMovementInFirestore] deleteDoc executado!');

    // Verificar se o documento existe DEPOIS do delete
    const afterSnapshot = await getDoc(movementRef);
    debugLog(
      '[permanentlyDeleteMovementInFirestore] Documento existe DEPOIS do delete?',
      afterSnapshot.exists(),
    );
    if (afterSnapshot.exists()) {
      console.error(
        '[permanentlyDeleteMovementInFirestore] ERRO! Documento ainda existe após delete:',
        afterSnapshot.data(),
      );
    }

    debugLog('[permanentlyDeleteMovementInFirestore] deleteDoc executado com sucesso!');

    return true;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error('[permanentlyDeleteMovementInFirestore] ERRO capturado:', getErrorMessage(error));
    console.error('[permanentlyDeleteMovementInFirestore] Error code:', err.code);
    console.error('[permanentlyDeleteMovementInFirestore] Error message:', err.message);

    // Se o doc não existe, apenas ignorar o erro
    if (err.code === 'not-found') {
      console.warn('[permanentlyDeleteMovementInFirestore] Movimento não encontrado (já deletado)');
      return true; // Sucesso porque já não existe
    }
    console.error('[permanentlyDeleteMovementInFirestore] Erro real ao deletar:', getErrorMessage(error));
    return false;
  }
};

// ============= TRANSACTIONS =============
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    const transactions = snapshot.docs
      .map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Transaction),
      )
      .filter((tx) => !tx.deletedAt); // Filtrar apenas transações ativas
    // Sort client-side to avoid composite index
    return transactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Erro ao buscar transactions:', error);
    return [];
  }
};

export const getDeletedTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    const deletedTransactions = snapshot.docs
      .map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Transaction),
      )
      .filter((tx) => tx.deletedAt); // Filtrar apenas transações deletadas
    // Sort client-side to avoid composite index
    return deletedTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Erro ao buscar transações deletadas:', error);
    return [];
  }
};

export const saveTransactionToFirestore = async (
  userId: string,
  transaction: Transaction,
): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(
      transactionRef,
      {
        ...transaction,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return true;
  } catch (error: unknown) {
    console.error('Erro ao salvar transação:', getErrorMessage(error));
    return false;
  }
};

export const deleteTransactionInFirestore = async (
  userId: string,
  transaction: Transaction,
): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(
      transactionRef,
      {
        ...transaction,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar transação:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteTransactionInFirestore = async (
  userId: string,
  transactionId: string,
): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(transactionRef);
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar permanentemente transação:', getErrorMessage(error));
    return false;
  }
};

// ============= TASKS =============
export const getTasks = async (userId: string): Promise<MaintenanceTask[]> => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const snapshot = await getDocs(tasksRef);
    const tasks = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, // Document ID do Firestore tem prioridade
      } as MaintenanceTask;
    });
    return tasks;
  } catch (error) {
    console.error('Erro ao buscar tasks:', error);
    return [];
  }
};

export const addTaskInFirestore = async (
  userId: string,
  task: MaintenanceTask,
): Promise<string | null> => {
  try {
    // Usar o ID da tarefa como document ID no Firestore
    const taskId = task.id;
    if (!taskId) {
      console.error('[addTaskInFirestore] Tarefa sem ID!', task);
      return null;
    }

    debugLog('[addTaskInFirestore] Salvando tarefa com ID:', taskId);

    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskData = removeUndefined({
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(taskRef, taskData);

    debugLog('[addTaskInFirestore] Tarefa salva com sucesso! ID:', taskId);
    return taskId;
  } catch (error) {
    console.error('Erro ao adicionar tarefa:', error);
    return null;
  }
};

export const updateTaskInFirestore = async (
  userId: string,
  taskId: string,
  updates: Partial<MaintenanceTask>,
): Promise<boolean> => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    await updateDoc(taskRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return false;
  }
};

export const deleteTaskInFirestore = async (
  userId: string,
  task: MaintenanceTask,
): Promise<boolean> => {
  try {
    debugLog('[deleteTaskInFirestore] Soft delete da tarefa:', task.id);
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);

    // Remover campo "deleted" antigo se existir e remover undefined
    const taskWithoutDeleted = { ...(task as unknown as Record<string, unknown>) };
    if ('deleted' in taskWithoutDeleted) delete taskWithoutDeleted['deleted'];

    const updatedTask = removeUndefined({
      ...taskWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(taskRef, updatedTask, { merge: true });
    debugLog('[deleteTaskInFirestore] Sucesso! Tarefa marcada como deletada');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar tarefa:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteTaskInFirestore = async (
  userId: string,
  taskId: string,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteTaskInFirestore] Deletando permanentemente:', taskId);

    const taskRef = doc(db, 'users', userId, 'tasks', taskId);

    // Verificar se existe ANTES do delete
    const beforeSnapshot = await getDoc(taskRef);
    debugLog(
      '[permanentlyDeleteTaskInFirestore] Documento existe ANTES?',
      beforeSnapshot.exists(),
    );

    await deleteDoc(taskRef);
    debugLog('[permanentlyDeleteTaskInFirestore] deleteDoc executado!');

    // Verificar se existe DEPOIS do delete
    const afterSnapshot = await getDoc(taskRef);
    debugLog(
      '[permanentlyDeleteTaskInFirestore] Documento existe DEPOIS?',
      afterSnapshot.exists(),
    );

    return true;
  } catch (error: unknown) {
    console.error('[permanentlyDeleteTaskInFirestore] ERRO:', getErrorMessage(error));
    return false;
  }
};

// ============= TOURNAMENTS =============
export const getTournaments = async (userId: string): Promise<TournamentEvent[]> => {
  try {
    const tournamentsRef = collection(db, 'users', userId, 'tournaments');
    const snapshot = await getDocs(tournamentsRef);
    const tournaments = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id, // Document ID do Firestore tem prioridade
        } as TournamentEvent;
      })
      .filter((tournament) => !tournament.deletedAt); // Filtrar apenas eventos ativos
    return tournaments;
  } catch (error) {
    console.error('Erro ao buscar tournaments:', error);
    return [];
  }
};

export const getDeletedTournaments = async (userId: string): Promise<TournamentEvent[]> => {
  try {
    const tournamentsRef = collection(db, 'users', userId, 'tournaments');
    const snapshot = await getDocs(tournamentsRef);
    const deletedTournaments = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
        } as TournamentEvent;
      })
      .filter((tournament) => tournament.deletedAt); // Filtrar apenas eventos deletados
    return deletedTournaments;
  } catch (error) {
    console.error('Erro ao buscar tournaments deletados:', error);
    return [];
  }
};

export const addEventInFirestore = async (
  userId: string,
  event: TournamentEvent,
): Promise<string | null> => {
  try {
    const eventId = event.id;
    if (!eventId) {
      console.error('[addEventInFirestore] Evento sem ID!', event);
      return null;
    }

    debugLog('[addEventInFirestore] Salvando evento com ID:', eventId);

    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);
    const eventData = removeUndefined({
      ...event,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(eventRef, eventData);

    debugLog('[addEventInFirestore] Evento salvo com sucesso! ID:', eventId);
    return eventId;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    return null;
  }
};

export const updateEventInFirestore = async (
  userId: string,
  eventId: string,
  updates: Partial<TournamentEvent>,
): Promise<boolean> => {
  try {
    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    await updateDoc(eventRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return false;
  }
};

export const deleteEventInFirestore = async (
  userId: string,
  event: TournamentEvent,
): Promise<boolean> => {
  try {
    debugLog('[deleteEventInFirestore] Soft delete do evento:', event.id);
    const eventRef = doc(db, 'users', userId, 'tournaments', event.id);

    const eventWithoutDeleted = { ...(event as unknown as Record<string, unknown>) };
    if ('deleted' in eventWithoutDeleted) delete eventWithoutDeleted['deleted'];

    const updatedEvent = removeUndefined({
      ...eventWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(eventRef, updatedEvent, { merge: true });
    debugLog('[deleteEventInFirestore] Sucesso! Evento marcado como deletado');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar evento:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteEventInFirestore = async (
  userId: string,
  eventId: string,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteEventInFirestore] Deletando permanentemente:', eventId);

    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);

    const beforeSnapshot = await getDoc(eventRef);
    debugLog(
      '[permanentlyDeleteEventInFirestore] Documento existe ANTES?',
      beforeSnapshot.exists(),
    );

    await deleteDoc(eventRef);
    debugLog('[permanentlyDeleteEventInFirestore] deleteDoc executado!');

    const afterSnapshot = await getDoc(eventRef);
    debugLog(
      '[permanentlyDeleteEventInFirestore] Documento existe DEPOIS?',
      afterSnapshot.exists(),
    );

    return true;
  } catch (error: unknown) {
    console.error('[permanentlyDeleteEventInFirestore] ERRO:', getErrorMessage(error));
    return false;
  }
};

// ============= APPLICATIONS =============
export const getApplications = async (userId: string): Promise<MedicationApplication[]> => {
  try {
    const appRef = collection(db, 'users', userId, 'applications');
    const snapshot = await getDocs(appRef);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as MedicationApplication),
    );
  } catch (error) {
    console.error('Erro ao buscar applications:', error);
    return [];
  }
};

// ============= CLUTCHES =============
export const getClutches = async (userId: string): Promise<Clutch[]> => {
  try {
    const clutchRef = collection(db, 'users', userId, 'clutches');
    const snapshot = await getDocs(clutchRef);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Clutch),
    );
  } catch (error) {
    console.error('Erro ao buscar clutches:', error);
    return [];
  }
};

export const addClutchInFirestore = async (
  userId: string,
  clutch: Clutch,
): Promise<string | null> => {
  try {
    const clutchId = clutch.id;
    if (!clutchId) {
      console.error('[addClutchInFirestore] Ninhada sem ID!', clutch);
      return null;
    }

    const clutchRef = doc(db, 'users', userId, 'clutches', clutchId);
    const clutchData = cleanUndefined({
      ...clutch,
      id: clutchId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(clutchRef, clutchData);
    return clutchId;
  } catch (error) {
    console.error('Erro ao adicionar clutch:', error);
    return null;
  }
};

export const updateClutchInFirestore = async (
  userId: string,
  clutchId: string,
  updates: Partial<Clutch>,
): Promise<boolean> => {
  try {
    const clutchRef = doc(db, 'users', userId, 'clutches', clutchId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: clutchId,
      updatedAt: Timestamp.now(),
    });

    await setDoc(clutchRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar clutch:', error);
    return false;
  }
};

// ============= TREATMENTS =============
export const getTreatments = async (userId: string): Promise<ContinuousTreatment[]> => {
  try {
    const treatRef = collection(db, 'users', userId, 'treatments');
    const snapshot = await getDocs(treatRef);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as ContinuousTreatment),
    );
  } catch (error) {
    console.error('Erro ao buscar treatments:', error);
    return [];
  }
};

export const addTreatmentInFirestore = async (
  userId: string,
  treatment: ContinuousTreatment,
): Promise<string | null> => {
  try {
    const treatmentId = treatment.id;
    if (!treatmentId) {
      console.error('[addTreatmentInFirestore] Tratamento sem ID!', treatment);
      return null;
    }

    debugLog('[addTreatmentInFirestore] Salvando tratamento com ID:', treatmentId);

    const treatRef = doc(db, 'users', userId, 'treatments', treatmentId);
    const treatData = removeUndefined({
      ...treatment,
      id: treatmentId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(treatRef, treatData);

    debugLog('[addTreatmentInFirestore] Tratamento salvo com sucesso! ID:', treatmentId);
    return treatmentId;
  } catch (error) {
    console.error('Erro ao adicionar tratamento:', error);
    return null;
  }
};

export const updateTreatmentInFirestore = async (
  userId: string,
  treatmentId: string,
  updates: Partial<ContinuousTreatment>,
): Promise<boolean> => {
  try {
    const treatRef = doc(db, 'users', userId, 'treatments', treatmentId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: treatmentId,
      updatedAt: Timestamp.now(),
    });

    // Usar setDoc com merge: true para fazer upsert
    await setDoc(treatRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar tratamento:', error);
    return false;
  }
};

export const deleteTreatmentInFirestore = async (
  userId: string,
  treatment: ContinuousTreatment,
): Promise<boolean> => {
  try {
    debugLog('[deleteTreatmentInFirestore] Soft delete do tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);

    const updatedTreat = removeUndefined({
      ...treatment,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(treatRef, updatedTreat, { merge: true });
    debugLog('[deleteTreatmentInFirestore] Sucesso! Tratamento marcado como deletado');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar tratamento:', getErrorMessage(error));
    return false;
  }
};

export const restoreTreatmentInFirestore = async (
  userId: string,
  treatment: ContinuousTreatment,
): Promise<boolean> => {
  try {
    debugLog('[restoreTreatmentInFirestore] Restaurando tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);

    const treatmentWithoutDeletedAt = { ...(treatment as unknown as Record<string, unknown>) };
    if ('deletedAt' in treatmentWithoutDeletedAt) {
      delete treatmentWithoutDeletedAt['deletedAt'];
    }

    const updatedTreat = removeUndefined({
      ...treatmentWithoutDeletedAt,
      updatedAt: Timestamp.now(),
    });

    await setDoc(treatRef, updatedTreat, { merge: true });
    debugLog('[restoreTreatmentInFirestore] Sucesso! Tratamento restaurado');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao restaurar tratamento:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteTreatmentInFirestore = async (
  userId: string,
  treatment: ContinuousTreatment,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteTreatmentInFirestore] Hard delete do tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);

    // Verificar se existe
    const docSnap = await getDoc(treatRef);
    if (!docSnap.exists()) {
      console.warn(
        '[permanentlyDeleteTreatmentInFirestore] Tratamento não encontrado:',
        treatment.id,
      );
      return true;
    }

    await deleteDoc(treatRef);
    debugLog(
      '[permanentlyDeleteTreatmentInFirestore] Sucesso! Tratamento deletado permanentemente',
    );
    return true;
  } catch (error) {
    console.error('Erro ao deletar permanentemente tratamento:', error);
    return false;
  }
};

// ============= APPLICATIONS =============
export const addApplicationInFirestore = async (
  userId: string,
  app: MedicationApplication,
): Promise<string | null> => {
  try {
    const appId = app.id;
    if (!appId) {
      console.error('[addApplicationInFirestore] Aplicação sem ID!', app);
      return null;
    }

    debugLog('[addApplicationInFirestore] Salvando aplicação com ID:', appId);

    const appRef = doc(db, 'users', userId, 'applications', appId);
    const appData = removeUndefined({
      ...app,
      id: appId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(appRef, appData);

    debugLog('[addApplicationInFirestore] Aplicação salva com sucesso! ID:', appId);
    return appId;
  } catch (error) {
    console.error('Erro ao adicionar aplicação:', error);
    return null;
  }
};

export const updateApplicationInFirestore = async (
  userId: string,
  appId: string,
  updates: Partial<MedicationApplication>,
): Promise<boolean> => {
  try {
    const appRef = doc(db, 'users', userId, 'applications', appId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: appId,
      updatedAt: Timestamp.now(),
    });

    // Usar setDoc com merge: true para fazer upsert
    await setDoc(appRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar aplicação:', error);
    return false;
  }
};

export const deleteApplicationInFirestore = async (
  userId: string,
  app: MedicationApplication,
): Promise<boolean> => {
  try {
    debugLog('[deleteApplicationInFirestore] Soft delete da aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);

    const updatedApp = removeUndefined({
      ...app,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setDoc(appRef, updatedApp, { merge: true });
    debugLog('[deleteApplicationInFirestore] Sucesso! Aplicação marcada como deletada');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao deletar aplicação:', getErrorMessage(error));
    return false;
  }
};

export const restoreApplicationInFirestore = async (
  userId: string,
  app: MedicationApplication,
): Promise<boolean> => {
  try {
    debugLog('[restoreApplicationInFirestore] Restaurando aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);

    const appWithoutDeletedAt = { ...(app as unknown as Record<string, unknown>) };
    if ('deletedAt' in appWithoutDeletedAt) delete appWithoutDeletedAt['deletedAt'];

    const updatedApp = removeUndefined({
      ...appWithoutDeletedAt,
      updatedAt: Timestamp.now(),
    });

    await setDoc(appRef, updatedApp, { merge: true });
    debugLog('[restoreApplicationInFirestore] Sucesso! Aplicação restaurada');
    return true;
  } catch (error: unknown) {
    console.error('Erro ao restaurar aplicação:', getErrorMessage(error));
    return false;
  }
};

export const permanentlyDeleteApplicationInFirestore = async (
  userId: string,
  app: MedicationApplication,
): Promise<boolean> => {
  try {
    debugLog('[permanentlyDeleteApplicationInFirestore] Hard delete da aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);

    // Verificar se existe
    const docSnap = await getDoc(appRef);
    if (!docSnap.exists()) {
      console.warn('[permanentlyDeleteApplicationInFirestore] Aplicação não encontrada:', app.id);
      return true; // Já foi deletada ou nunca existiu
    }

    await deleteDoc(appRef);
    debugLog(
      '[permanentlyDeleteApplicationInFirestore] Sucesso! Aplicação deletada permanentemente',
    );
    return true;
  } catch (error) {
    console.error('Erro ao deletar permanentemente aplicação:', error);
    return false;
  }
};

// ============= BATCH OPERATIONS =============
export const batchDelete = async (
  userId: string,
  collection: string,
  ids: string[],
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, 'users', userId, collection, id);
      batch.update(docRef, {
        deleted: true,
        deletedAt: Timestamp.now(),
      });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Erro no batch delete:', error);
    return false;
  }
};
// ============= BIRD VERIFICATION ANALYTICS (PÚBLICO) =============
export interface BirdVerificationRecord {
  id: string;
  birdId: string;
  timestamp: Timestamp;
  userAgent: string;
  referrer?: string;
  ipHash?: string; // Hash do IP para privacidade
  location?: {
    city?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isp?: string;
  };
}

export const recordBirdVerification = async (birdId: string): Promise<boolean> => {
  try {
    const verificationRef = collection(db, 'bird_verifications');
    const docRef = doc(verificationRef);

    // Capturar localização via IP
    let locationData: BirdVerificationRecord['location'] = {
      city: 'Desconhecida',
      region: 'Desconhecida',
      country: 'Desconhecida',
      latitude: undefined,
      longitude: undefined,
      isp: 'Desconhecido',
    };

    try {
      // Usar API de geolocalização gratuita
      const geoResponse = await fetch('https://ipapi.co/json/');
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        locationData = {
          city: geoData.city || 'Desconhecida',
          region: geoData.region || 'Desconhecida',
          country: geoData.country_name || 'Desconhecida',
          latitude: geoData.latitude,
          longitude: geoData.longitude,
          isp: geoData.org || 'Desconhecido',
        };
        debugLog('[recordBirdVerification] Localização capturada:', locationData);
      }
    } catch (geoErr) {
      console.warn('[recordBirdVerification] Erro ao capturar geolocalização:', geoErr);
      // Continua sem localização
    }

    await setDoc(docRef, {
      birdId: birdId,
      timestamp: Timestamp.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct',
      location: locationData,
      // Não armazenar IP real por privacidade, apenas um hash simples
      ipHash: btoa(new Date().getTime().toString()).substring(0, 16),
    });

    debugLog('[recordBirdVerification] Verificação registrada para pássaro:', birdId);
    return true;
  } catch (error: unknown) {
    console.error('[recordBirdVerification] Erro ao registrar verificação:', getErrorMessage(error));
    return false;
  }
};

export const getBirdVerifications = async (birdId: string): Promise<BirdVerificationRecord[]> => {
  try {
    const verificationsRef = collection(db, 'bird_verifications');
    const q = query(verificationsRef, where('birdId', '==', birdId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as BirdVerificationRecord),
    );
  } catch (error: unknown) {
    console.error('[getBirdVerifications] Erro ao buscar verificações:', getErrorMessage(error));
    return [];
  }
};

export const getAllBirdVerifications = async (): Promise<BirdVerificationRecord[]> => {
  try {
    const verificationsRef = collection(db, 'bird_verifications');
    const q = query(verificationsRef, orderBy('timestamp', 'desc'), limit(1000));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as BirdVerificationRecord),
    );
  } catch (error: unknown) {
    console.error('[getAllBirdVerifications] Erro ao buscar todas as verificações:', getErrorMessage(error));
    return [];
  }
};

/**
 * Busca dados públicos de um pássaro por ID (sem autenticação necessária)
 * Função pública para verificação via QR code
 */
export const getPublicBirdById = async (birdId: string): Promise<Bird | null> => {
  try {
    debugLog('[getPublicBirdById] Buscando pássaro:', birdId);

    if (!birdId) {
      console.warn('[getPublicBirdById] BirdId vazio');
      return null;
    }

    // 1. Buscar no índice público para descobrir o userId
    const indexRef = doc(db, 'bird_index', birdId);
    const indexSnapshot = await getDoc(indexRef);

    if (!indexSnapshot.exists()) {
      console.warn('[getPublicBirdById] Pássaro não encontrado no índice:', birdId);
      return null;
    }

    const indexData = indexSnapshot.data();
    const userId = indexData.userId;

    if (!userId) {
      console.warn('[getPublicBirdById] userId não encontrado no índice');
      return null;
    }

    debugLog('[getPublicBirdById] Encontrado userId no índice:', userId);

    // 2. Buscar o pássaro na coleção do usuário
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    const birdSnapshot = await getDoc(birdRef);

    if (!birdSnapshot.exists()) {
      console.warn('[getPublicBirdById] Pássaro não encontrado na coleção do usuário');
      return null;
    }

    const data = birdSnapshot.data();
    debugLog('[getPublicBirdById] Pássaro encontrado:', { userId, birdId });

    return {
      id: birdSnapshot.id,
      name: data.name || '',
      species: data.species || '',
      sex: data.sex || '',
      status: data.status || '',
      ringNumber: data.ringNumber || '',
      birthDate: data.birthDate || '',
      colorMutation: data.colorMutation || '',
      classification: data.classification || '',
      location: data.location || '',
      fatherId: data.fatherId || '',
      motherId: data.motherId || '',
      songTrainingStatus: data.songTrainingStatus || '',
      songType: data.songType || '',
      trainingNotes: data.trainingNotes || '',
      photoUrl: data.photoUrl || '',
      manualAncestors: data.manualAncestors || {},
      isPublic: data.isPublic || false,
    } as Bird;
  } catch (error: unknown) {
    console.error('[getPublicBirdById] Erro ao buscar pássaro público:', getErrorMessage(error));
    return null;
  }
};

/**
 * Busca dados públicos de um pássaro por Número de Anilha (sem autenticação necessária)
 * Útil quando o usuário não tem o ID do QR Code em mãos
 */
export const getPublicBirdByRingNumber = async (ringNumber: string): Promise<Bird | null> => {
  try {
    debugLog('[getPublicBirdByRingNumber] Buscando por anilha:', ringNumber);

    if (!ringNumber) return null;

    // Usar Collection Group Query para buscar em todos os subdocumentos 'birds' de todos os usuários
    const birdsQuery = query(
      collectionGroup(db, 'birds'),
      where('ringNumber', '==', ringNumber),
      limit(1)
    );

    const snapshot = await getDocs(birdsQuery);

    if (snapshot.empty) {
      console.warn('[getPublicBirdByRingNumber] Nenhuma ave encontrada com anilha:', ringNumber);
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name || '',
      species: data.species || '',
      sex: data.sex || '',
      status: data.status || '',
      ringNumber: data.ringNumber || '',
      birthDate: data.birthDate || '',
      colorMutation: data.colorMutation || '',
      classification: data.classification || '',
      location: data.location || '',
      fatherId: data.fatherId || '',
      motherId: data.motherId || '',
      songTrainingStatus: data.songTrainingStatus || '',
      songType: data.songType || '',
      trainingNotes: data.trainingNotes || '',
      photoUrl: data.photoUrl || '',
      manualAncestors: data.manualAncestors || {},
      isPublic: data.isPublic || false,
    } as Bird;
  } catch (error: unknown) {
    console.error('[getPublicBirdByRingNumber] Erro ao buscar pássaro por anilha:', getErrorMessage(error));
    return null;
  }
};

/**
 * Busca dados públicos do criador por ID de um de seus pássaros
 */
export const getPublicBreederByBirdId = async (birdId: string): Promise<BreederSettings | null> => {
  try {
    // 1. Buscar no índice público para descobrir o userId
    const indexRef = doc(db, 'bird_index', birdId);
    const indexSnapshot = await getDoc(indexRef);

    if (!indexSnapshot.exists()) {
      console.warn('[getPublicBreederByBirdId] Pássaro não encontrado no índice:', birdId);
      return null;
    }

    const indexData = indexSnapshot.data();
    const userId = indexData.userId;

    if (!userId) {
      console.warn('[getPublicBreederByBirdId] userId não encontrado no índice');
      return null;
    }

    // 2. Buscar as settings do criador
    const settingsRef = doc(db, 'users', userId, 'settings', 'general');
    const settingsSnapshot = await getDoc(settingsRef);

    if (!settingsSnapshot.exists()) {
      console.warn('[getPublicBreederByBirdId] Settings do criador não encontradas');
      return null;
    }

    const data = settingsSnapshot.data();
    return {
      breederName: data.breederName || '',
      cpfCnpj: data.cpfCnpj || '',
      sispassNumber: data.sispassNumber || '',
      sispassDocumentUrl: data.sispassDocumentUrl || '',
      registrationDate: data.registrationDate || '',
      renewalDate: data.renewalDate || '',
      lastRenewalDate: data.lastRenewalDate || '',
      logoUrl: data.logoUrl || '',
      primaryColor: data.primaryColor || '#10B981',
      accentColor: data.accentColor || '#F59E0B',
      plan: data.plan || 'PRO_TESTE',
      trialEndDate: data.trialEndDate || '',
      dashboardLayout: data.dashboardLayout || [],
      certificate: data.certificate || undefined,
      subscriptionEndDate: data.subscriptionEndDate || '',
      subscriptionCancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd || false,
    } as BreederSettings;
  } catch (error: unknown) {
    console.error('[getPublicBreederByBirdId] Erro ao buscar dados do criador:', getErrorMessage(error));
    return null;
  }
};
// ============= ADMIN FUNCTIONS =============

export const checkIfUserIsAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      return userSnapshot.data().isAdmin || false;
    }
    return false;
  } catch (error: unknown) {
    console.error('[checkIfUserIsAdmin] Erro ao verificar status de admin:', getErrorMessage(error));
    return false;
  }
};

export const checkIfUserIsAdminOnly = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userRef);
    if (userSnapshot.exists()) {
      return userSnapshot.data().adminOnly || false;
    }
    return false;
  } catch (error: unknown) {
    console.error('[checkIfUserIsAdminOnly] Erro ao verificar adminOnly:', getErrorMessage(error));
    return false;
  }
};

export const updateUserAdminStatus = async (userId: string, isAdmin: boolean): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isAdmin,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error: unknown) {
    console.error('[updateUserAdminStatus] Erro ao atualizar status:', getErrorMessage(error));
    return false;
  }
};

export const disableUser = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      disabled: true,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error: unknown) {
    console.error('[disableUser] Erro ao desabilitar usuário:', getErrorMessage(error));
    return false;
  }
};

export const enableUser = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      disabled: false,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error: unknown) {
    console.error('[enableUser] Erro ao habilitar usuário:', getErrorMessage(error));
    return false;
  }
};

export const updateUserPlan = async (userId: string, plan: 'Básico' | 'Profissional'): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    
    // Atualizar plano no documento principal
    await updateDoc(userRef, {
      plan,
      updatedAt: Timestamp.now(),
    });
    
    // Atualizar plano nas settings também
    await updateDoc(settingsRef, {
      plan,
      updatedAt: Timestamp.now(),
    });
    
    return true;
  } catch (error: unknown) {
    console.error('[updateUserPlan] Erro ao atualizar plano:', getErrorMessage(error));
    return false;
  }
};
