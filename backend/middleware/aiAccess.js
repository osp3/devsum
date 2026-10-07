import User from '../models/User.js';
import { resolveAICredentials, runWithUsage } from '../services/billing/aiCredentials.js';

const BLOCKED = {
  no_access: [402, 'subscription_required', 'Your free trial has ended. Subscribe to keep using DevSum.'],
  daily_limit: [429, 'daily_limit', "You've reached today's AI usage limit. It resets at midnight UTC."],
};

/**
 * Resolve AI credentials into req.ai and meter DevSum-key usage for the rest of the request.
 * Must run after ensureAuthenticated.
 * @param {Object} options - { block: false } attaches credentials without rejecting the request
 */
export const aiAccess = ({ block = true } = {}) => async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+openaiApiKey');
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });

    req.ai = await resolveAICredentials(user);
    const blocked = block && BLOCKED[req.ai.reason];
    if (blocked) {
      const [status, code, error] = blocked;
      return res.status(status).json({ success: false, code, error });
    }
    return runWithUsage({ userId: user._id, metered: req.ai.metered }, next);
  } catch (error) {
    return next(error);
  }
};
