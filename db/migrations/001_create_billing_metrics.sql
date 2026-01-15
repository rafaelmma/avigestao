-- Migration: create billing_metrics table
-- Creates a table to store Stripe / billing related events for auditing and metrics

-- Enable pgcrypto for gen_random_uuid() if not present (requires superuser)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS billing_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  subscription_id text,
  amount numeric,
  currency text,
  created_at timestamptz DEFAULT now(),
  raw_event jsonb
);

CREATE INDEX IF NOT EXISTS idx_billing_metrics_user_id ON billing_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_metrics_created_at ON billing_metrics(created_at);
