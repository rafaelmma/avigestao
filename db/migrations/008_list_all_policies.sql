-- ============================================
-- LISTAR TODOS OS NOMES DAS POLÍTICAS
-- ============================================
SELECT
  policyname,
  tablename
FROM pg_policies
WHERE tablename IN ('birds', 'pairs', 'clutches', 'medications', 'applications', 'movements', 'tasks', 'tournaments', 'transactions', 'treatments', 'settings')
ORDER BY tablename, policyname;
