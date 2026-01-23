import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-12-15.clover" as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid token or user not found' });
  }

  const user_id = userData.user.id;

  try {
    // Get subscription from Supabase
    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subData?.stripe_subscription_id) {
      return res.status(404).json({ error: 'No subscription found for user' });
    }

    // Fetch fresh data from Stripe
    const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);

    const currentPeriodEnd = (subscription as any)?.current_period_end ?? null;
    const cancelAtPeriodEnd = (subscription as any)?.cancel_at_period_end ?? false;

    // Update Supabase subscriptions table
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        cancel_at_period_end: cancelAtPeriodEnd,
      })
      .eq("stripe_subscription_id", subData.stripe_subscription_id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription', details: updateError });
    }

    // Update settings table with subscription info
    const subscriptionEndDate = currentPeriodEnd 
      ? new Date(currentPeriodEnd * 1000).toISOString().split('T')[0]
      : null;

    const { error: settingsError } = await supabase
      .from("settings")
      .update({
        subscription_end_date: subscriptionEndDate,
        subscription_cancel_at_period_end: cancelAtPeriodEnd,
        subscription_status: subscription.status,
      })
      .eq("user_id", user_id);

    if (settingsError) {
      console.warn('Failed to update settings:', settingsError);
    }

    return res.status(200).json({
      success: true,
      subscription: {
        status: subscription.status,
        current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
      message: 'Subscription synced successfully from Stripe',
    });
  } catch (err: any) {
    console.error('Sync subscription error:', err);
    return res.status(500).json({ error: err.message });
  }
}
