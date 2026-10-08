import { after, afterEach, before, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Stripe from 'stripe';

process.env.ENCRYPTION_KEY ||= 'test-encryption-key';
const { default: User } = await import('../models/User.js');
const { default: AiUsage } = await import('../models/AiUsage.js');
const { stripeClient } = await import('../services/external/StripeClient.js');
const { default: billingRoutes } = await import('../routes/billing.js');
const { default: stripeWebhookRoutes } = await import('../routes/stripeWebhook.js');
const { aiAccess } = await import('../middleware/aiAccess.js');
const { recordUsage } = await import('../services/billing/aiCredentials.js');

const USER_ID = '64b7f0c2a1b2c3d4e5f60718';
const WEBHOOK_SECRET = 'whsec_test';
let server;
let baseUrl;
let currentUser;
let stripeCalls;

before(async () => {
  const app = express();
  app.use('/webhooks/stripe', stripeWebhookRoutes);
  app.use(express.json());
  app.use((req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { _id: USER_ID };
    next();
  });
  app.use('/api/billing', billingRoutes);
  app.post('/ai', aiAccess(), (req, res) => {
    recordUsage(50);
    res.json({ apiKey: req.ai.apiKey, metered: req.ai.metered });
  });
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  Object.assign(process.env, {
    BILLING_ENABLED: 'true', ADMIN_GITHUB_IDS: '586134', STRIPE_PRICE_MONTHLY: 'price_m', STRIPE_PRICE_YEARLY: 'price_y',
    FRONTEND_URL: 'https://devsum.xyz/', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET, OPENAI_API_KEY: 'sk-devsum',
  });
  currentUser = { _id: USER_ID, githubId: '1', username: 'dev', email: 'dev@example.com', trialEndsAt: new Date(Date.now() + 60_000) };
  stripeCalls = { customers: [], sessions: [], portal: [] };
  // Route logs on stdout can corrupt the node:test IPC stream (nodejs/node#64061)
  mock.method(console, 'log', () => {});
  mock.method(console, 'error', () => {});
  mock.method(User, 'findById', () => {
    const result = Promise.resolve(currentUser);
    result.select = () => Promise.resolve(currentUser);
    return result;
  });
  mock.method(User, 'updateOne', async () => ({ modifiedCount: 1 }));
  mock.method(stripeClient, 'get', () => ({
    customers: { create: async (params, options) => { stripeCalls.customers.push({ params, options }); return { id: 'cus_new' }; } },
    checkout: { sessions: { create: async (params) => { stripeCalls.sessions.push(params); return { url: 'https://checkout.stripe.com/c/pay/cs_test' }; } } },
    billingPortal: { sessions: { create: async (params) => { stripeCalls.portal.push(params); return { url: 'https://billing.stripe.com/p/session' }; } } },
  }));
});

afterEach(() => mock.restoreAll());

const post = (path, body) => fetch(`${baseUrl}${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
});

test('billing routes 404 while billing is disabled', async () => {
  process.env.BILLING_ENABLED = 'false';
  assert.equal((await post('/api/billing/checkout', { interval: 'month' })).status, 404);
});

test('checkout rejects anything but month or year', async () => {
  for (const interval of [undefined, 'week', 'price_m']) {
    assert.equal((await post('/api/billing/checkout', { interval })).status, 400);
  }
  assert.equal(stripeCalls.sessions.length, 0);
});

test('checkout creates the customer once and a Managed Payments subscription session', async () => {
  const res = await post('/api/billing/checkout', { interval: 'year' });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.url, 'https://checkout.stripe.com/c/pay/cs_test');

  const [{ params, options }] = stripeCalls.customers;
  assert.equal(params.metadata.userId, USER_ID);
  assert.equal(options.idempotencyKey, `customer-${USER_ID}`);

  const [session] = stripeCalls.sessions;
  assert.equal(session.mode, 'subscription');
  assert.equal(session.customer, 'cus_new');
  assert.equal(session.client_reference_id, USER_ID);
  assert.deepEqual(session.line_items, [{ price: 'price_y', quantity: 1 }]);
  assert.deepEqual(session.managed_payments, { enabled: true });
  assert.equal(session.subscription_data.metadata.userId, USER_ID);
  assert.equal(session.success_url, 'https://devsum.xyz/dashboard?checkout=success');
});

test('checkout reuses an existing customer', async () => {
  currentUser.billing = { customerId: 'cus_existing', status: 'canceled' };
  await post('/api/billing/checkout', { interval: 'month' });
  assert.equal(stripeCalls.customers.length, 0);
  assert.equal(stripeCalls.sessions[0].customer, 'cus_existing');
});

test('admins and paying users cannot start a checkout', async () => {
  currentUser.githubId = '586134';
  assert.equal((await post('/api/billing/checkout', { interval: 'month' })).status, 409);
  currentUser.githubId = '1';
  currentUser.billing = { status: 'active', customerId: 'cus_1' };
  assert.equal((await post('/api/billing/checkout', { interval: 'month' })).status, 409);
});

test('portal needs a Stripe customer', async () => {
  assert.equal((await post('/api/billing/portal')).status, 400);
  currentUser.billing = { customerId: 'cus_1' };
  const res = await post('/api/billing/portal');
  assert.equal(res.status, 200);
  assert.equal(stripeCalls.portal[0].return_url, 'https://devsum.xyz/settings');
});

const sendEvent = (event, { secret = WEBHOOK_SECRET, signature } = {}) => {
  const payload = JSON.stringify(event);
  return fetch(`${baseUrl}/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature ?? Stripe.webhooks.generateTestHeaderString({ payload, secret }) },
    body: payload,
  });
};

