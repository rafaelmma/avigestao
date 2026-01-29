-- ============================================
-- TESTE RLS: Simular acesso do usuário
-- ============================================

-- Obter ID do usuário skunred@gmail.com
WITH user_id AS (
  SELECT id FROM auth.users WHERE email = 'skunred@gmail.com'
)

-- 1. Testar acesso a birds (com RLS)
SELECT 
  'birds_with_rls' as test,
  COUNT(*) as count
FROM birds 
WHERE breeder_id = (SELECT id FROM user_id)
UNION ALL

-- 2. Verificar políticas na tabela birds
SELECT 
  'rls_policies_on_birds' as test,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'birds'
UNION ALL

-- 3. Listar políticas detalhadamente
SELECT 
  policy_name as test,
  0 as count
FROM 
(
  SELECT policyname as policy_name FROM pg_policies WHERE tablename = 'birds'
  UNION ALL
  SELECT policyname FROM pg_policies WHERE tablename = 'pairs'
) sub
ORDER BY test DESC;
