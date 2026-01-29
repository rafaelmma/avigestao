-- ============================================
-- DIAGNÓSTICO FINAL: Estado completo do usuário
-- ============================================

-- ID do usuário para referência
WITH user_info AS (
  SELECT 
    id,
    email,
    created_at,
    (SELECT COUNT(*) FROM birds WHERE breeder_id = auth.users.id) as birds_count,
    (SELECT COUNT(*) FROM pairs WHERE user_id = auth.users.id) as pairs_count,
    (SELECT COUNT(*) FROM clutches WHERE user_id = auth.users.id) as clutches_count,
    (SELECT COUNT(*) FROM movements WHERE user_id = auth.users.id) as movements_count
  FROM auth.users 
  WHERE email = 'skunred@gmail.com'
)

-- 1. Info do usuário
SELECT 
  'USER_INFO' as section,
  email as detail,
  birds_count::text as value
FROM user_info
UNION ALL
SELECT 'PAIRS', '', pairs_count::text FROM user_info
UNION ALL
SELECT 'CLUTCHES', '', clutches_count::text FROM user_info
UNION ALL
SELECT 'MOVEMENTS', '', movements_count::text FROM user_info
UNION ALL

-- 2. Verificar se há dados órfãos (sem user_id)
SELECT 
  'ORPHANED_BIRDS' as section,
  'Birds sem breeder_id' as detail,
  COUNT(*)::text as value
FROM birds WHERE breeder_id IS NULL
UNION ALL

-- 3. Verificar RLS status
SELECT 
  'RLS_ENABLED' as section,
  'birds' as detail,
  CASE WHEN pg_is_role(tablename::regclass::oid, 'pg_database_owner', 'USAGE') 
    THEN 'YES' ELSE 'NO' END as value
FROM information_schema.tables 
WHERE table_name = 'birds'
UNION ALL

-- 4. Verificar se há conflitos de política
SELECT 
  'POLICY_COUNT' as section,
  tablename as detail,
  COUNT(*)::text as value
FROM pg_policies 
WHERE tablename IN ('birds', 'pairs', 'clutches', 'movements')
GROUP BY tablename;
