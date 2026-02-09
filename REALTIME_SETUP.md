# Como Habilitar Supabase Realtime

## Passo 1: Dashboard do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto **avigestao**
3. No menu lateral → **Database** → **Replication**

## Passo 2: Habilitar Realtime nas Tabelas

Você precisa habilitar replicação para as tabelas que quer sincronizar em tempo real:

### Tabelas para habilitar:

- `birds` ✅
- `movements` ✅

**Como habilitar:**

1. Na página **Replication**, procure a tabela (ex: `birds`)
2. Clique no toggle/switch ao lado da tabela
3. Marque para habilitar `INSERT`, `UPDATE`, `DELETE`
4. Salve

Repita para `movements` e outras tabelas que quiser sincronizar.

## Passo 3: Testar

Após habilitar:

1. Abra o app em 2 abas/dispositivos diferentes
2. Adicione uma ave em uma aba
3. Veja aparecer automaticamente na outra aba (sem refresh!)

## Observações

- **Grátis no plano Free** até 2GB de dados/mês
- Sincronização em tempo real entre todos os dispositivos logados
- Toast notification quando dados são alterados por outro dispositivo
