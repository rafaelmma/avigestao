import { 
  collection, 
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
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bird, Pair, Clutch, Medication, MedicationApplication, MovementRecord, Transaction, MaintenanceTask, TournamentEvent, ContinuousTreatment, BreederSettings, MedicationCatalogItem } from '../types';
import { DEFAULT_MEDICATION_CATALOG } from '../constants/medicationCatalog';

// Helper para processar campos undefined como deleteField (Firestore não aceita undefined)
const cleanUndefined = (obj: any) => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      result[key] = deleteField(); // Deleta o campo no Firestore
    } else {
      result[key] = value;
    }
  }
  return result;
};

// Helper para remover campos undefined (sem usar deleteField)
const removeUndefined = (obj: any) => {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
};

// Helper para converter Timestamp do Firestore para string ISO
const timestampToISO = (timestamp: any): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

// ============= BIRDS =============
export const getBirds = async (userId: string): Promise<Bird[]> => {
  try {
    const birdsRef = collection(db, 'users', userId, 'birds');
    // Não filtrar por deletedAt aqui, deixar para a aplicação decidir
    const snapshot = await getDocs(birdsRef);
    const birds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bird));
    console.log('getBirds retornando:', birds);
    return birds;
  } catch (error) {
    console.error('Erro ao buscar birds:', error);
    return [];
  }
};

