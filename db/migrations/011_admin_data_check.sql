-- ============================================
-- DIAGNÓSTICO ADMIN: Verificar dados brutos
-- ============================================

-- 1. Total de birds (sem RLS)
SELECT COUNT(*) as total_birds FROM birds;

-- 2. Todos os birds que existem (mostrar breeder_id)
SELECT id, name, species, breeder_id, created_at 
FROM birds 
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Birds agrupados por breeder
SELECT 
  breeder_id,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as bird_names
FROM birds
GROUP BY breeder_id;

-- 4. Verificar se há dados em outras tabelas
SELECT COUNT(*) as total_pairs FROM pairs;
SELECT COUNT(*) as total_clutches FROM clutches;
SELECT COUNT(*) as total_movements FROM movements;
