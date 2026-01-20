import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ===============================
// Stripe client
// ===============================
// Se o seu pacote stripe está tipado exigindo "2025-12-15.clover",
// mantemos isso para compilar. (Depois te mostro como alinhar a lib.)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover" as any,
});

// ===============================
// Supabase client
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// ===============================
// Disable body parser (Vercel)
// ===============================
export const config = {
  api: { bodyParser: false },
};

// ===============================
// Minimal request typing (Vercel Node)
// ===============================
type VercelReq = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  // req é async iterable no Node
  [Symbol.asyncIterator](): AsyncIterator<Buffer>;
};

type VercelRes = {
  status: (code: number) => VercelRes;
  json: (data: any) => void;
  send: (data: any) => void;
};

// ===============================
// Webhook handler
// ===============================
export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const signature = Array.isArray(sig) ? sig[0] : sig;

  if (!signature) {
    return res.status(400).send("Missing Stripe signature");
  }

  // Ler raw body
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    const setUserAsPro = async (userId: string | null | undefined, customerId?: string | null) => {
      if (!userId) return;
      try {
        await supabase
          .from("settings")
          .upsert(
            {
              user_id: userId,
              plan: "Profissional",
              trial_end_date: null,
              stripe_customer_id: customerId || null,
            } as any,
            { onConflict: "user_id" }
          );
      } catch (e) {
        console.error("Failed to mark user as PRO:", e);
      }
    };

    // ===============================
    // checkout.session.completed
    // ===============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Prefer metadata.userId (checkout sends userId), fallback to user_id for legacy
      const userId = (session.metadata?.userId || session.metadata?.user_id || null) as
        | string
        | null;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Tipos podem variar conforme lib -> usar any para evitar TS quebrando
        const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          user_email: session.customer_email ?? null,
          stripe_customer_id: session.customer ?? null,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : null,
        });

        await setUserAsPro(userId, session.customer as string);
      }
    }

    // Track billing metric for checkout that creates a subscription (no amount yet)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        await supabase.from('billing_metrics').insert({
          event_type: 'checkout.session.completed',
          user_id: session.metadata?.userId || session.metadata?.user_id || null,
          subscription_id: session.subscription ?? null,
          raw_event: event,
        });
      } catch (e) {
        console.error('Failed to write billing metric for checkout.session.completed', e);
      }
    }

    // ===============================
    // customer.subscription.updated
    // ===============================
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : null,
        })
        .eq("stripe_subscription_id", subscription.id);

      // Best-effort: marcar usuário como PRO se o status estiver ativo/trialing e conhecermos o user_id
      if (subscription.status === "active" || subscription.status === "trialing") {
        try {
          const { data: subRow } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          await setUserAsPro(subRow?.user_id, (subscription as any)?.customer);
        } catch (e) {
          console.error("Failed to sync PRO on subscription.updated", e);
        }
      }
    }

    // ===============================
    // invoice.payment_failed
    // ===============================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;

      // Algumas versões tipadas não expõem invoice.subscription -> usar any
      const subId = (invoice as any)?.subscription ?? null;

      if (subId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subId);
      }
      // insert billing metric for failed payment
      try {
        const customerId = (invoice as any)?.customer ?? null;
        // try to resolve user_id by customer or subscription
        let userId = null;
        if (customerId) {
          const { data: subRow } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
          userId = subRow?.user_id ?? null;
        }
        if (!userId && subId) {
          const { data: subRow } = await supabase.from('subscriptions').select('user_id').eq('stripe_subscription_id', subId).maybeSingle();
          userId = subRow?.user_id ?? null;
        }

        await supabase.from('billing_metrics').insert({
          event_type: 'invoice.payment_failed',
          user_id: userId,
          subscription_id: subId,
          amount: (invoice.amount_due ?? null) ? Number((invoice.amount_due as number) / 100) : null,
          currency: invoice.currency ?? null,
          raw_event: event,
        });
      } catch (e) {
        console.error('Failed to write billing metric for invoice.payment_failed', e);
      }
    }

    // ===============================
    // invoice.payment_succeeded
    // ===============================
    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = (invoice as any)?.subscription ?? null;
      const customerId = (invoice as any)?.customer ?? null;

      try {
        let userId = null;
        if (customerId) {
          const { data: subRow } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
          userId = subRow?.user_id ?? null;
        }
        if (!userId && subId) {
          const { data: subRow } = await supabase.from('subscriptions').select('user_id').eq('stripe_subscription_id', subId).maybeSingle();
          userId = subRow?.user_id ?? null;
        }

        await supabase.from('billing_metrics').insert({
          event_type: 'invoice.payment_succeeded',
          user_id: userId,
          subscription_id: subId,
          amount: (invoice.amount_paid ?? null) ? Number((invoice.amount_paid as number) / 100) : null,
          currency: invoice.currency ?? null,
          raw_event: event,
        });

        const invoicePaid = invoice.status === 'paid' || (invoice as any)?.paid;
        if (userId && invoicePaid) {
          await setUserAsPro(userId, customerId);
        }
      } catch (e) {
        console.error('Failed to write billing metric for invoice.payment_succeeded', e);
      }
    }

    // ===============================
    // customer.subscription.deleted
    // ===============================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).send("Webhook handler failed");
  }
}