export const addBird = async (userId: string, bird: Omit<Bird, 'id'>): Promise<string | null> => {
  try {
    const birdsRef = collection(db, 'users', userId, 'birds');
    const docRef = await addDoc(birdsRef, {
      ...bird,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // Criar índice público para permitir busca via QR code
    const indexRef = doc(db, 'bird_index', docRef.id);
    await setDoc(indexRef, {
      userId,
      birdId: docRef.id,
      createdAt: Timestamp.now()
    });
    
    console.log('[addBird] Índice público criado para:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar bird:', error);
    return null;
  }
};

export const updateBird = async (userId: string, birdId: string, updates: Partial<Bird>): Promise<boolean> => {
  try {
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(birdRef, cleanedUpdates);
    
    // Garantir que o índice público existe (para pássaros antigos)
    const indexRef = doc(db, 'bird_index', birdId);
    const indexSnapshot = await getDoc(indexRef);
    
    if (!indexSnapshot.exists()) {
      await setDoc(indexRef, {
        userId,
        birdId,
        createdAt: Timestamp.now()
      });
      console.log('[updateBird] Índice público criado para pássaro existente:', birdId);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar bird:', error);
    return false;
  }
};

export const deleteBird = async (userId: string, birdId: string): Promise<boolean> => {
  try {
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    await updateDoc(birdRef, {
      deleted: true,
      deletedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Erro ao deletar bird:', error);
    return false;
  }
};

// ============= PAIRS =============
export const getPairs = async (userId: string): Promise<Pair[]> => {
  try {
    const pairsRef = collection(db, 'users', userId, 'pairs');
    const snapshot = await getDocs(pairsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Pair));
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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar pair:', error);
    return null;
  }
};

export const updatePair = async (userId: string, pairId: string, updates: Partial<Pair>): Promise<boolean> => {
  try {
    const pairRef = doc(db, 'users', userId, 'pairs', pairId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(pairRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar pair:', error);
    return false;
  }
};

export const deletePair = async (userId: string, pairId: string): Promise<boolean> => {
  try {
    const pairRef = doc(db, 'users', userId, 'pairs', pairId);
    await updateDoc(pairRef, {
      deleted: true,
      deletedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Erro ao deletar pair:', error);
    return false;
  }
};

// ============= SETTINGS =============
export const getSettings = async (userId: string): Promise<BreederSettings | null> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snapshot = await getDoc(settingsRef);
    if (snapshot.exists()) {
      return snapshot.data() as BreederSettings;
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar settings:', error);
    return null;
  }
};

export const saveSettings = async (userId: string, settings: BreederSettings): Promise<boolean> => {
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
    const cleanedUpdates = cleanUndefined({
      ...settings,
      updatedAt: Timestamp.now()
    });
    await updateDoc(settingsRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao salvar settings:', error);
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
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MedicationCatalogItem));
    }
    
    // Se não existir, retornar catálogo padrão
    console.log('[getMedicationCatalog] Usando catálogo padrão');
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
    const medications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id  // Document ID do Firestore tem prioridade
      } as Medication;
    });
    return medications;
  } catch (error) {
    console.error('Erro ao buscar medications:', error);
    return [];
  }
};

export const addMedicationInFirestore = async (userId: string, medication: Medication): Promise<string | null> => {
  try {
    const medId = medication.id;
    if (!medId) {
      console.error('[addMedicationInFirestore] Medicamento sem ID!', medication);
      return null;
    }
    
    console.log('[addMedicationInFirestore] Salvando medicamento com ID:', medId);
    
    const medRef = doc(db, 'users', userId, 'medications', medId);
    const medData = removeUndefined({
      ...medication,
      id: medId,  // Garante que o ID dentro do documento bata com o doc.id
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(medRef, medData);
    
    console.log('[addMedicationInFirestore] Medicamento salvo com sucesso! ID:', medId);
    return medId;
  } catch (error) {
    console.error('Erro ao adicionar medicamento:', error);
    return null;
  }
};

export const updateMedicationInFirestore = async (userId: string, medId: string, updates: Partial<Medication>): Promise<boolean> => {
  try {
    const medRef = doc(db, 'users', userId, 'medications', medId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: medId,  // Garante que o ID está sempre atualizado
      updatedAt: Timestamp.now()
    });
    
    // Usar setDoc com merge: true para fazer upsert (create if not exists)
    await setDoc(medRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar medicamento:', error);
    return false;
  }
};

export const deleteMedicationInFirestore = async (userId: string, medication: Medication): Promise<boolean> => {
  try {
    console.log('[deleteMedicationInFirestore] Soft delete do medicamento:', medication.id);
    const medRef = doc(db, 'users', userId, 'medications', medication.id);
    
    const { deleted, ...medWithoutDeleted } = medication as any;
    
    const updatedMed = removeUndefined({
      ...medWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(medRef, updatedMed, { merge: true });
    console.log('[deleteMedicationInFirestore] Sucesso! Medicamento marcado como deletado');
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar medicamento:', error);
    return false;
  }
};

export const permanentlyDeleteMedicationInFirestore = async (userId: string, medId: string): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteMedicationInFirestore] Deletando permanentemente:', medId);
    
    const medRef = doc(db, 'users', userId, 'medications', medId);
    
    const beforeSnapshot = await getDoc(medRef);
    console.log('[permanentlyDeleteMedicationInFirestore] Documento existe ANTES?', beforeSnapshot.exists());
    
    await deleteDoc(medRef);
    console.log('[permanentlyDeleteMedicationInFirestore] deleteDoc executado!');
    
    const afterSnapshot = await getDoc(medRef);
    console.log('[permanentlyDeleteMedicationInFirestore] Documento existe DEPOIS?', afterSnapshot.exists());
    
    return true;
  } catch (error: any) {
    console.error('[permanentlyDeleteMedicationInFirestore] ERRO:', error);
    return false;
  }
};

// ============= MOVEMENTS =============
export const getMovements = async (userId: string): Promise<MovementRecord[]> => {
  try {
    const movementsRef = collection(db, 'users', userId, 'movements');
    const snapshot = await getDocs(movementsRef);
    
    console.log('[getMovements] Total de docs no snapshot:', snapshot.docs.length);
    console.log('[getMovements] IDs dos movimentos:', snapshot.docs.map(d => d.id));
    
    const movements = snapshot.docs.map(doc => {
      const data = doc.data();
      // SEMPRE usar o document ID do Firestore como ID principal
      // Ignorar o campo "id" interno do documento para evitar conflitos
      return {
        ...data,
        id: doc.id  // Document ID do Firestore tem prioridade
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

export const addMovementInFirestore = async (userId: string, movement: MovementRecord): Promise<string | null> => {
  try {
    // Usar o ID do movimento como document ID no Firestore
    // Se não tiver ID, gerar um novo UUID
    const movementId = movement.id;
    if (!movementId) {
      console.error('[addMovementInFirestore] Movimento sem ID!', movement);
      return null;
    }
    
    console.log('[addMovementInFirestore] Salvando movimento com ID:', movementId);
    
    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    await setDoc(movementRef, {
      ...movement,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    console.log('[addMovementInFirestore] Movimento salvo com sucesso! ID:', movementId);
    return movementId;
  } catch (error) {
    console.error('Erro ao adicionar movement:', error);
    return null;
  }
};

export const updateMovementInFirestore = async (userId: string, movementId: string, updates: Partial<MovementRecord>): Promise<boolean> => {
  try {
    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(movementRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar movement:', error);
    return false;
  }
};

export const deleteMovementInFirestore = async (userId: string, movement: MovementRecord): Promise<boolean> => {
  try {
    console.log('[deleteMovementInFirestore] Deletando movimento:', movement.id);
    const movementRef = doc(db, 'users', userId, 'movements', movement.id);
    
    // Criar cópia do movimento sem o campo "deleted" antigo (se existir)
    const { deleted, ...movementWithoutDeleted } = movement as any;
    
    // Mesclar o movimento completo com deletedAt
    const updatedMovement = {
      ...movementWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    console.log('[deleteMovementInFirestore] updatedMovement:', updatedMovement);
    console.log('[deleteMovementInFirestore] Campo "deleted" removido?', deleted !== undefined ? 'sim' : 'não');
    console.log('[deleteMovementInFirestore] deletedAt é Timestamp?', updatedMovement.deletedAt instanceof Timestamp);
    
    // Usar setDoc com merge para fazer upsert - garante que todos os campos são salvos
    await setDoc(movementRef, updatedMovement, { merge: true });
    console.log('[deleteMovementInFirestore] Sucesso! Movimento marcado como deletado no Firestore');
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar movement:', error);
    return false;
  }
};

export const permanentlyDeleteMovementInFirestore = async (userId: string, movementId: string): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteMovementInFirestore] Iniciando...');
    console.log('[permanentlyDeleteMovementInFirestore] userId:', userId);
    console.log('[permanentlyDeleteMovementInFirestore] movementId:', movementId);
    
    const movementRef = doc(db, 'users', userId, 'movements', movementId);
    console.log('[permanentlyDeleteMovementInFirestore] movementRef path:', movementRef.path);
    
    // Verificar se o documento existe ANTES do delete
    const beforeSnapshot = await getDoc(movementRef);
    console.log('[permanentlyDeleteMovementInFirestore] Documento existe ANTES do delete?', beforeSnapshot.exists());
    if (beforeSnapshot.exists()) {
      console.log('[permanentlyDeleteMovementInFirestore] Dados do doc ANTES:', beforeSnapshot.data());
    }
    
    await deleteDoc(movementRef);
    console.log('[permanentlyDeleteMovementInFirestore] deleteDoc executado!');
    
    // Verificar se o documento existe DEPOIS do delete
    const afterSnapshot = await getDoc(movementRef);
    console.log('[permanentlyDeleteMovementInFirestore] Documento existe DEPOIS do delete?', afterSnapshot.exists());
    if (afterSnapshot.exists()) {
      console.error('[permanentlyDeleteMovementInFirestore] ERRO! Documento ainda existe após delete:', afterSnapshot.data());
    }
    
    console.log('[permanentlyDeleteMovementInFirestore] deleteDoc executado com sucesso!');
    
    return true;
  } catch (error: any) {
    console.error('[permanentlyDeleteMovementInFirestore] ERRO capturado:', error);
    console.error('[permanentlyDeleteMovementInFirestore] Error code:', error?.code);
    console.error('[permanentlyDeleteMovementInFirestore] Error message:', error?.message);
    
    // Se o doc não existe, apenas ignorar o erro
    if (error?.code === 'not-found') {
      console.warn('[permanentlyDeleteMovementInFirestore] Movimento não encontrado (já deletado)');
      return true; // Sucesso porque já não existe
    }
    console.error('[permanentlyDeleteMovementInFirestore] Erro real ao deletar:', error);
    return false;
  }
};

// ============= TRANSACTIONS =============
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const snapshot = await getDocs(transactionsRef);
    const transactions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction))
      .filter(tx => !tx.deletedAt); // Filtrar apenas transações ativas
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
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction))
      .filter(tx => tx.deletedAt); // Filtrar apenas transações deletadas
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

export const saveTransactionToFirestore = async (userId: string, transaction: Transaction): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(transactionRef, {
      ...transaction,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return true;
  } catch (error: any) {
    console.error('Erro ao salvar transação:', error);
    return false;
  }
};

export const deleteTransactionInFirestore = async (userId: string, transaction: Transaction): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(transactionRef, {
      ...transaction,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }, { merge: true });
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar transação:', error);
    return false;
  }
};

export const permanentlyDeleteTransactionInFirestore = async (userId: string, transactionId: string): Promise<boolean> => {
  try {
    const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(transactionRef);
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar permanentemente transação:', error);
    return false;
  }
};

// ============= TASKS =============
export const getTasks = async (userId: string): Promise<MaintenanceTask[]> => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const snapshot = await getDocs(tasksRef);
    const tasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id  // Document ID do Firestore tem prioridade
      } as MaintenanceTask;
    });
    return tasks;
  } catch (error) {
    console.error('Erro ao buscar tasks:', error);
    return [];
  }
};

