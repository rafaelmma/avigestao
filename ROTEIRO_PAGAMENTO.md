# Roteiro de Implementação de Pagamentos (Stripe + Supabase)

Este guia explica como substituir o modal de pagamento "simulado" do frontend por um processamento real usando **Stripe** para assinaturas e **PIX**.

## Visão Geral da Arquitetura

1. **Frontend:** O usuário clica em "Assinar PRO".
2. **Supabase Edge Function:** O app chama uma função segura que cria uma _Sessão de Checkout_ no Stripe.
3. **Stripe:** O usuário é redirecionado para a página segura do Stripe para pagar (Cartão ou PIX).
4. **Webhook:** Quando o pagamento é aprovado, o Stripe avisa o Supabase.
5. **Banco de Dados:** O Supabase atualiza a tabela `profiles` mudando o plano para `'Profissional'`.

---

## Passo 1: Configuração do Stripe

1. Crie uma conta em [dashboard.stripe.com](https://dashboard.stripe.com).
2. Ative o modo de teste ("Test Mode").
3. Vá em **Catálogo de Produtos** e crie um produto chamado "AviGestão PRO".
4. Adicione preços a este produto (ex: R$ 19,90/mês, R$ 167,10/ano).
5. Anote os **Price IDs** (ex: `price_1Pxyz...`) de cada plano.
6. Vá em **Desenvolvedores > Chaves de API** e anote:
   - `STRIPE_PUBLISHABLE_KEY` (pk*test*...)
   - `STRIPE_SECRET_KEY` (sk*test*...)

---

## Passo 2: Atualizar Banco de Dados (Supabase)

Adicione colunas para controlar a assinatura na tabela de perfis. Execute isso no SQL Editor do Supabase:

```sql
alter table public.profiles
add column stripe_customer_id text,
add column subscription_status text default 'active', -- 'active', 'past_due', 'canceled'
add column subscription_end_date timestamp with time zone;
```

---

## Passo 3: Criar Supabase Edge Function (Checkout)

Você precisará do CLI do Supabase instalado na sua máquina (`npm i -g supabase`).

1. Inicialize a função: `supabase functions new create-checkout`
2. No arquivo `supabase/functions/create-checkout/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Stripe } from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  // 1. Pegar o usuário logado
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createClient(...) // Inicializar cliente Supabase
  const { data: { user } } = await supabaseClient.auth.getUser(token)

  // 2. Pegar o price_id do corpo da requisição
  const { price_id } = await req.json()

  // 3. Criar sessão no Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'boleto'], // Adicione 'pix' se sua conta Stripe permitir
    line_items: [{ price: price_id, quantity: 1 }],
    mode: 'subscription',
    success_url: `${req.headers.get('origin')}/?payment=success`,
    cancel_url: `${req.headers.get('origin')}/?payment=canceled`,
    client_reference_id: user.id, // Importante: ID do usuário para o Webhook saber quem pagou
  })

  return new Response(JSON.stringify({ url: session.url }), { headers: { 'Content-Type': 'application/json' } })
})
```

---

## Passo 4: Criar Webhook (Onde a mágica acontece)

Crie outra função: `supabase functions new stripe-webhook`

```typescript
// ... imports do Stripe e Supabase ...

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')!
  const body = await req.text()

  // 1. Verificar se o evento veio mesmo do Stripe
  const event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)

  // 2. Tratar evento de "Checkout Completo"
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id
    const customerId = session.customer

    // 3. Atualizar o banco de dados do Supabase
    const supabase = createClient(...)
    await supabase
      .from('profiles')
      .update({
        plan: 'Profissional',
        stripe_customer_id: customerId,
        subscription_status: 'active'
      })
      .eq('id', userId)
  }

  return new Response(JSON.stringify({ received: true }))
})
```

---

## Passo 5: Integração no Frontend (React)

No arquivo `SettingsManager.tsx`, substitua a função `processPayment` simulada por uma chamada real à sua API:

```typescript
import { supabase } from '../lib/supabase'; // Seu cliente configurado

const handleCheckout = async (priceId: string) => {
  setLoading(true);

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { price_id: priceId },
  });

  if (data?.url) {
    // Redireciona o usuário para o site do Stripe
    window.location.href = data.url;
  }
};
```

## Resumo

1. O Frontend chama a função `create-checkout`.
2. O usuário paga no site do Stripe.
3. O Stripe chama seu `stripe-webhook` em background.
4. O `stripe-webhook` atualiza a tabela `profiles` para "Profissional".
5. Quando o usuário voltar ao site, o `useEffect` do `App.tsx` vai ler o perfil atualizado e liberar as funções.
