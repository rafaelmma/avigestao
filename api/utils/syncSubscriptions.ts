import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover" as any,
});

/**
 * Sincroniza todas as assinaturas do Stripe com o Supabase
 * Executa uma única vez ao iniciar o servidor
 * 
 * Útil para:
 * - Preencher dados históricos de assinaturas criadas antes dessa implementação
 * - Garantir que cancel_at_period_end está sempre sincronizado
 * - Atualizar current_period_end com dados corretos do Stripe
 */
export async function syncAllSubscriptionsFromStripe() {
  try {
    console.log("🔄 Starting subscription sync from Stripe...");

    // Get all subscriptions from Supabase that don't have current_period_end
    const { data: subscriptionsToSync, error: fetchError } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, user_id")
      .is("current_period_end", null)
      .limit(100);

    if (fetchError) {
      console.error("Failed to fetch subscriptions:", fetchError);
      return;
    }

    if (!subscriptionsToSync || subscriptionsToSync.length === 0) {
      console.log("✅ All subscriptions are up to date");
      return;
    }

    console.log(`📊 Found ${subscriptionsToSync.length} subscriptions to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const sub of subscriptionsToSync) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id
        );

        const currentPeriodEnd = (stripeSubscription as any)?.current_period_end ?? null;
        const cancelAtPeriodEnd = (stripeSubscription as any)?.cancel_at_period_end ?? false;

        // Update subscriptions table
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            current_period_end: currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000)
              : null,
            cancel_at_period_end: cancelAtPeriodEnd,
            status: stripeSubscription.status,
          })
          .eq("stripe_subscription_id", sub.stripe_subscription_id);

        if (!updateError) {
          // Also update settings table
          const subscriptionEndDate = currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString().split('T')[0]
            : null;

          await supabase
            .from("settings")
            .update({
              subscription_end_date: subscriptionEndDate,
              subscription_cancel_at_period_end: cancelAtPeriodEnd,
              subscription_status: stripeSubscription.status,
            })
            .eq("user_id", sub.user_id);

          syncedCount++;
        } else {
          errorCount++;
          console.warn(`Failed to sync subscription ${sub.stripe_subscription_id}:`, updateError);
        }
      } catch (err) {
        errorCount++;
        console.warn(`Error syncing subscription ${sub.stripe_subscription_id}:`, err);
      }
    }

    console.log(`✅ Sync completed: ${syncedCount} synced, ${errorCount} errors`);
  } catch (err) {
    console.error("🔴 Subscription sync failed:", err);
  }
}
