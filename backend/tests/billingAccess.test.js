import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ENCRYPTION_KEY ||= 'test-encryption-key';
const { getAccess, isAdmin, priceIdFor, publicAccess, trialEndFrom } = await import('../config/billing.js');
const { resolveAICredentials } = await import('../services/billing/aiCredentials.js');
const { default: AiUsage } = await import('../models/AiUsage.js');

const now = new Date('2026-10-07T12:00:00Z');
const day = 24 * 60 * 60 * 1000;
const ENV_KEYS = ['BILLING_ENABLED', 'ADMIN_GITHUB_IDS', 'OPENAI_API_KEY', 'AI_DAILY_TOKEN_CAP', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_YEARLY'];
let savedEnv;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { BILLING_ENABLED: 'true', ADMIN_GITHUB_IDS: ' 586134, 42 ,', STRIPE_PRICE_MONTHLY: 'price_m', STRIPE_PRICE_YEARLY: 'price_y' });
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  mock.restoreAll();
});

describe('getAccess', () => {
  test('everyone has access while billing is disabled', () => {
    process.env.BILLING_ENABLED = 'false';
    assert.deepEqual(getAccess({ githubId: '1' }, now), { allowed: true, reason: 'open' });
  });

  test('admins by numeric GitHub ID, ignoring whitespace and empty entries', () => {
    assert.equal(getAccess({ githubId: '586134' }, now).reason, 'admin');
    assert.equal(getAccess({ githubId: 42 }, now).reason, 'admin');
    assert.equal(isAdmin(''), false);
  });

  test('active and trialing subscriptions are paid', () => {
    for (const status of ['active', 'trialing']) {
      assert.deepEqual(getAccess({ githubId: '1', billing: { status } }, now), { allowed: true, reason: 'paid' });
    }
  });

  test('past_due keeps access for a 3 day grace period after the period end', () => {
    const user = (endedDaysAgo) => ({ githubId: '1', billing: { status: 'past_due', currentPeriodEnd: new Date(now - endedDaysAgo * day) } });
    assert.equal(getAccess(user(2), now).allowed, true);
    assert.equal(getAccess(user(4), now).allowed, false);
  });

  test('trial gives access until trialEndsAt', () => {
    assert.equal(getAccess({ githubId: '1', trialEndsAt: new Date(now.getTime() + 1000) }, now).reason, 'trial');
    assert.deepEqual(getAccess({ githubId: '1', trialEndsAt: new Date(now - 1000) }, now), { allowed: false, reason: 'none' });
    assert.equal(getAccess({ githubId: '1' }, now).allowed, false);
  });

  test('canceled subscribers fall back to their trial state', () => {
    assert.equal(getAccess({ githubId: '1', billing: { status: 'canceled' }, trialEndsAt: new Date(now - day) }, now).allowed, false);
  });

  test('trials last 14 days', () => {
    assert.equal(trialEndFrom(now).getTime() - now.getTime(), 14 * day);
  });
});

test('prices come only from the server allowlist', () => {
  assert.equal(priceIdFor('month'), 'price_m');
  assert.equal(priceIdFor('year'), 'price_y');
  assert.equal(priceIdFor('price_m'), null);
  assert.equal(priceIdFor('__proto__'), null);
});

test('publicAccess exposes no Stripe IDs', () => {
  const access = publicAccess({ githubId: '1', billing: { status: 'active', customerId: 'cus_secret', subscriptionId: 'sub_secret', priceId: 'price_y' } }, now);
  assert.equal(access.plan, 'year');
  assert.equal(access.canManageBilling, true);
  assert.doesNotMatch(JSON.stringify(access), /cus_|sub_|price_/);
});

describe('resolveAICredentials', () => {
  const trialUser = (extra = {}) => ({ _id: 'u1', githubId: '1', trialEndsAt: new Date(now.getTime() + day), openaiModel: 'gpt-6-astra', ...extra });

  test('billing disabled keeps bring-your-own-key behavior', async () => {
    process.env.BILLING_ENABLED = 'false';
    process.env.OPENAI_API_KEY = 'sk-devsum';
    assert.equal((await resolveAICredentials(trialUser(), now)).apiKey, null);
    assert.equal((await resolveAICredentials(trialUser({ openaiApiKey: 'sk-own' }), now)).apiKey, 'sk-own');
  });

  test('no access means no key, even with their own key', async () => {
    const creds = await resolveAICredentials(trialUser({ trialEndsAt: new Date(now - day), openaiApiKey: 'sk-own' }), now);
    assert.deepEqual([creds.apiKey, creds.reason], [null, 'no_access']);
  });

  test("the user's own key wins and is not metered", async () => {
    process.env.OPENAI_API_KEY = 'sk-devsum';
    const creds = await resolveAICredentials(trialUser({ openaiApiKey: 'sk-own' }), now);
    assert.deepEqual([creds.apiKey, creds.metered, creds.model], ['sk-own', false, 'gpt-6-astra']);
  });

  test("DevSum's key is metered and pinned to the default model", async () => {
    process.env.OPENAI_API_KEY = 'sk-devsum';
    mock.method(AiUsage, 'tokensToday', async () => 10);
    const creds = await resolveAICredentials(trialUser(), now);
    assert.deepEqual([creds.apiKey, creds.metered, creds.model], ['sk-devsum', true, 'gpt-6-luna']);
  });

  test('the daily cap blocks metered users', async () => {
    Object.assign(process.env, { OPENAI_API_KEY: 'sk-devsum', AI_DAILY_TOKEN_CAP: '1000' });
    mock.method(AiUsage, 'tokensToday', async () => 1000);
    const creds = await resolveAICredentials(trialUser(), now);
    assert.deepEqual([creds.apiKey, creds.reason], [null, 'daily_limit']);
  });

  test('admins use DevSum\'s key unmetered and skip the cap', async () => {
    process.env.OPENAI_API_KEY = 'sk-devsum';
    const usage = mock.method(AiUsage, 'tokensToday', async () => Infinity);
    const creds = await resolveAICredentials({ _id: 'a', githubId: '586134', openaiModel: 'gpt-6-astra' }, now);
    assert.deepEqual([creds.apiKey, creds.metered, creds.model], ['sk-devsum', false, 'gpt-6-astra']);
    assert.equal(usage.mock.callCount(), 0);
  });
});