export const addTaskInFirestore = async (userId: string, task: MaintenanceTask): Promise<string | null> => {
  try {
    // Usar o ID da tarefa como document ID no Firestore
    const taskId = task.id;
    if (!taskId) {
      console.error('[addTaskInFirestore] Tarefa sem ID!', task);
      return null;
    }
    
    console.log('[addTaskInFirestore] Salvando tarefa com ID:', taskId);
    
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskData = removeUndefined({
      ...task,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(taskRef, taskData);
    
    console.log('[addTaskInFirestore] Tarefa salva com sucesso! ID:', taskId);
    return taskId;
  } catch (error) {
    console.error('Erro ao adicionar tarefa:', error);
    return null;
  }
};

export const updateTaskInFirestore = async (userId: string, taskId: string, updates: Partial<MaintenanceTask>): Promise<boolean> => {
  try {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(taskRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return false;
  }
};

export const deleteTaskInFirestore = async (userId: string, task: MaintenanceTask): Promise<boolean> => {
  try {
    console.log('[deleteTaskInFirestore] Soft delete da tarefa:', task.id);
    const taskRef = doc(db, 'users', userId, 'tasks', task.id);
    
    // Remover campo "deleted" antigo se existir e remover undefined
    const { deleted, ...taskWithoutDeleted } = task as any;
    
    const updatedTask = removeUndefined({
      ...taskWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(taskRef, updatedTask, { merge: true });
    console.log('[deleteTaskInFirestore] Sucesso! Tarefa marcada como deletada');
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar tarefa:', error);
    return false;
  }
};

export const permanentlyDeleteTaskInFirestore = async (userId: string, taskId: string): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteTaskInFirestore] Deletando permanentemente:', taskId);
    
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    
    // Verificar se existe ANTES do delete
    const beforeSnapshot = await getDoc(taskRef);
    console.log('[permanentlyDeleteTaskInFirestore] Documento existe ANTES?', beforeSnapshot.exists());
    
    await deleteDoc(taskRef);
    console.log('[permanentlyDeleteTaskInFirestore] deleteDoc executado!');
    
    // Verificar se existe DEPOIS do delete
    const afterSnapshot = await getDoc(taskRef);
    console.log('[permanentlyDeleteTaskInFirestore] Documento existe DEPOIS?', afterSnapshot.exists());
    
    return true;
  } catch (error: any) {
    console.error('[permanentlyDeleteTaskInFirestore] ERRO:', error);
    return false;
  }
};

// ============= TOURNAMENTS =============
export const getTournaments = async (userId: string): Promise<TournamentEvent[]> => {
  try {
    const tournamentsRef = collection(db, 'users', userId, 'tournaments');
    const snapshot = await getDocs(tournamentsRef);
    const tournaments = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id  // Document ID do Firestore tem prioridade
        } as TournamentEvent;
      })
      .filter(tournament => !tournament.deletedAt); // Filtrar apenas eventos ativos
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
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        } as TournamentEvent;
      })
      .filter(tournament => tournament.deletedAt); // Filtrar apenas eventos deletados
    return deletedTournaments;
  } catch (error) {
    console.error('Erro ao buscar tournaments deletados:', error);
    return [];
  }
};

