# 📅 Migração: Adicionar campos de assinatura para rastrear cancelamento

## Problema
Quando você cancela a renovação da assinatura no Stripe, o sistema não mostra quantos dias faltam para expirar o plano PRO. Isso acontece porque os campos `cancel_at_period_end` não estão sincronizados entre Stripe e Supabase.

## Solução
Adicionar campos à tabela `subscriptions` e `settings` para rastrear:
- `cancel_at_period_end`: Flag que indica renovação cancelada
- `subscription_end_date`: Data final do período atual
- `subscription_cancel_at_period_end`: Cópia em `settings` para fácil acesso
- `subscription_status`: Status da assinatura (active, trialing, canceled, etc)

## Como Executar

### 1. Acesse o Supabase
1. Vá para https://app.supabase.com
2. Selecione seu projeto **avigestao**
3. Clique em **SQL Editor** (ícone de terminal na sidebar esquerda)

### 2. Execute a Migração
1. Clique em **+ New query**
2. Copie o conteúdo abaixo:

```sql
-- Add cancel_at_period_end to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add subscription fields to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_end_date DATE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
```

3. Cole no editor
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 3. Verifique
Após executar:
1. Volte para Settings → Meu Plano
2. Você deve ver os dias restantes exibidos quando a assinatura está cancelada
3. Ou faça logout/login para recarregar os dados

## O que fazer no Stripe?

Se você quer testar o cancelamento da renovação:

1. Acesse https://dashboard.stripe.com
2. Vá em **Assinaturas** → Sua assinatura
3. Clique em **Cancelar assinatura** (ou **Atualizar** → **Cancelar renovação**)
4. Escolha **Cancelar no final do período de cobrança atual**
5. Confirme

Agora quando você fizer logout/login no AviGestão, deve aparecer:
- ⏱️ "Período atual expira em X dias"
- ⚠️ "Renovação automática cancelada"

## Novo fluxo de dados

```
Stripe API (webhook) 
  ↓
Salva em subscriptions.cancel_at_period_end
  ↓
/api/subscription-status retorna o flag
  ↓
App.tsx auto-salva em settings.subscription_cancel_at_period_end
  ↓
SettingsManager exibe os dias restantes
```

## Próximas melhorias
- [ ] Alertas de 7 dias antes do vencimento
- [ ] Opção de reativar assinatura diretamente no app
- [ ] Email automático 3 dias antes do vencimento
