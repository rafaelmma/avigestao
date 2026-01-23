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

const resolveUserIdFromStripe = async (params: { customerId?: string | null; subscriptionId?: string | null; }) => {
  const { customerId, subscriptionId } = params;
  if (customerId) {
    const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
    if (data?.user_id) return data.user_id as string;
  }
  if (subscriptionId) {
    const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_subscription_id', subscriptionId).maybeSingle();
    return data?.user_id as string | null;
  }
  return null;
};

const recordBillingMetric = async (payload: {
  eventType: string;
  userId: string | null;
  subscriptionId: string | null;
  amount?: number | null;
  currency?: string | null;
  rawEvent: Stripe.Event;
}) => {
  try {
    await supabase.from('billing_metrics').insert({
      event_type: payload.eventType,
      user_id: payload.userId,
      subscription_id: payload.subscriptionId,
      amount: payload.amount ?? null,
      currency: payload.currency ?? null,
      raw_event: payload.rawEvent,
    });
  } catch (e) {
    console.error(`Failed to write billing metric for ${payload.eventType}`, e);
  }
};

const handleCheckoutCompleted = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = (session.metadata?.userId || session.metadata?.user_id || null) as string | null;

  if (session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      user_email: session.customer_email ?? null,
      stripe_customer_id: session.customer ?? null,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    });

    await setUserAsPro(userId, session.customer as string);
  }

  await recordBillingMetric({
    eventType: 'checkout.session.completed',
    userId,
    subscriptionId: (session.subscription as string) ?? null,
    rawEvent: event,
  });
};

const handleSubscriptionUpdated = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;
  const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? null;

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      cancel_at_period_end: cancelAtPeriodEnd,
    })
    .eq("stripe_subscription_id", subscription.id);

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
};

const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any)?.subscription ?? null;

  if (subId) {
    await supabase.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId);
  }

  const customerId = (invoice as any)?.customer ?? null;
  const userId = await resolveUserIdFromStripe({ customerId, subscriptionId: subId });

  await recordBillingMetric({
    eventType: 'invoice.payment_failed',
    userId,
    subscriptionId: subId,
    amount: (invoice.amount_due ?? null) ? Number((invoice.amount_due as number) / 100) : null,
    currency: invoice.currency ?? null,
    rawEvent: event,
  });
};

const handleInvoicePaymentSucceeded = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any)?.subscription ?? null;
  const customerId = (invoice as any)?.customer ?? null;

  const userId = await resolveUserIdFromStripe({ customerId, subscriptionId: subId });

  await recordBillingMetric({
    eventType: 'invoice.payment_succeeded',
    userId,
    subscriptionId: subId,
    amount: (invoice.amount_paid ?? null) ? Number((invoice.amount_paid as number) / 100) : null,
    currency: invoice.currency ?? null,
    rawEvent: event,
  });

  const invoicePaid = invoice.status === 'paid' || (invoice as any)?.paid;
  if (userId && invoicePaid) {
    await setUserAsPro(userId, customerId);
  }
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);
};

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const signature = Array.isArray(sig) ? sig[0] : sig;

  if (!signature) {
    return res.status(400).send("Missing Stripe signature");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const buf = Buffer.concat(chunks);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "invoice.payment_succeeded":
      case "invoice.paid":
        await handleInvoicePaymentSucceeded(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        // ignore other events
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).send("Webhook handler failed");
  }
}
