/**
 * Billing configuration and access rules - single source of truth for who can use DevSum
 */

export const TRIAL_DAYS = 14;
export const PAST_DUE_GRACE_DAYS = 3;
export const DEFAULT_AI_DAILY_TOKEN_CAP = 200000;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAID_STATUSES = new Set(['active', 'trialing']);

export const isBillingEnabled = () => process.env.BILLING_ENABLED === 'true';

export const frontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

export const trialEndFrom = (now = new Date()) => new Date(now.getTime() + TRIAL_DAYS * DAY_MS);

export const aiDailyTokenCap = () => Number(process.env.AI_DAILY_TOKEN_CAP) || DEFAULT_AI_DAILY_TOKEN_CAP;

// Prices come only from env, so clients can pick an interval but never a price
export const priceIdFor = (interval) =>
  (interval === 'month' ? process.env.STRIPE_PRICE_MONTHLY
    : interval === 'year' ? process.env.STRIPE_PRICE_YEARLY
      : null) || null;

export const intervalForPrice = (priceId) =>
  priceId && priceId === process.env.STRIPE_PRICE_MONTHLY ? 'month'
    : priceId && priceId === process.env.STRIPE_PRICE_YEARLY ? 'year'
      : null;

let adminRaw;
let adminIds = new Set();

// Numeric GitHub IDs never change or get reused, unlike usernames
export const isAdmin = (githubId) => {
  const raw = process.env.ADMIN_GITHUB_IDS || '';
  if (raw !== adminRaw) {
    adminRaw = raw;
    adminIds = new Set(raw.split(',').map((id) => id.trim()).filter(Boolean));
  }
  return adminIds.has(String(githubId));
};

/**
 * Decide whether a user can use DevSum
 * @param {Object} user - User document or plain object
 * @param {Date} now
 * @returns {{allowed: boolean, reason: 'open'|'admin'|'paid'|'trial'|'none'}}
 */
export const getAccess = (user, now = new Date()) => {
  if (!isBillingEnabled()) return { allowed: true, reason: 'open' };
  if (isAdmin(user.githubId)) return { allowed: true, reason: 'admin' };

  const { status, currentPeriodEnd } = user.billing || {};
  if (PAID_STATUSES.has(status)) return { allowed: true, reason: 'paid' };
  if (status === 'past_due' && currentPeriodEnd && now.getTime() < new Date(currentPeriodEnd).getTime() + PAST_DUE_GRACE_DAYS * DAY_MS) {
    return { allowed: true, reason: 'paid' };
  }

  if (user.trialEndsAt && now < new Date(user.trialEndsAt)) return { allowed: true, reason: 'trial' };
  return { allowed: false, reason: 'none' };
};

// Safe to send to the browser: no Stripe IDs
export const publicAccess = (user, now = new Date()) => ({
  ...getAccess(user, now),
  trialEndsAt: user.trialEndsAt || null,
  plan: intervalForPrice(user.billing?.priceId),
  status: user.billing?.status || 'none',
  currentPeriodEnd: user.billing?.currentPeriodEnd || null,
  canManageBilling: Boolean(user.billing?.customerId),
});
