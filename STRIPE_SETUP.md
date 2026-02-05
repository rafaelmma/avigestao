# 🎯 Configuração do Stripe com Firebase

## 📋 Resumo da Implementação

✅ **100% Firebase** - Cloud Functions + Firestore + Hosting

Firebase Cloud Functions criadas:
- `createCheckoutSession` - Criar sessão de pagamento
- `createPortalSession` - Portal do cliente Stripe
- `getSubscriptionStatus` - Verificar status da assinatura
- `stripeWebhook` - Receber eventos do Stripe

## 🔧 Configuração das Variáveis de Ambiente

### 1. Configure as variáveis no Firebase

```bash
# Definir as chaves do Stripe
firebase functions:config:set stripe.secret_key="sk_live_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"

# Ver configuração atual
firebase functions:config:get
```

### 2. Para desenvolvimento local

Crie `functions/.env` (não commitar):

```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 🔑 Como obter as chaves do Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers → API Keys**
3. Copie a **Secret Key** (começa com `sk_test_` ou `sk_live_`)
4. Para o webhook secret:
   - Vá em **Developers → Webhooks**
   - Crie um novo webhook apontando para: 
     ```
     https://us-central1-avigestao-cf5fe.cloudfunctions.net/stripeWebhook
     ```
   - Selecione os eventos:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copie o **Signing Secret** (começa com `whsec_`)

## 📊 Estrutura de Dados no Firestore

### Collection: `users/{userId}`

```typescript
{
  // Stripe
  stripeCustomerId: "cus_xxxxx",
  subscription: {
    stripeSubscriptionId: "sub_xxxxx",
    status: "active" | "trialing" | "past_due" | "canceled",
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: boolean
  },
  
  // Plano
  plan: "Gratuito" | "Profissional",
  trialEndDate: Timestamp | null,
  
  // Metadata
  email: "usuario@exemplo.com",
  updatedAt: Timestamp
}
```

### Collection: `billing_metrics`

```typescript
{
  eventType: "checkout.session.completed" | "invoice.payment_succeeded" | etc,
  userId: "user_id",
  subscriptionId: "sub_xxxxx",
  amount: 29.90,
  currency: "brl",
  rawEvent: { /* evento completo do Stripe */ },
  createdAt: Timestamp
}
```

## 🚀 Deploy

### 1. Configurar as variáveis

```bash
firebase functions:config:set stripe.secret_key="sk_live_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"
```

### 2. Deploy das Functions

```bash
firebase deploy --only functions
```

Ou deploy de funções específicas:

```bash
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook
```

### 3. Deploy completo (Frontend + Functions)

```bash
npm run build
firebase deploy
```

## 📱 Integração no Frontend

O arquivo `lib/stripe.ts` já está configurado:

```typescript
import { assinarPlano, abrirPortalCliente, verificarAssinatura } from '@/lib/stripe';

// Criar assinatura
await assinarPlano('price_xxxxx');

// Abrir portal do cliente
await abrirPortalCliente();

// Verificar status
const status = await verificarAssinatura();
console.log(status.isActive); // true/false
```

## 🎁 Criar Produtos no Stripe

1. Acesse o Stripe Dashboard
2. **Products → Add Product**
3. Configure:
   - Nome: "Plano Profissional"
   - Preço: R$ 29,90/mês
   - Recorrência: Mensal
4. Copie o **Price ID** (começa com `price_`)

Use o Price ID no código:

```typescript
// Exemplo em SettingsManager.tsx
const PLANO_MENSAL = 'price_1234567890';
await assinarPlano(PLANO_MENSAL);
```

## ✅ Checklist de Configuração

- [ ] Criar conta no Stripe
- [ ] Obter Secret Key do Stripe (teste e produção)
- [ ] Criar produto e preços no Stripe Dashboard
- [ ] Configurar variáveis no Firebase Functions
  ```bash
  firebase functions:config:set stripe.secret_key="sk_xxxxx"
  firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"
  ```
- [ ] Deploy das functions
  ```bash
  firebase deploy --only functions
  ```
- [ ] Configurar webhook no Stripe apontando para:
  ```
  https://us-central1-avigestao-cf5fe.cloudfunctions.net/stripeWebhook
  ```
- [ ] Testar fluxo de pagamento em modo teste
- [ ] Ativar modo produção no Stripe
- [ ] Atualizar chaves para produção
- [ ] Testar pagamento real

## 🐛 Troubleshooting

### Erro: "CORS policy" ao chamar function
✅ **Solução**: As functions já têm CORS configurado. Certifique-se de estar usando a URL correta:
```
https://us-central1-avigestao-cf5fe.cloudfunctions.net/createCheckoutSession
```

### Erro: "Missing Stripe credentials"
✅ **Solução**: Configure as variáveis:
```bash
firebase functions:config:set stripe.secret_key="sk_xxxxx"
firebase deploy --only functions
```

### Erro: "Webhook signature verification failed"
✅ **Solução**: 
1. Verifique se o webhook no Stripe aponta para a URL correta
2. Copie o Signing Secret correto do webhook
3. Configure: `firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"`

### Subscription não aparece no Firestore
✅ **Solução**:
1. Verifique os logs: `firebase functions:log`
2. Confirme que o webhook está recebendo eventos
3. Teste o webhook no Stripe Dashboard (Send test webhook)

### Function timeout
✅ **Solução**: Aumente o timeout nas functions (já configurado para 60s)

## 📞 Comandos Úteis

```bash
# Ver logs das functions
firebase functions:log

# Ver configurações
firebase functions:config:get

# Deletar function
firebase functions:delete nomeDaFunction

# Testar localmente
cd functions
npm run serve
```

## 🔒 Segurança

- ✅ Todas as APIs validam token Firebase Auth
- ✅ Webhook valida assinatura do Stripe
- ✅ CORS configurado para aceitar requisições do seu domínio
- ✅ Dados sensíveis armazenados em environment variables

## 💰 Custos Firebase

Cloud Functions tier gratuito:
- 2M invocações/mês
- 400K GB-segundos/mês
- 200K CPU-segundos/mês

Suficiente para começar! 🚀

## 📞 Suporte

- [Stripe Docs](https://stripe.com/docs)
- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Firebase Config](https://firebase.google.com/docs/functions/config-env)