const subscriptionEvent = (type, overrides = {}) => ({
  id: 'evt_1', type, created: 1_791_000_000,
  data: { object: { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { userId: USER_ID }, items: { data: [{ price: { id: 'price_m' }, current_period_end: 1_793_000_000 }] }, ...overrides } },
});

test('webhook rejects bad signatures and returns 503 without a secret', async () => {
  assert.equal((await sendEvent(subscriptionEvent('customer.subscription.updated'), { secret: 'whsec_wrong' })).status, 400);
  assert.equal((await sendEvent(subscriptionEvent('customer.subscription.updated'), { signature: 'garbage' })).status, 400);
  delete process.env.STRIPE_WEBHOOK_SECRET;
  assert.equal((await sendEvent(subscriptionEvent('customer.subscription.updated'))).status, 503);
  assert.equal(User.updateOne.mock.callCount(), 0);
});

test('subscription events overwrite billing state with ordering guards', async () => {
  assert.equal((await sendEvent(subscriptionEvent('customer.subscription.updated', { status: 'past_due' }))).status, 200);

  const [filter, update] = User.updateOne.mock.calls[0].arguments;
  assert.deepEqual(filter.$and[1].$or[1], { 'billing.updatedAt': { $lte: new Date(1_791_000_000 * 1000) } });
  assert.equal(update.$set['billing.status'], 'past_due');
  assert.equal(update.$set['billing.priceId'], 'price_m');
  assert.deepEqual(update.$set['billing.currentPeriodEnd'], new Date(1_793_000_000 * 1000));
});

test('deleted subscriptions are stored as canceled', async () => {
  await sendEvent(subscriptionEvent('customer.subscription.deleted'));
  assert.equal(User.updateOne.mock.calls[0].arguments[1].$set['billing.status'], 'canceled');
});

test('checkout.session.completed ignores invalid user references', async () => {
  const event = { id: 'evt_2', type: 'checkout.session.completed', created: 1, data: { object: { mode: 'subscription', customer: 'cus_1', client_reference_id: 'not-an-id' } } };
  assert.equal((await sendEvent(event)).status, 200);
  assert.equal(User.updateOne.mock.callCount(), 0);
});

test('aiAccess returns 402 after the trial and 429 at the daily cap', async () => {
  currentUser.trialEndsAt = new Date(Date.now() - 1000);
  const expired = await post('/ai');
  assert.equal(expired.status, 402);
  assert.equal((await expired.json()).code, 'subscription_required');

  currentUser.trialEndsAt = new Date(Date.now() + 60_000);
  process.env.AI_DAILY_TOKEN_CAP = '100';
  mock.method(AiUsage, 'tokensToday', async () => 100);
  const capped = await post('/ai');
  assert.equal(capped.status, 429);
  assert.equal((await capped.json()).code, 'daily_limit');
  delete process.env.AI_DAILY_TOKEN_CAP;
});

test('aiAccess meters usage on DevSum\'s key for the rest of the request', async () => {
  mock.method(AiUsage, 'tokensToday', async () => 0);
  const record = mock.method(AiUsage, 'record', async () => ({}));
  const res = await post('/ai');
  assert.deepEqual(await res.json(), { apiKey: 'sk-devsum', metered: true });
  assert.deepEqual(record.mock.calls[0].arguments.slice(0, 2), [USER_ID, 50]);
});
