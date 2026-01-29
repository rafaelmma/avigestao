-- ============================================
-- PARTE 1: DROP TODAS AS POLÍTICAS ANTIGAS
-- ============================================

-- Drop políticas com sufixo _own
DROP POLICY IF EXISTS "applications_own" ON applications;
DROP POLICY IF EXISTS "clutches_own" ON clutches;
DROP POLICY IF EXISTS "medications_own" ON medications;
DROP POLICY IF EXISTS "movements_own" ON movements;
DROP POLICY IF EXISTS "pairs_own" ON pairs;
DROP POLICY IF EXISTS "settings_own" ON settings;
DROP POLICY IF EXISTS "tasks_own" ON tasks;
DROP POLICY IF EXISTS "tournaments_own" ON tournaments;
DROP POLICY IF EXISTS "transactions_own" ON transactions;
DROP POLICY IF EXISTS "treatments_own" ON treatments;

-- Drop políticas públicas de birds
DROP POLICY IF EXISTS "Public can view bird by ID" ON birds;
DROP POLICY IF EXISTS "Public can view birds" ON birds;

-- Drop política extra de pairs
DROP POLICY IF EXISTS "Users can view their own pairs" ON pairs;

-- ============================================
-- PARTE 2: VERIFICAR RESULTADO
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'pairs', 'clutches', 'birds', 'medications', 'applications',
  'movements', 'tasks', 'tournaments', 'transactions', 'treatments', 'settings'
)
GROUP BY tablename
ORDER BY tablename;
