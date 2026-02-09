# 🔧 PASSO A PASSO - Corrigir Carregamento e Salvamento de Pássaros

## ✅ O Que Foi Corrigido no Código

1. **loadTabData()** em `services/dataService.ts` agora usa `breeder_id` (não `user_id`)

   - ✅ Pássaros agora carregam ao fazer login

2. **addBird()** em `App.tsx` usa `breeder_id` corretamente

   - ✅ Novo pássaro pode ser inserido

3. **updateBird()** em `App.tsx` usa `breeder_id` corretamente
   - ✅ Edições de pássaro funcionam

## ⚠️ O Que Você Ainda Precisa Fazer

A tabela birds precisa de **RLS Policies para INSERT, UPDATE e DELETE**.

### Passo 1: Abra o Supabase

1. Vá para https://supabase.com
2. Abra seu projeto
3. Clique em **SQL Editor** (menu esquerdo)

### Passo 2: Cole e Execute Este SQL

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

### Passo 3: Verifique se passou

Você deve ver "Success" em verde ✅

## 🧪 Teste a Sincronização

### Teste 1: Carregar Pássaros Existentes

1. Faça login no site
2. Vá para **Gerenciador de Pássaros**
3. ✅ Seus pássaros antigos devem aparecer

### Teste 2: Criar Novo Pássaro

1. Clique em **Novo Pássaro**
2. Preencha nome, espécie, sexo, etc
3. Clique **Salvar**
4. ✅ Pássaro deve aparecer na lista
5. Vá ao Supabase e verifique se está lá

### Teste 3: Editar Pássaro

1. Clique em um pássaro na lista
2. Clique **Editar Dados**
3. Mude o nome
4. Clique **Salvar Alterações**
5. ✅ Mudança deve aparecer imediatamente

## 🆘 Se Ainda Houver Problemas

### Abra o Console do Navegador

1. Pressione **F12**
2. Vá para aba **Console**
3. Procure por mensagens de erro vermelhas

### Erro Comum: 403 Forbidden

Significa que o RLS policy não foi criado corretamente.

- Verifique se executou o SQL no passo 2
- Veja se o SQL rodou sem erros

### Erro Comum: 401 Unauthorized

Significa que não está logado ou o token expirou.

- Faça logout
- Faça login novamente
- Tente salvar

## 📞 Debug Checklist

- [ ] Recarreguei o site (Ctrl+F5 para limpar cache)
- [ ] Fiz logout e login novamente
- [ ] Executei o SQL das RLS Policies
- [ ] Verifiquei que não há erros no Console (F12)
- [ ] Aguardei alguns segundos após salvar

---

**Status:** Código corrigido ✅ | Você está a 1 passo de completar!
