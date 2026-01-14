
import Stripe from 'stripe';

export const runtime = 'nodejs'; // Vercel: usar Node.js runtime para libs do Stripe [2](https://docs.github.com/pt/repositories/creating-and-managing-repositories/quickstart-for-repositories)

type PlanKey = 'mensal' | 'trimestral' | 'semestral' | 'anual';

function getPriceId(plan: PlanKey): string {
  switch (plan) {
    case 'mensal':     return process.env.NEXT_PRICE_MENSAL!;
    case 'trimestral': return process.env.NEXT_PRICE_TRIMESTRAL!;
    case 'semestral':  return process.env.NEXT_PRICE_SEMESTRAL!;
    case 'anual':      return process.env.NEXT_PRICE_ANUAL!;
    default:           throw new Error('Plano inválido');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      plan: PlanKey;               // 'mensal' | 'trimestral' | 'semestral' | 'anual'
      customerEmail?: string;      // opcional
      userId?: string;             // opcional para metadata
    };

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20',
    });

    const origin = new URL(
      request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL!
    );

    const priceId = getPriceId(body.plan);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],

      // Checkout escolhe métodos (Pix + Cartão) automaticamente quando habilitado no Dashboard
      automatic_payment_methods: { enabled: true }, // Pix precisa estar habilitado [4](https://docs.joincpr.com/en/article/15-accessing-stripe-api-keys)
      locale: 'pt-BR',

      success_url: `${origin}/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/assinatura/cancelado`,

      customer_email: body.customerEmail,
      metadata: {
        plan: body.plan,
        userId: body.userId ?? '',
      },
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}
``
