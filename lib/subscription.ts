import { BreederSettings } from '../types';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const hasActiveProPlan = (settings?: BreederSettings | null, now = new Date()) => {
  if (!settings) return false;

  if (settings.isProActive === true) return true;

  const trialEnd = parseDate(settings.trialEndDate);
  if (trialEnd && trialEnd > now) return true;

  if (settings.plan !== 'Profissional') return false;

  const subscriptionEnd = parseDate(settings.subscriptionEndDate);
  if (subscriptionEnd && subscriptionEnd > now) return true;

  const status = settings.subscriptionStatus?.toLowerCase();
  if (status && ACTIVE_STATUSES.has(status)) return true;

  return false;
};
