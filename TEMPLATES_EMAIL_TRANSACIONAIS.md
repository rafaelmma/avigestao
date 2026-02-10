# Templates de email transacionais

Este documento lista os templates criados no backend e onde eles sao acionados.

## Origem dos templates

Os templates estao em [functions/src/index.ts](functions/src/index.ts) na funcao `buildTransactionalTemplate()`.

## Lista de templates

### 1) welcome
- Assunto: Bem-vindo ao AviGestao!
- Objetivo: confirmar verificacao de email e primeiro acesso.
- Corpo (texto/HTML): confirma verificacao e link para o app.

### 2) welcome-pro
- Assunto: Bem-vindo ao Plano Profissional!
- Objetivo: confirmar ativacao do plano Profissional.
- Corpo (texto/HTML): confirma plano ativo e link para o app.

### 3) payment-success
- Assunto: Pagamento confirmado
- Objetivo: confirmar pagamento e acesso liberado.
- Corpo (texto/HTML): confirma pagamento e acesso ativo.

### 4) payment-failed
- Assunto: Falha no pagamento
- Objetivo: avisar falha e solicitar atualizacao de dados.
- Corpo (texto/HTML): alerta de falha e pede atualizacao no painel.

### 5) subscription-cancel-scheduled
- Assunto: Cancelamento agendado
- Objetivo: avisar cancelamento agendado e periodo restante.
- Corpo (texto/HTML): informa que o acesso segue ativo ate o fim do periodo.

### 6) subscription-canceled
- Assunto: Assinatura cancelada
- Objetivo: confirmar cancelamento e orientar reativacao.
- Corpo (texto/HTML): informa cancelamento e link para reativar.

## Disparos atuais (Stripe)

Os disparos estao conectados aos eventos do Stripe em [functions/src/index.ts](functions/src/index.ts):
- checkout.session.completed -> welcome-pro
- invoice.payment_succeeded / invoice.paid -> payment-success
- invoice.payment_failed -> payment-failed
- customer.subscription.updated (status = cancel_at_period_end) -> subscription-cancel-scheduled
- customer.subscription.deleted -> subscription-canceled

## MercadoPago

Disparos no webhook do MercadoPago em [functions/src/index.ts](functions/src/index.ts):
- payment.status = approved -> welcome-pro (primeira ativacao) ou payment-success (renovacao)
- payment.status = rejected | cancelled | refunded | charged_back -> payment-failed

## Verificacao de email

O email `welcome` e enviado pela funcao `sendWelcomeEmailIfNeeded` apos o usuario verificar o email e optar pelo envio.

## Email de contato (formulario do HelpCenter)

O formulario usa um email simples (nao e template transacional) e envia para contato@avigestao.com.br.
Ele esta em [functions/src/index.ts](functions/src/index.ts), na funcao `contactFormEmail`.
