# 🌐 Configurar avigestao.com.br no Firebase

## 🎯 Estrutura

```
avigestao.com.br → Aplicação Web (Firebase Hosting)
api.avigestao.com.br → Cloud Functions (Stripe Webhooks)
```

## ✅ Código já atualizado!

- ✅ `lib/stripe.ts` → Chamadas para `api.avigestao.com.br`
- ✅ `functions/src/index.ts` → URLs de sucesso/cancelamento em `avigestao.com.br`
- ✅ Build compilado com URLs customizadas

## 📋 Passo 1: Configurar DNS no RegistroBR

### Acesse seu painel:

1. Vá para https://registrobr.net.br/
2. Faça login
3. Clique em **"Meus Domínios"**
4. Selecione **avigestao.com.br**
5. Clique em **"Gerenciar Zona DNS"** ou **"Zona DNS"**

### Adicione 2 registros:

#### Registro 1: Raiz (avigestao.com.br)

- **Tipo:** A
- **Nome:** @ (ou deixe em branco)
- **Valor:** `151.101.1.195` (será fornecido pelo Firebase)
- **TTL:** 3600

#### Registro 2: Subdomínio API (api.avigestao.com.br)

- **Tipo:** CNAME
- **Nome:** api
- **Valor:** `us-central1-avigestao-cf5fe.cloudfunctions.net`
- **TTL:** 3600

✅ **Salve as mudanças**

## 🔄 Passo 2: Conectar Domínio no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione projeto **avigestao-cf5fe**
3. Vá em **Hosting**
4. Clique em **"Adicionar domínio"** (ou "Conectar domínio")
5. Digite: `avigestao.com.br`
6. Firebase verificará os registros DNS
7. ✅ Confirme quando estiver verificado

> **Nota:** Pode levar até 24h, mas geralmente é rápido (5-30 min)

## 🧪 Passo 3: Verificar Propagação DNS

Execute no PowerShell:

```powershell
# Testar DNS
Resolve-DnsName avigestao.com.br
Resolve-DnsName api.avigestao.com.br
```

Deve retornar:

```
avigestao.com.br → 151.101.1.195
api.avigestao.com.br → us-central1-avigestao-cf5fe.cloudfunctions.net
```

## 🚀 Passo 4: Deploy Completo

```bash
# 1. Compilar (já feito!)
npm run build

# 2. Deploy do Firebase Hosting + Functions
firebase deploy

# Ou separately:
firebase deploy --only hosting  # Aplicação web
firebase deploy --only functions # Cloud Functions
```

## 🔐 Passo 5: Configurar Stripe Webhook

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Developers → Webhooks**
3. Clique em **"Adicionar endpoint"**
4. URL: `https://api.avigestao.com.br/stripeWebhook`
5. Selecione eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Clique em **"Adicionar endpoint"**
7. Copie o **Signing Secret** (começa com `whsec_`)

## 🔑 Passo 6: Configurar Chaves Stripe no Firebase

```bash
firebase functions:config:set stripe.secret_key="sk_live_xxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxx"
```

Verifique:

```bash
firebase functions:config:get
```

## 📝 Checklist Final

- [ ] Registros DNS adicionados no RegistroBR
  - [ ] `@` A record → `151.101.1.195`
  - [ ] `api` CNAME → `us-central1-avigestao-cf5fe.cloudfunctions.net`
- [ ] Domínio conectado no Firebase Hosting
- [ ] DNS verificado em https://mxtoolbox.com/
- [ ] Secret Key do Stripe configurada
- [ ] Webhook Secret do Stripe configurada
- [ ] Deploy realizado: `firebase deploy`
- [ ] Webhook testado no Stripe Dashboard

## 🧬 Teste de Fluxo Completo

1. Acesse **avigestao.com.br**
2. Faça login
3. Vá para pagamentos
4. Clique em "Assinar Plano"
5. Deve redirecionar para `https://checkout.stripe.com/...`
6. Após pagamento, deve voltar para `avigestao.com.br/settings`

## 🐛 Se algo não funcionar

### DNS não propaga:

```powershell
# Limpar cache DNS Windows
ipconfig /flushdns

# Verificar novamente
Resolve-DnsName avigestao.com.br -Type A
Resolve-DnsName api.avigestao.com.br -Type CNAME
```

### Webhook não funciona:

```bash
# Ver logs das functions
firebase functions:log --limit 50

# Testar webhook no Stripe Dashboard
# Developers → Webhooks → [seu webhook] → "Send test event"
```

### URL retorna erro 404:

1. Verifique se o deploy foi bem-sucedido: `firebase deploy --only hosting`
2. Aguarde cache do navegador: Ctrl+Shift+Delete (limpar cookies/cache)
3. Verifique firewall/VPN (alguns bloqueiam domínios novos)

## 📞 Próximos Passos

✅ **Feito:**

- URLs customizadas configuradas no código
- Build compilado
- Documentação completa

⏳ **Faltando:**

1. Adicionar registros DNS (você no RegistroBR)
2. Verificar propagação (aguardar)
3. Conectar domínio no Firebase
4. Configurar chaves Stripe
5. Fazer deploy
6. Testar!

Quer que eu ajude com algum desses passos?
