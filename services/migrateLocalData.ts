export async function migrateLocalData() {
  // Migração local desativada.
  // O projeto usa Firebase; implementar migração para Firestore
  // exige mapeamento e permissões de admin. Por enquanto
  // apenas registra que a migração está desabilitada.
  console.warn(
    'migrateLocalData: migração desativada — projeto usa Firebase. Implemente a migração para Firestore se necessário.'
  );
  return;
}
