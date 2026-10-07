import { rateLimit } from 'express-rate-limit';

// Per-user budget over 15 minutes; must run after ensureAuthenticated
const perUserRateLimit = (limit, error) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { success: false, error }
});

// Shared budget for routes that can trigger OpenAI calls
export const aiRateLimit = perUserRateLimit(100, 'Too many AI requests, please try again later');

// Checkout and portal sessions
export const billingRateLimit = perUserRateLimit(20, 'Too many billing requests, please try again later');
