import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover" as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Endpoint para sincronizar TODAS as assinaturas historicamente
 * Execute uma única vez após fazer deploy
 * 
 * Busca todas as assinaturas do Stripe e atualiza no Supabase com:
 * - current_period_end
 * - cancel_at_period_end
 * - status
 * 
 * GET /api/admin/sync-all-subscriptions?key=SYNC_KEY
 */
export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple auth: require a special key to prevent misuse
  const syncKey = req.query.key || req.headers["x-sync-key"];
  if (syncKey !== process.env.SYNC_SUBSCRIPTIONS_KEY) {
    return res.status(401).json({ error: "Invalid sync key" });
  }

  try {
    console.log("🔄 Starting bulk subscription sync from Stripe...");

    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    let totalSynced = 0;
    let totalErrors = 0;

    while (hasMore) {
      // Get all subscriptions from Stripe
      const response: any = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ["data.customer"],
      });

      const subscriptions: any[] = response.data;

      for (const subscription of subscriptions) {
        try {
          const userId = (subscription.metadata?.userId || 
                          subscription.metadata?.user_id ||
                          null) as string | null;

          if (!userId) {
            console.warn(`Subscription ${subscription.id} has no user_id in metadata, skipping`);
            continue;
          }

          const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;
          const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? false;

          // Update or create subscription record
          const { error: updateError } = await supabase
            .from("subscriptions")
            .upsert(
              {
                stripe_subscription_id: subscription.id,
                user_id: userId,
                status: subscription.status,
                current_period_end: currentPeriodEnd
                  ? new Date(currentPeriodEnd * 1000)
                  : null,
                cancel_at_period_end: cancelAtPeriodEnd,
                stripe_customer_id: typeof subscription.customer === "string"
                  ? subscription.customer
                  : (subscription.customer as any)?.id || null,
              },
              { onConflict: "stripe_subscription_id" }
            );

          if (!updateError) {
            // Also update settings table
            const subscriptionEndDate = currentPeriodEnd
              ? new Date(currentPeriodEnd * 1000).toISOString().split("T")[0]
              : null;

            await supabase
              .from("settings")
              .update({
                subscription_end_date: subscriptionEndDate,
                subscription_cancel_at_period_end: cancelAtPeriodEnd,
                subscription_status: subscription.status,
              })
              .eq("user_id", userId);

            totalSynced++;
          } else {
            totalErrors++;
            console.warn(
              `Failed to sync subscription ${subscription.id}:`,
              updateError
            );
          }
        } catch (err) {
          totalErrors++;
          console.warn(`Error processing subscription ${subscription.id}:`, err);
        }
      }

      // Check if there are more subscriptions
      hasMore = response.has_more;
      if (hasMore && subscriptions.length > 0) {
        startingAfter = subscriptions[subscriptions.length - 1].id;
      }
    }

    console.log(
      `✅ Bulk sync completed: ${totalSynced} synced, ${totalErrors} errors`
    );

    return res.status(200).json({
      success: true,
      synced: totalSynced,
      errors: totalErrors,
      message: `Synced ${totalSynced} subscriptions from Stripe`,
    });
  } catch (err: any) {
    console.error("🔴 Bulk sync failed:", err);
    return res.status(500).json({
      error: err.message || "Sync failed",
    });
  }
}
