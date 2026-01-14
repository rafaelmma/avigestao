import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ===============================
// Stripe client
// ===============================
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

// ===============================
// Supabase client
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ===============================
// Disable body parser (Vercel)
// ===============================
export const config = {
  api: {
    bodyParser: false,
  },
};

// ===============================
// Webhook handler (Vercel runtime)
// ===============================
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const body = await req.arrayBuffer();
  const buf = Buffer.from(body);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    // ===============================
    // Checkout completed
    // ===============================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const currentPeriodEnd =
          (subscription as any).current_period_end ?? null;

        await supabase.from("subscriptions").upsert({
          user_email: session.customer_email,
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000)
            : null,
        });
      }
    }

    // ===============================
    // Subscription updated
    // ===============================
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      const currentPeriodEnd =
        (subscription as any).current_period_end ?? null;

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
    // Subscription deleted
    // ===============================
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
