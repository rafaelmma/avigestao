-- ============================================
-- ADIÇÃO DE POLÍTICA: Permitir INSERT público em bird_verifications
-- ============================================

-- Permitir que qualquer pessoa registre uma verificação (leitura) de pássaro
-- Isso é necessário para que o analytics registre cada acesso via QR code
CREATE POLICY "Public can insert bird verifications" ON bird_verifications
  FOR INSERT
  WITH CHECK (true);  -- Permite qualquer um inserir verificações
