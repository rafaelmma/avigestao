// Persistência: delega operações para `services/firestoreService.ts`.
import {
  addBird,
  updateBird,
  deleteBird,
  addPair,
  updatePair,
  deletePair,
  addMedicationInFirestore,
  updateMedicationInFirestore,
  deleteMedicationInFirestore,
  addMovementInFirestore,
  updateMovementInFirestore,
  deleteMovementInFirestore,
  saveTransactionToFirestore,
  saveSettings,
} from './firestoreService';
import {
  Bird,
  Pair,
  Medication,
  MovementRecord,
  Transaction,
  BreederSettings,
} from '../types';

export async function persistRecord(
  table: string,
  data: Record<string, unknown>,
  userId: string,
  operation: 'insert' | 'update' | 'delete' = 'insert',
) {
  try {
    switch (table) {
      case 'birds': {
        if (operation === 'insert') {
          // Firestore `addBird` will generate an ID
          await addBird(userId, data as unknown as Omit<Bird, 'id'>);
          return true;
        }
        if (operation === 'update') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await updateBird(userId, id, data as unknown as Partial<Bird>);
          return true;
        }
        if (operation === 'delete') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await deleteBird(userId, id);
          return true;
        }
        break;
      }
      case 'pairs': {
        if (operation === 'insert') {
          await addPair(userId, data as unknown as Omit<Pair, 'id'>);
          return true;
        }
        if (operation === 'update') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await updatePair(userId, id, data as unknown as Partial<Pair>);
          return true;
        }
        if (operation === 'delete') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await deletePair(userId, id);
          return true;
        }
        break;
      }
      case 'medications': {
        if (operation === 'insert') {
          // medication object should contain an `id` property
          await addMedicationInFirestore(userId, data as unknown as Medication);
          return true;
        }
        if (operation === 'update') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await updateMedicationInFirestore(userId, id, data as unknown as Partial<Medication>);
          return true;
        }
        if (operation === 'delete') {
          await deleteMedicationInFirestore(userId, data as unknown as Medication);
          return true;
        }
        break;
      }
      case 'movements': {
        if (operation === 'insert') {
          await addMovementInFirestore(userId, data as unknown as MovementRecord);
          return true;
        }
        if (operation === 'update') {
          const id = String(((data as Record<string, unknown>)['id'] as string) || '');
          if (!id) return false;
          await updateMovementInFirestore(userId, id, data as unknown as Partial<MovementRecord>);
          return true;
        }
        if (operation === 'delete') {
          await deleteMovementInFirestore(userId, data as unknown as MovementRecord);
          return true;
        }
        break;
      }
      case 'transactions': {
        if (operation === 'insert' || operation === 'update') {
          await saveTransactionToFirestore(userId, data as unknown as Transaction);
          return true;
        }
        if (operation === 'delete') {
          // Soft delete via saveTransactionToFirestore with deletedAt set by caller
          await saveTransactionToFirestore(userId, data as unknown as Transaction);
          return true;
        }
        break;
      }
      case 'settings': {
        if (operation === 'update' || operation === 'insert') {
          await saveSettings(userId, data as unknown as BreederSettings);
          return true;
        }
        break;
      }
      default: {
        console.warn(`persistRecord: tabela desconhecida "${table}", operação ignorada.`);
        return false;
      }
    }
  } catch (err) {
    console.error('persistRecord erro:', err);
    return false;
  }
  return false;
}
