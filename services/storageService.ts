import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll,
  uploadString
} from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Upload de arquivo para o Firebase Storage
 * @param userId - ID do usuário
 * @param path - Caminho dentro do storage (ex: 'birds/abc123.jpg')
 * @param file - Arquivo a ser enviado
 * @returns URL pública do arquivo ou null em caso de erro
 */
export const uploadFile = async (userId: string, path: string, file: File): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `users/${userId}/${path}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }
};

/**
 * Upload de string base64 para o Firebase Storage
 * @param userId - ID do usuário
 * @param path - Caminho dentro do storage
 * @param base64String - String base64 da imagem
 * @returns URL pública do arquivo ou null em caso de erro
 */
export const uploadBase64 = async (userId: string, path: string, base64String: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `users/${userId}/${path}`);
    const snapshot = await uploadString(storageRef, base64String, 'data_url');
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error('Erro ao fazer upload base64:', error);
    return null;
  }
};

/**
 * Obter URL pública de um arquivo
 * @param userId - ID do usuário
 * @param path - Caminho do arquivo
 * @returns URL pública ou null
 */
export const getFileURL = async (userId: string, path: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, `users/${userId}/${path}`);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Erro ao obter URL:', error);
    return null;
  }
};

/**
 * Deletar arquivo do Firebase Storage
 * @param userId - ID do usuário
 * @param path - Caminho do arquivo
 * @returns true se sucesso, false se erro
 */
export const deleteFile = async (userId: string, path: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, `users/${userId}/${path}`);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    return false;
  }
};

/**
 * Listar todos os arquivos de uma pasta
 * @param userId - ID do usuário
 * @param folderPath - Caminho da pasta
 * @returns Array de URLs ou array vazio
 */
export const listFiles = async (userId: string, folderPath: string): Promise<string[]> => {
  try {
    const folderRef = ref(storage, `users/${userId}/${folderPath}`);
    const result = await listAll(folderRef);
    const urls = await Promise.all(
      result.items.map(itemRef => getDownloadURL(itemRef))
    );
    return urls;
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return [];
  }
};

/**
 * Upload de imagem de pássaro
 * @param userId - ID do usuário
 * @param birdId - ID do pássaro
 * @param file - Arquivo de imagem
 * @returns URL da imagem ou null
 */
export const uploadBirdImage = async (userId: string, birdId: string, file: File): Promise<string | null> => {
  const fileName = `${birdId}_${Date.now()}.${file.name.split('.').pop()}`;
  return uploadFile(userId, `birds/${fileName}`, file);
};

/**
 * Upload de documento
 * @param userId - ID do usuário
 * @param documentType - Tipo do documento (ex: 'certificates', 'invoices')
 * @param file - Arquivo
 * @returns URL do documento ou null
 */
export const uploadDocument = async (userId: string, documentType: string, file: File): Promise<string | null> => {
  const fileName = `${Date.now()}_${file.name}`;
  return uploadFile(userId, `documents/${documentType}/${fileName}`, file);
};
