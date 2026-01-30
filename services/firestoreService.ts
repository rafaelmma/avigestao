import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bird, Pair, Clutch, Medication, MedicationApplication, MovementRecord, Transaction, MaintenanceTask, TournamentEvent, ContinuousTreatment, BreederSettings } from '../types';

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
    const q = query(birdsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bird));
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
    return docRef.id;
  } catch (error) {
    console.error('Erro ao adicionar bird:', error);
    return null;
  }
};

export const updateBird = async (userId: string, birdId: string, updates: Partial<Bird>): Promise<boolean> => {
  try {
    const birdRef = doc(db, 'users', userId, 'birds', birdId);
    await updateDoc(birdRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
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
    const q = query(pairsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
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
    await updateDoc(pairRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
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
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Erro ao salvar settings:', error);
    return false;
  }
};

// ============= MEDICATIONS =============
export const getMedications = async (userId: string): Promise<Medication[]> => {
  try {
    const medsRef = collection(db, 'users', userId, 'medications');
    const q = query(medsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Medication));
  } catch (error) {
    console.error('Erro ao buscar medications:', error);
    return [];
  }
};

// ============= MOVEMENTS =============
export const getMovements = async (userId: string): Promise<MovementRecord[]> => {
  try {
    const movementsRef = collection(db, 'users', userId, 'movements');
    const q = query(movementsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    const movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MovementRecord));
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

// ============= TRANSACTIONS =============
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const q = query(transactionsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Transaction));
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

// ============= TASKS =============
export const getTasks = async (userId: string): Promise<MaintenanceTask[]> => {
  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as MaintenanceTask));
  } catch (error) {
    console.error('Erro ao buscar tasks:', error);
    return [];
  }
};

// ============= TOURNAMENTS =============
export const getTournaments = async (userId: string): Promise<TournamentEvent[]> => {
  try {
    const tournamentsRef = collection(db, 'users', userId, 'tournaments');
    const q = query(tournamentsRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TournamentEvent));
  } catch (error) {
    console.error('Erro ao buscar tournaments:', error);
    return [];
  }
};

// ============= APPLICATIONS =============
export const getApplications = async (userId: string): Promise<MedicationApplication[]> => {
  try {
    const appRef = collection(db, 'users', userId, 'applications');
    const q = query(appRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
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
    const q = query(clutchRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
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
    const q = query(treatRef, where('deleted', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ContinuousTreatment));
  } catch (error) {
    console.error('Erro ao buscar treatments:', error);
    return [];
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
