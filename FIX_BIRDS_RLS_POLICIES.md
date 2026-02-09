# FIX: Adicionar Políticas RLS Faltantes para Tabela Birds

## Problema

A tabela `birds` só tem SELECT policy, mas não tem INSERT e UPDATE policies.
Por isso, ao tentar salvar um novo pássaro, o Supabase rejeita silenciosamente.

## Solução

Execute este SQL no Supabase SQL Editor:

```sql
-- Policy para INSERT: usuários podem criar pássaros com seu próprio user_id
CREATE POLICY "Users can insert their own birds" ON birds
  FOR INSERT WITH CHECK (auth.uid()::text = breeder_id);

-- Policy para UPDATE: usuários podem editar seus próprios pássaros
CREATE POLICY "Users can update their own birds" ON birds
  FOR UPDATE USING (auth.uid()::text = breeder_id)
  WITH CHECK (auth.uid()::text = breeder_id);

-- Policy para DELETE: usuários podem deletar seus próprios pássaros
CREATE POLICY "Users can delete their own birds" ON birds
  FOR DELETE USING (auth.uid()::text = breeder_id);
```

## Após executar:

- ✅ Novo pássaro pode ser criado
- ✅ Pássaro pode ser editado
- ✅ Pássaro pode ser deletado
- ✅ Pássaro aparece na lista quando faz login
