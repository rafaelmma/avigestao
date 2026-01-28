-- Criar tabela birds no Supabase
-- Esta tabela armazena todos os pássaros do criatório

CREATE TABLE IF NOT EXISTS birds (
  id TEXT PRIMARY KEY,
  breeder_id TEXT NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  sex TEXT,
  status TEXT DEFAULT 'Ativo',
  ring_number TEXT UNIQUE,
  birth_date DATE,
  color_mutation TEXT,
  classification TEXT,
  location TEXT,
  father_id TEXT,
  mother_id TEXT,
  song_training_status TEXT,
  song_type TEXT,
  training_notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE birds ENABLE ROW LEVEL SECURITY;

-- Política: Usuário autenticado pode ver apenas seus próprios pássaros
CREATE POLICY "Users can view their own birds"
  ON birds
  FOR SELECT
  USING (auth.uid()::text = breeder_id);

-- Política: Usuário autenticado pode criar/editar/deletar seus próprios pássaros
CREATE POLICY "Users can manage their own birds"
  ON birds
  FOR INSERT
  WITH CHECK (auth.uid()::text = breeder_id);

CREATE POLICY "Users can update their own birds"
  ON birds
  FOR UPDATE
  USING (auth.uid()::text = breeder_id);

CREATE POLICY "Users can delete their own birds"
  ON birds
  FOR DELETE
  USING (auth.uid()::text = breeder_id);

-- Política: PÚBLICA pode ver pássaro por ID (para verificação via QR)
CREATE POLICY "Public can view bird by ID for verification"
  ON birds
  FOR SELECT
  USING (true);

-- Índices para performance
CREATE INDEX idx_birds_breeder_id ON birds(breeder_id);
CREATE INDEX idx_birds_species ON birds(species);
CREATE INDEX idx_birds_status ON birds(status);
CREATE INDEX idx_birds_created_at ON birds(created_at DESC);
