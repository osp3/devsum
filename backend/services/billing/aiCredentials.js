import { AsyncLocalStorage } from 'node:async_hooks';
import AiUsage from '../../models/AiUsage.js';
import { DEFAULT_OPENAI_MODEL, resolveModel } from '../../config/openaiModels.js';
import { aiDailyTokenCap, getAccess, isBillingEnabled } from '../../config/billing.js';

// Carries { userId, metered } through async AI calls so usage on DevSum's key is counted per user
const usageContext = new AsyncLocalStorage();

export const runWithUsage = (store, fn) => usageContext.run(store, fn);

export const recordUsage = (totalTokens) => {
  const store = usageContext.getStore();
  if (!store?.metered || !totalTokens) return;
  AiUsage.record(store.userId, totalTokens)
    .catch((error) => console.error('Failed to record AI usage:', error.message));
};

/**
 * Pick the OpenAI key for a user. Their own key wins; otherwise DevSum's key while they have access.
 * Metered users are pinned to the default model to keep costs predictable.
 * @param {Object} user - User document selected with +openaiApiKey
 * @returns {Promise<{apiKey: string|null, model: string, metered: boolean, reason: string}>}
 */
export const resolveAICredentials = async (user, now = new Date()) => {
  const model = resolveModel(user.openaiModel);
  const ownKey = user.openaiApiKey || null;

  if (!isBillingEnabled()) return { apiKey: ownKey, model, metered: false, reason: ownKey ? 'user_key' : 'no_key' };

  const access = getAccess(user, now);
  if (!access.allowed) return { apiKey: null, model, metered: false, reason: 'no_access' };
  if (ownKey) return { apiKey: ownKey, model, metered: false, reason: 'user_key' };

  const serverKey = process.env.OPENAI_API_KEY;
  if (!serverKey) return { apiKey: null, model, metered: false, reason: 'no_key' };
  if (access.reason === 'admin') return { apiKey: serverKey, model, metered: false, reason: 'devsum_key' };

  if (await AiUsage.tokensToday(user._id, now) >= aiDailyTokenCap()) {
    return { apiKey: null, model: DEFAULT_OPENAI_MODEL, metered: false, reason: 'daily_limit' };
  }
  return { apiKey: serverKey, model: DEFAULT_OPENAI_MODEL, metered: true, reason: 'devsum_key' };
};
