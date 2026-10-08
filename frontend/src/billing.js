// Display copy only; the server decides the actual Stripe price
export const PLANS = {
  month: { label: 'Monthly', price: '$8', period: 'month' },
  year: { label: 'Yearly', price: '$80', period: 'year', note: '2 months free' },
};

export const TRIAL_DAYS = 14;

const DAY_MS = 86_400_000;

export const daysLeft = (date, now = Date.now()) => Math.max(0, Math.ceil((new Date(date) - now) / DAY_MS));

export const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));

export const canSubscribe = (access) => access?.reason === 'trial' || access?.reason === 'none';
