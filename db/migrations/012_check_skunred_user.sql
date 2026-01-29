-- ============================================
-- DIAGNÓSTICO: Verificar dados do skunred@gmail.com
-- ============================================

-- 1. Verificar se o usuário existe
SELECT id, email, created_at FROM auth.users 
WHERE email = 'skunred@gmail.com';

-- 2. Verificar dados do perfil
SELECT * FROM profiles 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'skunred@gmail.com'
);

-- 3. Verificar pássaros do usuário (CORRIGIDO - sem ::text)
SELECT id, name, species, breeder_id, created_at FROM birds 
WHERE breeder_id = (
  SELECT id FROM auth.users 
  WHERE email = 'skunred@gmail.com'
);

-- 4. Verificar pares do usuário
SELECT id, male_id, female_id, start_date, user_id FROM pairs
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'skunred@gmail.com'
);

-- 5. Verificar posturas (clutches)
SELECT id, pair_id, lay_date, egg_count, user_id FROM clutches
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'skunred@gmail.com'
);

-- 6. Contar tudo para este usuário
SELECT 
  'birds' as table_name,
  COUNT(*) as total
FROM birds 
WHERE breeder_id = (SELECT id FROM auth.users WHERE email = 'skunred@gmail.com')
UNION ALL
SELECT 'pairs', COUNT(*) FROM pairs WHERE user_id = (SELECT id FROM auth.users WHERE email = 'skunred@gmail.com')
UNION ALL
SELECT 'clutches', COUNT(*) FROM clutches WHERE user_id = (SELECT id FROM auth.users WHERE email = 'skunred@gmail.com')
UNION ALL
SELECT 'movements', COUNT(*) FROM movements WHERE user_id = (SELECT id FROM auth.users WHERE email = 'skunred@gmail.com');
