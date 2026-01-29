-- ============================================
-- FIX: Remover policies antigas que podem estar bloqueando INSERT
-- ============================================

-- Remover policies antigas que podem estar bloqueando
DROP POLICY IF EXISTS "Allow system insert on bird_verifications" ON bird_verifications;
DROP POLICY IF EXISTS "Allow public read access on bird_verifications" ON bird_verifications;
DROP POLICY IF EXISTS "Public can insert bird verifications" ON bird_verifications;
DROP POLICY IF EXISTS "Public can read bird verifications" ON bird_verifications;

-- Criar policy correta para SELECT (sem autenticação)
CREATE POLICY "Public can read bird verifications" ON bird_verifications
  FOR SELECT
  USING (true);

-- Criar policy correta para INSERT (sem autenticação necessária)
CREATE POLICY "Public can insert bird verifications" ON bird_verifications
  FOR INSERT
  WITH CHECK (true);
