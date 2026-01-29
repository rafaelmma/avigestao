# 🔧 CORRIGIR RLS POLICIES - Passo a Passo

## ⚠️ PROBLEMA IDENTIFICADO
Suas tabelas estão com `UNRESTRICTED` = As RLS policies não estão funcionando!

## ✅ SOLUÇÃO

### Passo 1: Abrir o Supabase SQL Editor
1. Acesse: https://supabase.com/
2. Selecione seu projeto (avigestao)
3. Menu esquerdo → **SQL Editor**
4. Clique em "+ New Query"

### Passo 2: Copiar e Colar o SQL
```
Arquivo: db/migrations/006_fix_rls_policies.sql
```

**Copie TODO o conteúdo do arquivo `006_fix_rls_policies.sql`**

### Passo 3: Executar no Supabase
1. Cole o SQL no editor do Supabase
2. Clique em **"Run"** (botão verde, canto superior direito)
3. Aguarde completar (deve demorar uns 10 segundos)

### Passo 4: Verificar Resultado
Deve aparecer uma tabela mostrando:
```
schemaname | tablename | policy_count
public     | applications | 4
public     | birds | 4
public     | clutches | 4
public     | medications | 4
public     | movements | 4
public     | pairs | 4
public     | settings | 3
public     | tasks | 4
public     | tournaments | 4
public     | transactions | 4
public     | treatments | 4
```

Se vir `policy_count > 0`, as policies foram criadas com sucesso! ✅

### Passo 5: Recarregar o Site
1. Volte para seu site (http://localhost:5173)
2. **F5** (recarregar página)
3. Os casais devem aparecer agora!

---

## ❌ Se Receber Erro

Se aparecer erro tipo:
```
duplicate key value violates unique constraint
```

Significa que as policies já existem. Nesse caso:
1. Execute apenas a **PARTE 2** (apenas o ENABLE):
```sql
ALTER TABLE pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clutches ENABLE ROW LEVEL SECURITY;
-- etc...
```

2. Depois tente carregar os dados novamente

---

## 🆘 Se Ainda Não Funcionar

1. Compartilhe a mensagem de erro exata que aparece
2. Verifique no Supabase → Database → Policies (tabela `pairs`) se há policies criadas
3. Se estiver "UNRESTRICTED", clique no ícone e configure manualmente

---

**⏰ Tempo estimado:** 2 minutos
**🎯 Prioridade:** ALTA - Sem isso, nenhum dado funciona corretamente
