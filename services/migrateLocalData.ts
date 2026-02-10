export async function migrateLocalData() {
  // Migracao local desativada.
  // O projeto usa Firebase; implementar migracao para Firestore
  // exige mapeamento e permissoes. Por enquanto apenas registra.
  console.warn(
    'migrateLocalData: migracao desativada - projeto usa Firebase. Implemente a migracao para Firestore se necessario.',
  );
  return;
}
