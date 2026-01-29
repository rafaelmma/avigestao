# 🔍 Debug: Casais Desaparecidos

## Problema
Os casais (pairs) não aparecem na aba de Reprodução após a migração do banco de dados.

## Causas Possíveis

### 1. RLS Policies Bloqueando Acesso
A migração pode ter resetado as RLS policies. Verificar no Supabase:
- Menu "Authentication" → "Policies"
- Tabela `pairs` → Policy de SELECT

### 2. Dados não Sincronizados
Os dados existem no localStorage mas não foram sincronizados com Supabase.

### 3. Query Retornando Vazio
A query está filtrando por `user_id` mas pode estar sem dados.

## Como Debugar (F12 - Console)

```javascript
// 1. Verificar localStorage
localStorage.getItem('avigestao_state_v2::seu_user_id')

// 2. Procurar por "pairs" no JSON retornado
// Se ver "pairs: []", os casais não estão salvos

// 3. Verificar erros no console
// Procurar por mensagens vermelhas sobre Supabase
```

## Soluções Rápidas

### Solução 1: Recarregar Página
```
F5 (força recarregar tudo)
```

### Solução 2: Limpar LocalStorage e Fazer Login Novamente
```javascript
// No console (F12):
localStorage.clear()
// Depois, F5 e faça login novamente
```

### Solução 3: Sincronizar Dados Manualmente
Se há dados no localStorage mas não em Supabase:
1. Abra Console (F12)
2. Procure por "Sincronizado com Supabase"
3. Se disser erro, os dados não sincronizaram

## Verificar no Supabase

1. Ir para https://supabase.com → seu projeto
2. SQL Editor → Executar:
```sql
SELECT * FROM pairs WHERE user_id = 'seu_user_id' LIMIT 10;
```
3. Se retornar vazio, não há dados
4. Se retornar dados, é problema de RLS policy

## Próxima Ação

Se nenhuma solução acima funcionar:
1. Compartilhar screenshot do console (F12)
2. Compartilhar resultado da query acima do Supabase
