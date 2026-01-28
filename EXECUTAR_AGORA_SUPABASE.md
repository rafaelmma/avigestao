# 🚨 EXECUTAR AGORA - Suas Policies RLS Estão Faltando

## Problema Identificado

Você está recebendo erro **403** porque a tabela `birds` foi criada mas as **RLS Policies para INSERT/UPDATE/DELETE estão faltando**.

A URL que você compartilhou usa `user_id=eq.` mas o sistema agora usa `breeder_id=eq.` - isso foi corrigido no código.

## ✅ Solução (5 minutos)

### Passo 1: Abra o Supabase SQL Editor

1. Acesse: https://supabase.com
2. Clique no seu projeto
3. Menu esquerdo → **SQL Editor**
4. Clique em **New Query**

### Passo 2: Cole este SQL

**IMPORTANTE:** Copie TUDO abaixo e execute:

```sql
-- Verificar se as policies já existem
-- Se receber erro "already exists", tudo está correto!

CREATE POLICY "Users can insert their own birds"
  ON birds
  FOR INSERT
  WITH CHECK (auth.uid()::text = breeder_id);

CREATE POLICY "Users can update their own birds"
  ON birds
  FOR UPDATE
  USING (auth.uid()::text = breeder_id) 
  WITH CHECK (auth.uid()::text = breeder_id);

CREATE POLICY "Users can delete their own birds"
  ON birds
  FOR DELETE
  USING (auth.uid()::text = breeder_id);
```

### Passo 3: Clique em **Executar** (ou Ctrl+Enter)

Você deve ver uma das mensagens:
- ✅ **Success** (verde) → Policies criadas com sucesso!
- ✅ **ERROR: policy already exists** → Policies já estão lá, perfeito!

### Passo 4: Teste Imediatamente

1. Volte ao app
2. Abra **DevTools (F12)** → **Console**
3. Recarregue a página (Ctrl+R)
4. Vá para **Gerenciador de Pássaros**

**Você deve ver seus pássaros aparecerem agora! ✅**

## Se ainda não aparecer:

### Verificação 1: Ver as Policies no Supabase

1. Supabase → **Table Editor**
2. Clique em tabela `birds`
3. Aba **Policies** (topo direito)
4. Você deve ver:
   - ✅ Users can view their own birds (SELECT)
   - ✅ Users can insert their own birds (INSERT)
   - ✅ Users can update their own birds (UPDATE)
   - ✅ Users can delete their own birds (DELETE)

### Verificação 2: Ver Erros no Console

1. App → Recarregue (F5)
2. F12 → **Console**
3. Procure por mensagens em vermelho
4. Se vir erro 403 → RLS policies ainda faltam
5. Se vir erro 401 → Token expirado (faça logout/login)

### Verificação 3: Testar a Query Diretamente

No Supabase SQL Editor, execute:

```sql
SELECT * FROM birds WHERE breeder_id = auth.uid()::text;
```

Você deve ver seus pássaros na resposta! ✅

## Resumo das Alterações no Código

✅ `services/dataService.ts` linha 168: Agora usa `breeder_id` ao invés de `user_id`
✅ `App.tsx`: addBird/updateBird usam `breeder_id`
✅ Build passou sem erros

**Falta APENAS:** As RLS Policies de INSERT/UPDATE/DELETE no Supabase

## Próximos Passos Após Sucesso

1. Criar novo pássaro e verificar se salva
2. Editar um pássaro existente
3. Verificar se aparecem nos dados do Supabase

---

**⏰ Tempo estimado:** 5 minutos
**🎯 Prioridade:** CRÍTICA - Sem isso, o app não funciona
**📞 Suporte:** Se tiver erro, compartilhe a mensagem do console (F12)
