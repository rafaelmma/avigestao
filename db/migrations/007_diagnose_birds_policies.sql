-- ============================================
-- DIAGNÓSTICO: Listar TODAS as políticas da tabela BIRDS
-- ============================================
SELECT
  policyname,
  tablename,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'birds'
ORDER BY policyname;

-- ============================================
-- Contar políticas por tabela
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('birds', 'pairs', 'clutches', 'medications', 'applications', 'movements', 'tasks', 'tournaments', 'transactions', 'treatments', 'settings')
GROUP BY tablename
ORDER BY tablename;
