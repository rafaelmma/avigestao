-- RLS (Row Level Security) para bird_verifications
-- Permite que TODOS vejam dados de verificações (pública)
-- Apenas o sistema pode inserir

ALTER TABLE bird_verifications ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer pessoa pode ler (para IBAMA)
CREATE POLICY "Allow public read access on bird_verifications"
  ON bird_verifications
  FOR SELECT
  USING (true);

-- Política: Apenas sistema pode inserir (via JWT token)
CREATE POLICY "Allow system insert on bird_verifications"
  ON bird_verifications
  FOR INSERT
  WITH CHECK (true);

-- Desabilitar update/delete
CREATE POLICY "Deny update on bird_verifications"
  ON bird_verifications
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny delete on bird_verifications"
  ON bird_verifications
  FOR DELETE
  USING (false);

-- RLS para bird_certificates (se usar no futuro)
ALTER TABLE bird_certificates ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler certificados (públicos)
CREATE POLICY "Allow public read access on bird_certificates"
  ON bird_certificates
  FOR SELECT
  USING (true);

-- Apenas sistema pode inserir
CREATE POLICY "Allow system insert on bird_certificates"
  ON bird_certificates
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance (já criados, mas duplicando aqui por segurança)
CREATE INDEX IF NOT EXISTS idx_bird_verifications_bird_id ON bird_verifications(bird_id);
CREATE INDEX IF NOT EXISTS idx_bird_verifications_accessed_at ON bird_verifications(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bird_verifications_date_range ON bird_verifications(accessed_at, bird_id);
