import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { BrazilianRegion } from './brazilianRegions';

export interface LibraryUserSettings {
  userId: string;
  region: BrazilianRegion;
  state?: string;
  savedArticles: string[]; // Array de IDs de artigos salvos
  pedigrees: PedigreeData[];
  seasonalTasks: SeasonalTaskData[];
  updatedAt: Timestamp;
}

export interface PedigreeData {
  id: string;
  createdAt: Timestamp;
  ancestors: {
    paternal_grandfather?: string;
    paternal_grandmother?: string;
    maternal_grandfather?: string;
    maternal_grandmother?: string;
  };
}

// Nova interface para pedigrees do gerador
export interface PedigreeNodeData {
  id: string;
  name: string;
  gender: 'M' | 'F';
  year: number;
  color?: string;
  parent1?: string;
  parent2?: string;
}

export interface BirdPedigreeData {
  birdId: string;
  ancestors: PedigreeNodeData[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SeasonalTaskData {
  id: string;
  month: string;
  taskIndex: number; // Índice da tarefa no mês
  completed: boolean;
  completedAt?: Timestamp;
}

// Salvar ou atualizar preferências do usuário
export async function saveLibraryUserSettings(
  userId: string,
  region: BrazilianRegion,
  state?: string
): Promise<void> {
  try {
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    const now = Timestamp.now();

    await setDoc(
      userLibraryRef,
      {
        region,
        state,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Erro ao salvar configurações da biblioteca:', error);
    throw error;
  }
}

// Obter preferências do usuário
export async function getLibraryUserSettings(userId: string): Promise<LibraryUserSettings | null> {
  try {
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    const docSnap = await getDoc(userLibraryRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      userId,
      region: data.region || 'Sudeste',
      state: data.state,
      savedArticles: data.savedArticles || [],
      pedigrees: data.pedigrees || [],
      seasonalTasks: data.seasonalTasks || [],
      updatedAt: data.updatedAt || Timestamp.now(),
    };
  } catch (error) {
    console.error('Erro ao obter configurações da biblioteca:', error);
    return null;
  }
}

// Salvar artigo
export async function saveArticle(userId: string, articleId: string): Promise<void> {
  try {
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    await updateDoc(userLibraryRef, {
      savedArticles: arrayUnion(articleId),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao salvar artigo:', error);
    throw error;
  }
}

// Remover artigo salvo
export async function removeArticle(userId: string, articleId: string): Promise<void> {
  try {
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    await updateDoc(userLibraryRef, {
      savedArticles: arrayRemove(articleId),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao remover artigo:', error);
    throw error;
  }
}

// Salvar tarefa do calendário
export async function saveSeasonalTask(
  userId: string,
  month: string,
  taskIndex: number,
  completed: boolean
): Promise<void> {
  try {
    const settings = await getLibraryUserSettings(userId);
    const taskId = `${month}-${taskIndex}`;

    // Remover tarefa anterior se existir
    if (settings?.seasonalTasks) {
      const existingTask = settings.seasonalTasks.find(t => t.id === taskId);
      if (existingTask) {
        const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
        await updateDoc(userLibraryRef, {
          seasonalTasks: arrayRemove(existingTask),
        });
      }
    }

    // Adicionar nova tarefa
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    const taskData: SeasonalTaskData = {
      id: taskId,
      month,
      taskIndex,
      completed,
      completedAt: completed ? Timestamp.now() : undefined,
    };

    await updateDoc(userLibraryRef, {
      seasonalTasks: arrayUnion(taskData),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    throw error;
  }
}

// Obter tarefas do calendário
export async function getSeasonalTasks(
  userId: string,
  month: string
): Promise<SeasonalTaskData[]> {
  try {
    const settings = await getLibraryUserSettings(userId);
    if (!settings) return [];

    return settings.seasonalTasks.filter(task => task.month === month);
  } catch (error) {
    console.error('Erro ao obter tarefas:', error);
    return [];
  }
}

// Inicializar configurações de biblioteca para novo usuário
export async function initializeLibraryForUser(
  userId: string,
  region: BrazilianRegion = 'Sudeste'
): Promise<void> {
  try {
    const userLibraryRef = doc(db, 'users', userId, 'library', 'settings');
    const now = Timestamp.now();

    await setDoc(userLibraryRef, {
      region,
      savedArticles: [],
      pedigrees: [],
      seasonalTasks: [],
      updatedAt: now,
    });
  } catch (error) {
    console.error('Erro ao inicializar biblioteca:', error);
    throw error;
  }
}

// ===== NOVO: Funções para Gerador de Pedigree (salva pedigree por bird ID) =====

// Salvar pedigree do gerador (por bird ID)
export async function savePedigree(
  userId: string,
  birdId: string,
  ancestors: PedigreeNodeData[]
): Promise<void> {
  try {
    const pedigreeRef = doc(db, 'users', userId, 'library', `pedigree_${birdId}`);
    const now = Timestamp.now();

    await setDoc(pedigreeRef, {
      birdId,
      ancestors,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error('Erro ao salvar pedigree:', error);
    throw error;
  }
}

// Obter pedigree do gerador (por bird ID)
export async function getPedigreeData(
  userId: string,
  birdId: string
): Promise<BirdPedigreeData | null> {
  try {
    const pedigreeRef = doc(db, 'users', userId, 'library', `pedigree_${birdId}`);
    const docSnap = await getDoc(pedigreeRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      birdId,
      ancestors: data.ancestors || [],
      createdAt: data.createdAt || Timestamp.now(),
      updatedAt: data.updatedAt || Timestamp.now(),
    };
  } catch (error) {
    console.error('Erro ao obter pedigree:', error);
    return null;
  }
}

// Deletar pedigree do gerador (por bird ID)
export async function deleteBirdPedigree(userId: string, birdId: string): Promise<void> {
  try {
    const pedigreeRef = doc(db, 'users', userId, 'library', `pedigree_${birdId}`);
    // Usar uma atualização que define como null em vez de deletar o documento
    await setDoc(pedigreeRef, {
      birdId,
      ancestors: [],
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Erro ao deletar pedigree:', error);
    throw error;
  }
}
