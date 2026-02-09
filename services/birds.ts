import { getAuth } from 'firebase/auth';
import * as firestoreService from './firestoreService';
import { Bird } from '../types';

export async function getBirds(userId: string): Promise<Bird[]> {
  return await firestoreService.getBirds(userId);
}

export async function addBird(userId: string, bird: Omit<Bird, 'id'>): Promise<string | null> {
  return await firestoreService.addBird(userId, bird as Omit<Bird, 'id'>);
}

const getUserId = () => {
  const user = getAuth().currentUser;
  return user?.uid || null;
};

export async function deleteBird(id: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;
  return await firestoreService.deleteBird(userId, id);
}

export async function permanentlyDeleteBird(id: string): Promise<boolean> {
  const userId = getUserId();
  if (!userId) return false;
  return await firestoreService.permanentlyDeleteBirdInFirestore(userId, id);
}
