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
    // ===============================
    // checkout.session.completed
    // ===============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // preferir metadata.userId (você já manda isso no checkout)
      const userId = (session.metadata?.userId || null) as string | null;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Tipos podem variar conforme lib -> usar any para evitar TS quebrando
        const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;

        const userId = session.metadata?.user_id ?? null;
		
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
