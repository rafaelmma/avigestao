-- ============================================
-- DIAGNÓSTICO: Verificar dados reais no banco
-- ============================================

-- 1. Quantos birds existem no total?
SELECT COUNT(*) as total_birds FROM birds;

-- 2. Quantos birds por breeder_id?
SELECT 
  breeder_id,
  COUNT(*) as count
FROM birds
GROUP BY breeder_id
ORDER BY count DESC;

-- 3. Mostrar os primeiros 5 birds
SELECT id, name, species, breeder_id FROM birds LIMIT 5;

-- 4. Testar RLS: qual é o seu user_id?
SELECT auth.uid() as current_user_id;

-- 5. Quais birds você tem acesso? (simular query da app)
SELECT id, name, species, breeder_id 
FROM birds 
WHERE breeder_id::text = auth.uid()::text 
LIMIT 5;