export const addEventInFirestore = async (userId: string, event: TournamentEvent): Promise<string | null> => {
  try {
    const eventId = event.id;
    if (!eventId) {
      console.error('[addEventInFirestore] Evento sem ID!', event);
      return null;
    }
    
    console.log('[addEventInFirestore] Salvando evento com ID:', eventId);
    
    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);
    const eventData = removeUndefined({
      ...event,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(eventRef, eventData);
    
    console.log('[addEventInFirestore] Evento salvo com sucesso! ID:', eventId);
    return eventId;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    return null;
  }
};

export const updateEventInFirestore = async (userId: string, eventId: string, updates: Partial<TournamentEvent>): Promise<boolean> => {
  try {
    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(eventRef, cleanedUpdates);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    return false;
  }
};

export const deleteEventInFirestore = async (userId: string, event: TournamentEvent): Promise<boolean> => {
  try {
    console.log('[deleteEventInFirestore] Soft delete do evento:', event.id);
    const eventRef = doc(db, 'users', userId, 'tournaments', event.id);
    
    const { deleted, ...eventWithoutDeleted } = event as any;
    
    const updatedEvent = removeUndefined({
      ...eventWithoutDeleted,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(eventRef, updatedEvent, { merge: true });
    console.log('[deleteEventInFirestore] Sucesso! Evento marcado como deletado');
    return true;
  } catch (error: any) {
    console.error('Erro ao deletar evento:', error);
    return false;
  }
};

export const permanentlyDeleteEventInFirestore = async (userId: string, eventId: string): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteEventInFirestore] Deletando permanentemente:', eventId);
    
    const eventRef = doc(db, 'users', userId, 'tournaments', eventId);
    
    const beforeSnapshot = await getDoc(eventRef);
    console.log('[permanentlyDeleteEventInFirestore] Documento existe ANTES?', beforeSnapshot.exists());
    
    await deleteDoc(eventRef);
    console.log('[permanentlyDeleteEventInFirestore] deleteDoc executado!');
    
    const afterSnapshot = await getDoc(eventRef);
    console.log('[permanentlyDeleteEventInFirestore] Documento existe DEPOIS?', afterSnapshot.exists());
    
    return true;
  } catch (error: any) {
    console.error('[permanentlyDeleteEventInFirestore] ERRO:', error);
    return false;
  }
};

