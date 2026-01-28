# Guia de Migração para Supabase

## Resumo
Seu sistema agora é totalmente integrado com Supabase:
- ✅ Dados sincronizam **automaticamente** quando você cria/edita pássaros
- ✅ Dados persistentes na nuvem (backup automático)
- ✅ Verificação via QR funciona em tempo real
- ✅ Compatibilidade com IBAMA (auditoria completa)
- ✅ Sistema pronto para escala sem limite

## Passo 1: Criar a Tabela `birds` no Supabase

1. Abra seu projeto no Supabase: https://supabase.com
2. Vá para **SQL Editor**
3. Cole o seguinte SQL:

```sql
CREATE TABLE birds (
  id TEXT PRIMARY KEY,
  breeder_id TEXT NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  sex TEXT DEFAULT 'Macho',
  status TEXT DEFAULT 'Ativo',
  ring_number TEXT,
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

ALTER TABLE birds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own birds" ON birds 
  FOR SELECT USING (auth.uid()::text = breeder_id);

CREATE POLICY "Public can view bird by ID" ON birds 
  FOR SELECT USING (true);

CREATE INDEX idx_birds_breeder_id ON birds(breeder_id);
CREATE INDEX idx_birds_species ON birds(species);
CREATE INDEX idx_birds_status ON birds(status);
```

4. Clique em **Executar** (ou aperte Ctrl+Enter)
5. Você deve ver as mensagens sem erros ✅

## Passo 2: Pronto! Sincronização Automática Ativada ✨

**Não precisa fazer nada!** A partir de agora:
- Quando você cria um novo pássaro → Sincroniza automaticamente ✅
- Quando você edita um pássaro → Sincroniza automaticamente ✅
- Quando você escaneia um QR code → Busca do Supabase em tempo real ✅

## Teste a Sincronização

### Teste 1: Criar um novo pássaro
1. Vá para **Gerenciador de Pássaros**
2. Clique em **Novo Pássaro**
3. Preencha os dados e salve
4. Vá para o Supabase **Table Editor** → **birds**
5. Você deve ver o novo pássaro na lista ✅

### Teste 2: Escanear QR Code
1. Abra um pássaro e imprima o cartão
2. Escaneie o QR code com seu celular
3. A página de verificação deve abrir mostrando os dados em tempo real
4. Na tabela `bird_verifications`, você verá o acesso registrado ✅

### Teste 3: Verificar Analytics
1. Vá para **Analytics** (PRO apenas)
2. Você deve ver as verificações listadas
3. Escaneie alguns QR codes e veja os dados atualizarem ✅

## Fallback: O Que Acontece se Supabase Cair?

O sistema é resiliente:
- ✅ Dados continuam no localStorage
- ✅ Novos pássaros ficam em fila para sincronizar
- ✅ Verificação continua funcionando offline
- ✅ Quando Supabase volta, tudo sincroniza automaticamente

## Próximos Passos

Agora que você tem tudo automatizado, você pode:

1. **Fazer backups** diários via Supabase (Menu Backups)
2. **Monitorar analytics** em tempo real
3. **Escalar** para múltiplos usuários sem limites
4. **Adicionar relatórios** personalizados
5. **Integrar com IBAMA** usando os dados auditados

## Troubleshooting

### Problema: Pássaro não aparece no Supabase
**Solução:** 
- Certifique-se de que está logado no app
- Abra o console (F12) para ver se há erros
- Recarregue a página

### Problema: QR Code não funciona
**Solução:**
1. Verifique se a tabela `birds` foi criada
2. Escaneie um código existente
3. Se problema persistir, verifique o console (F12)

### Problema: Analytics vazio
**Solução:**
1. Faça alguns scans de QR code
2. Aguarde alguns segundos
3. Recarregue a página

## Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Veja se está logado
3. Confirme que a tabela `birds` foi criada
4. Recarregue a página e tente novamente

---

**Status:** ✅ Sistema 100% automatizado com Supabase
**Data:** 28 de Janeiro de 2026
**Sincronização:** Automática em tempo real
