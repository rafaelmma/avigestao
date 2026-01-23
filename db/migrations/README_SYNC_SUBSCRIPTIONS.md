# 🔄 Sincronização de Assinaturas Histórias

## Problema

Se você adicionou a funcionalidade de rastreamento de assinatura **após** criar suas assinaturas no Stripe, os dados históricos (como `cancel_at_period_end`) não estarão no Supabase.

## Solução

Use o endpoint de sincronização em massa para atualizar todas as assinaturas de uma vez.

## Como Usar

### 1. Defina a variável de ambiente

No seu `.env.local` ou Vercel environment variables, adicione:

```
SYNC_SUBSCRIPTIONS_KEY=seu_chave_secreta_aqui
```

Escolha uma chave segura (ex: gere uma com `openssl rand -base64 32`)

### 2. Execute a sincronização

**Opção A: Via curl**
```bash
curl "https://seu-app.vercel.app/api/admin/sync-all-subscriptions?key=sua_chave_aqui"
```

**Opção B: Via JavaScript**
```javascript
fetch('https://seu-app.vercel.app/api/admin/sync-all-subscriptions', {
  method: 'GET',
  headers: { 'x-sync-key': 'sua_chave_aqui' }
})
.then(r => r.json())
.then(data => console.log(data))
```

**Opção C: No console do navegador (se você for admin)**
```javascript
fetch('/api/admin/sync-all-subscriptions?key=sua_chave', {
  method: 'GET'
}).then(r => r.json()).then(console.log)
```

### 3. Verifique o resultado

A resposta será:
```json
{
  "success": true,
  "synced": 5,
  "errors": 0,
  "message": "Synced 5 subscriptions from Stripe"
}
```

## O que acontece?

O endpoint:
1. Busca **TODAS** as assinaturas do Stripe (paginadas)
2. Para cada assinatura, atualiza ou cria um registro no Supabase
3. Preenche: `current_period_end`, `cancel_at_period_end`, `status`
4. Também atualiza a tabela `settings` com os dados

## Futuro

Depois disso:
- **Novas assinaturas**: Webhook dispara automaticamente
- **Mudanças**: Webhook atualiza `cancel_at_period_end` automaticamente
- **Novo cancelamento**: Basta clicar em "🔄 Sync" no app, ou esperar o webhook

## Webhook automático

Quando você cancela/reativa uma assinatura no Stripe:
- Webhook dispara em `customer.subscription.updated`
- Atualiza `subscriptions` table com novos dados
- Atualiza `settings` table também
- Usuário vê mudança ao fazer logout/login

Se não quiser esperar, clique no botão "🔄 Sync" em Settings → Meu Plano.

## Segurança

A chave é necessária para evitar sincronizações acidentais. Mantenha-a segura!

Se alguém descobrir a chave, ele poderia sincronizar dados (que é leitura do Stripe), mas não poderia modificar.

## Troubleshooting

**"Invalid sync key"** → A chave está errada ou não foi definida nas variáveis de ambiente

**"Synced X, errors Y"** → Significa que alguns subscriptions falharam. Verifique se todos têm `user_id` nos metadados do Stripe
