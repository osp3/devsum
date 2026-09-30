import { rateLimit } from 'express-rate-limit';

// Shared per-user budget for routes that can trigger OpenAI calls; must run after ensureAuthenticated
export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { success: false, error: 'Too many AI requests, please try again later' }
});
