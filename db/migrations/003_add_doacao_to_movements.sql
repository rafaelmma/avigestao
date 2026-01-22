-- Adicionar suporte para "Doação" no tipo de movimentação
-- Execute este SQL no Supabase SQL Editor

-- Se houver constraint de CHECK existente, remova primeiro:
-- ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_type_check;

-- Adicione nova constraint que inclui Doação
ALTER TABLE movements DROP CONSTRAINT IF EXISTS movements_type_check;

ALTER TABLE movements 
  ADD CONSTRAINT movements_type_check 
  CHECK (type IN ('Óbito', 'Fuga', 'Transporte', 'Venda', 'Doação'));

-- Ou se estiver usando ENUM, atualize o tipo:
-- ALTER TYPE movement_type ADD VALUE IF NOT EXISTS 'Doação';
