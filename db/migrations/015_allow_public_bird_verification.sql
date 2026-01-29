-- ============================================
-- ADIÇÃO DE POLÍTICA: Permitir leitura pública de pássaros por ID
-- ============================================

-- Permitir que qualquer pessoa acesse um pássaro específico por ID
-- Isso é necessário para a verificação via QR code funcionar
CREATE POLICY "Public can view any bird by ID for verification" ON birds
  FOR SELECT
  USING (true);  -- Permite qualquer um ler qualquer pássaro