// ============= APPLICATIONS =============
export const getApplications = async (userId: string): Promise<MedicationApplication[]> => {
  try {
    const appRef = collection(db, 'users', userId, 'applications');
    const snapshot = await getDocs(appRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MedicationApplication));
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Clutch));
  } catch (error) {
    console.error('Erro ao buscar clutches:', error);
    return [];
  }
};

// ============= TREATMENTS =============
export const getTreatments = async (userId: string): Promise<ContinuousTreatment[]> => {
  try {
    const treatRef = collection(db, 'users', userId, 'treatments');
    const snapshot = await getDocs(treatRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContinuousTreatment));
  } catch (error) {
    console.error('Erro ao buscar treatments:', error);
    return [];
  }
};

export const addTreatmentInFirestore = async (userId: string, treatment: ContinuousTreatment): Promise<string | null> => {
  try {
    const treatmentId = treatment.id;
    if (!treatmentId) {
      console.error('[addTreatmentInFirestore] Tratamento sem ID!', treatment);
      return null;
    }
    
    console.log('[addTreatmentInFirestore] Salvando tratamento com ID:', treatmentId);
    
    const treatRef = doc(db, 'users', userId, 'treatments', treatmentId);
    const treatData = removeUndefined({
      ...treatment,
      id: treatmentId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(treatRef, treatData);
    
    console.log('[addTreatmentInFirestore] Tratamento salvo com sucesso! ID:', treatmentId);
    return treatmentId;
  } catch (error) {
    console.error('Erro ao adicionar tratamento:', error);
    return null;
  }
};

export const updateTreatmentInFirestore = async (userId: string, treatmentId: string, updates: Partial<ContinuousTreatment>): Promise<boolean> => {
  try {
    const treatRef = doc(db, 'users', userId, 'treatments', treatmentId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: treatmentId,
      updatedAt: Timestamp.now()
    });
    
    // Usar setDoc com merge: true para fazer upsert
    await setDoc(treatRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar tratamento:', error);
    return false;
  }
};

export const deleteTreatmentInFirestore = async (userId: string, treatment: ContinuousTreatment): Promise<boolean> => {
  try {
    console.log('[deleteTreatmentInFirestore] Soft delete do tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);
    
    const updatedTreat = removeUndefined({
      ...treatment,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(treatRef, updatedTreat, { merge: true });
    console.log('[deleteTreatmentInFirestore] Sucesso! Tratamento marcado como deletado');
    return true;
  } catch (error) {
    console.error('Erro ao deletar tratamento:', error);
    return false;
  }
};

export const restoreTreatmentInFirestore = async (userId: string, treatment: ContinuousTreatment): Promise<boolean> => {
  try {
    console.log('[restoreTreatmentInFirestore] Restaurando tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);
    
    const { deletedAt, ...treatmentWithoutDeletedAt } = treatment as any;
    
    const updatedTreat = removeUndefined({
      ...treatmentWithoutDeletedAt,
      updatedAt: Timestamp.now()
    });
    
    await setDoc(treatRef, updatedTreat, { merge: true });
    console.log('[restoreTreatmentInFirestore] Sucesso! Tratamento restaurado');
    return true;
  } catch (error) {
    console.error('Erro ao restaurar tratamento:', error);
    return false;
  }
};

export const permanentlyDeleteTreatmentInFirestore = async (userId: string, treatment: ContinuousTreatment): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteTreatmentInFirestore] Hard delete do tratamento:', treatment.id);
    const treatRef = doc(db, 'users', userId, 'treatments', treatment.id);
    
    // Verificar se existe
    const docSnap = await getDoc(treatRef);
    if (!docSnap.exists()) {
      console.warn('[permanentlyDeleteTreatmentInFirestore] Tratamento não encontrado:', treatment.id);
      return true;
    }
    
    await deleteDoc(treatRef);
    console.log('[permanentlyDeleteTreatmentInFirestore] Sucesso! Tratamento deletado permanentemente');
    return true;
  } catch (error) {
    console.error('Erro ao deletar permanentemente tratamento:', error);
    return false;
  }
};

// ============= APPLICATIONS =============
export const addApplicationInFirestore = async (userId: string, app: MedicationApplication): Promise<string | null> => {
  try {
    const appId = app.id;
    if (!appId) {
      console.error('[addApplicationInFirestore] Aplicação sem ID!', app);
      return null;
    }
    
    console.log('[addApplicationInFirestore] Salvando aplicação com ID:', appId);
    
    const appRef = doc(db, 'users', userId, 'applications', appId);
    const appData = removeUndefined({
      ...app,
      id: appId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(appRef, appData);
    
    console.log('[addApplicationInFirestore] Aplicação salva com sucesso! ID:', appId);
    return appId;
  } catch (error) {
    console.error('Erro ao adicionar aplicação:', error);
    return null;
  }
};

export const updateApplicationInFirestore = async (userId: string, appId: string, updates: Partial<MedicationApplication>): Promise<boolean> => {
  try {
    const appRef = doc(db, 'users', userId, 'applications', appId);
    const cleanedUpdates = cleanUndefined({
      ...updates,
      id: appId,
      updatedAt: Timestamp.now()
    });
    
    // Usar setDoc com merge: true para fazer upsert
    await setDoc(appRef, cleanedUpdates, { merge: true });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar aplicação:', error);
    return false;
  }
};

export const deleteApplicationInFirestore = async (userId: string, app: MedicationApplication): Promise<boolean> => {
  try {
    console.log('[deleteApplicationInFirestore] Soft delete da aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);
    
    const updatedApp = removeUndefined({
      ...app,
      deletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    await setDoc(appRef, updatedApp, { merge: true });
    console.log('[deleteApplicationInFirestore] Sucesso! Aplicação marcada como deletada');
    return true;
  } catch (error) {
    console.error('Erro ao deletar aplicação:', error);
    return false;
  }
};

export const restoreApplicationInFirestore = async (userId: string, app: MedicationApplication): Promise<boolean> => {
  try {
    console.log('[restoreApplicationInFirestore] Restaurando aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);
    
    const { deletedAt, ...appWithoutDeletedAt } = app as any;
    
    const updatedApp = removeUndefined({
      ...appWithoutDeletedAt,
      updatedAt: Timestamp.now()
    });
    
    await setDoc(appRef, updatedApp, { merge: true });
    console.log('[restoreApplicationInFirestore] Sucesso! Aplicação restaurada');
    return true;
  } catch (error) {
    console.error('Erro ao restaurar aplicação:', error);
    return false;
  }
};

export const permanentlyDeleteApplicationInFirestore = async (userId: string, app: MedicationApplication): Promise<boolean> => {
  try {
    console.log('[permanentlyDeleteApplicationInFirestore] Hard delete da aplicação:', app.id);
    const appRef = doc(db, 'users', userId, 'applications', app.id);
    
    // Verificar se existe
    const docSnap = await getDoc(appRef);
    if (!docSnap.exists()) {
      console.warn('[permanentlyDeleteApplicationInFirestore] Aplicação não encontrada:', app.id);
      return true; // Já foi deletada ou nunca existiu
    }
    
    await deleteDoc(appRef);
    console.log('[permanentlyDeleteApplicationInFirestore] Sucesso! Aplicação deletada permanentemente');
    return true;
  } catch (error) {
    console.error('Erro ao deletar permanentemente aplicação:', error);
    return false;
  }
};

// ============= BATCH OPERATIONS =============
export const batchDelete = async (userId: string, collection: string, ids: string[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, 'users', userId, collection, id);
      batch.update(docRef, {
        deleted: true,
        deletedAt: Timestamp.now()
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
    let locationData: any = {
      city: 'Desconhecida',
      region: 'Desconhecida',
      country: 'Desconhecida',
      latitude: null,
      longitude: null,
      isp: 'Desconhecido'
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
          isp: geoData.org || 'Desconhecido'
        };
        console.log('[recordBirdVerification] Localização capturada:', locationData);
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
      ipHash: btoa(new Date().getTime().toString()).substring(0, 16)
    });
    
    console.log('[recordBirdVerification] Verificação registrada para pássaro:', birdId);
    return true;
  } catch (error: any) {
    console.error('[recordBirdVerification] Erro ao registrar verificação:', error);
    return false;
  }
};

export const getBirdVerifications = async (birdId: string): Promise<BirdVerificationRecord[]> => {
  try {
    const verificationsRef = collection(db, 'bird_verifications');
    const q = query(verificationsRef, where('birdId', '==', birdId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BirdVerificationRecord));
  } catch (error: any) {
    console.error('[getBirdVerifications] Erro ao buscar verificações:', error);
    return [];
  }
};

export const getAllBirdVerifications = async (): Promise<BirdVerificationRecord[]> => {
  try {
    const verificationsRef = collection(db, 'bird_verifications');
    const q = query(verificationsRef, orderBy('timestamp', 'desc'), limit(1000));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BirdVerificationRecord));
  } catch (error: any) {
    console.error('[getAllBirdVerifications] Erro ao buscar todas as verificações:', error);
    return [];
  }
};

/**
 * Busca dados públicos de um pássaro por ID (sem autenticação necessária)
 * Função pública para verificação via QR code
 */
export const getPublicBirdById = async (birdId: string): Promise<Bird | null> => {
  try {
    console.log('[getPublicBirdById] Buscando pássaro:', birdId);
    
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
    
    console.log('[getPublicBirdById] Encontrado userId no índice:', userId);
    
    // 2. Buscar o pássaro na coleção do usuário
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    const birdSnapshot = await getDoc(birdRef);
    
    if (!birdSnapshot.exists()) {
      console.warn('[getPublicBirdById] Pássaro não encontrado na coleção do usuário');
      return null;
    }
    
    const data = birdSnapshot.data();
    console.log('[getPublicBirdById] Pássaro encontrado:', { userId, birdId });
    
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
      manualAncestors: data.manualAncestors || {}
    } as Bird;
  } catch (error: any) {
    console.error('[getPublicBirdById] Erro ao buscar pássaro público:', error);
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
      subscriptionCancelAtPeriodEnd: data.subscriptionCancelAtPeriodEnd || false
    } as BreederSettings;
  } catch (error: any) {
    console.error('[getPublicBreederByBirdId] Erro ao buscar dados do criador:', error);
    return null;
  }
};