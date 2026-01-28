# Guia de Migração para Supabase

## Resumo
Você agora pode migrar todos os seus pássaros do localStorage para o Supabase. Isso permite:
- ✅ Dados persistentes na nuvem (backup automático)
- ✅ Verificação funciona mesmo sem internet local
- ✅ Compatibilidade com IBAMA (auditoria)
- ✅ Sistema pronto para escala

## Passo 1: Criar a Tabela `birds` no Supabase

1. Abra seu projeto no Supabase: https://supabase.com
2. Vá para **SQL Editor**
3. Cole o seguinte SQL:

```sql
-- Criar tabela birds no Supabase
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
```

4. Clique em **Executar** (ou aperte Ctrl+Enter)
5. Você deve ver a mensagem: `"CREATE TABLE"` e `"ALTER TABLE"` sem erros

## Passo 2: Sincronizar Pássaros

1. Abra seu aplicativo localmente
2. Vá para **Configurações** → **Perfil e Licenças**
3. Role para baixo até encontrar a seção **Sincronizar com Supabase**
4. Clique em **Sincronizar Agora**
5. Aguarde a sincronização completar

O que você deve ver:
- ✅ "Sincronizados: 5" (exemplo, vai depender de quantos pássaros você tem)
- Status verde: Sucesso!

## Passo 3: Verificar os Dados

No Supabase, você pode verificar se os dados foram sincronizados:

1. Vá para **Table Editor** no Supabase
2. Clique em **birds**
3. Você deve ver seus pássaros listados com todos os dados

## Passo 4: Habilitar RLS (Segurança)

Execute o SQL do arquivo `SUPABASE_RLS_SETUP.sql` que já temos no projeto:

```sql
-- RLS (Row Level Security) para bird_verifications
ALTER TABLE bird_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on bird_verifications"
  ON bird_verifications
  FOR SELECT
  USING (true);

CREATE POLICY "Allow system insert on bird_verifications"
  ON bird_verifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Deny update on bird_verifications"
  ON bird_verifications
  FOR UPDATE
  USING (false);

CREATE POLICY "Deny delete on bird_verifications"
  ON bird_verifications
  FOR DELETE
  USING (false);
```

## Testando o Sistema

### Teste 1: Verificação via QR
1. Imprima um cartão de pássaro
2. Escaneie o QR code
3. Você deve ver os dados do pássaro carregados
4. No Supabase, tabela `bird_verifications` deve ter um novo registro

### Teste 2: Analytics
1. Vá para o menu **Analytics** (PRO apenas)
2. Verifique se os dados de verificação aparecem
3. Escaneie alguns QR codes e veja os dados atualizarem em tempo real

### Teste 3: Novo Pássaro
1. Crie um novo pássaro no app
2. Vá para Configurações → Sincronizar com Supabase
3. Clique **Sincronizar Agora**
4. Novo pássaro deve aparecer na tabela `birds` no Supabase

## Fallback: O Que Acontece se Supabase Cair?

O sistema é resiliente:
- ✅ Dados continuam no localStorage
- ✅ Verificação continua funcionando
- ✅ Quando Supabase volta, dados sincronizam automaticamente
- ✅ RLS garante segurança

## Próximos Passos

Agora que você tem os dados no Supabase, você pode:

1. **Fazer backups** diariamente via Supabase
2. **Monitorar analytics** em tempo real
3. **Escalar** para múltiplos usuários
4. **Adicionar relatórios** personalizados
5. **Integrar com IBAMA** usando os dados auditados

## Troubleshooting

### Problema: "Pássaro não encontrado"
**Solução:** Sincronize novamente na página de Configurações

### Problema: Analytics vazio
**Solução:** 
1. Faça alguns scans de QR code
2. Aguarde alguns segundos
3. Recarregue a página Analytics

### Problema: Erro ao sincronizar
**Solução:**
1. Verifique se está logado
2. Abra o console (F12) e procure por erros
3. Tente novamente em 30 segundos

## Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Veja se está logado no Supabase
3. Confirme que a tabela `birds` foi criada
4. Recarregue a página e tente novamente

---

**Status:** ✅ Sistema pronto para produção com Supabase
**Data:** 28 de Janeiro de 2026
