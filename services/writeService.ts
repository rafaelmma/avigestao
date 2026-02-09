// Helpers de escrita: delegam para `persistRecord` quando possível.
import { persistRecord } from './persist';

export async function insertRow(
  table?: string,
  data?: Record<string, unknown>,
  userId?: string,
) {
  if (!table || !userId) {
    console.warn('insertRow: parâmetros insuficientes, operação ignorada.');
    return false;
  }
  return persistRecord(table, data || {}, userId, 'insert');
}

export async function updateRow(
  table?: string,
  data?: Record<string, unknown>,
  userId?: string,
) {
  if (!table || !userId) {
    console.warn('updateRow: parâmetros insuficientes, operação ignorada.');
    return false;
  }
  return persistRecord(table, data || {}, userId, 'update');
}

export async function deleteRow(
  table?: string,
  data?: Record<string, unknown>,
  userId?: string,
) {
  if (!table || !userId) {
    console.warn('deleteRow: parâmetros insuficientes, operação ignorada.');
    return false;
  }
  return persistRecord(table, data || {}, userId, 'delete');
}
