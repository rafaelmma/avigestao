-- Migration: Add subscription tracking fields to Supabase
-- This ensures cancel_at_period_end is tracked to show days remaining for canceled subscriptions

-- Add cancel_at_period_end to subscriptions table if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add subscription fields to settings table if they don't exist
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_end_date DATE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS subscription_status TEXT;

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Comment on columns
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'True if subscription will be canceled at end of billing period (recurring disabled)';
COMMENT ON COLUMN settings.subscription_end_date IS 'When the current subscription period ends (ISO 8601 date)';
COMMENT ON COLUMN settings.subscription_cancel_at_period_end IS 'True if renewal is canceled - shows countdown in UI';
COMMENT ON COLUMN settings.subscription_status IS 'Stripe subscription status: active, trialing, past_due, canceled, unpaid, etc';
