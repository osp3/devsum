import { after, before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

process.env.ENCRYPTION_KEY ||= 'test-encryption-key';
const uri = process.env.MONGODB_TEST_URI;

describe('database', { skip: !uri && 'MONGODB_TEST_URI not set' }, () => {
  let User;
  let YesterdaySummaryService;
  const rawUser = (filter) => mongoose.connection.db.collection('users').findOne(filter);

  before(async () => {
    await mongoose.connect(uri);
    await mongoose.connection.dropDatabase();
    ({ default: User } = await import('../models/User.js'));
    ({ YesterdaySummaryService } = await import('../services/tasks/YesterdaySummaryService.js'));
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test('stores secrets encrypted and reads them decrypted', async () => {
    const user = await User.create({ githubId: '1', username: 'a', accessToken: 'gho_secret', openaiApiKey: 'sk-abc' });
    const raw = await rawUser({ _id: user._id });
    assert.match(raw.accessToken, /^enc:v1:/);
    assert.match(raw.openaiApiKey, /^enc:v1:/);

    const found = await User.findById(user._id).select('+accessToken +openaiApiKey');
    assert.equal(found.accessToken, 'gho_secret');
    assert.equal(found.openaiApiKey, 'sk-abc');
  });

  test('encrypts legacy plaintext secrets once', async () => {
    await mongoose.connection.db.collection('users')
      .insertOne({ githubId: '2', username: 'legacy', accessToken: 'gho_plain', openaiApiKey: 'sk-plain' });

    assert.equal(await User.encryptLegacySecrets(), 1);
    assert.equal(await User.encryptLegacySecrets(), 0);

    const raw = await rawUser({ githubId: '2' });
    assert.match(raw.accessToken, /^enc:v1:/);
    const found = await User.findByGithubId('2').select('+accessToken +openaiApiKey');
    assert.equal(found.accessToken, 'gho_plain');
    assert.equal(found.openaiApiKey, 'sk-plain');
  });

  test('generates a non-AI summary when the user has no OpenAI key', async () => {
    const service = new YesterdaySummaryService('token', 'no-key-user');
    const now = new Date();
    service.githubService = {
      getUserRepos: async () => [{ id: 1, name: 'r1', fullName: 'me/r1', pushedAt: now.toISOString() }],
      getRecentActivity: async (repos) => repos.map(repo => ({
        repo,
        commits: [{ sha: 'abc1234', message: 'fix: bug', parents: [{}], author: { name: 'Dev', date: now.toISOString() } }],
        pullRequests: [{ number: 3, title: 'Fix bug', url: 'https://github.com/me/r1/pull/3', action: 'merged', author: 'dev', repository: 'r1' }]
      }))
    };
    service.aiService = {
      analyzeCommitDiff: async () => assert.fail('AI must not be called without a key'),
      generateDailySummary: async () => assert.fail('AI must not be called without a key')
    };

    const result = await service.generateSummary(false, null, undefined, 'UTC');
    assert.equal(result.commitCount, 1);
    assert.ok(result.summary.length > 0);
    assert.equal(result.pullRequests[0].number, 3);

    const cached = await service.generateSummary(false, null, undefined, 'UTC');
    assert.equal(cached.pullRequests[0].title, 'Fix bug', 'pull requests are persisted with the cached summary');
  });

  describe('morning brief job', () => {
    const now = new Date('2026-09-30T12:00:00Z');
    let summaryCalls;
    let taskCalls;

    before(async () => {
      await User.deleteMany({});
      const hour = 60 * 60 * 1000;
      await User.create([
        { githubId: '10', username: 'tokyo', accessToken: 't', openaiApiKey: 'sk-1', timeZone: 'Asia/Tokyo', lastActiveAt: now },
        { githubId: '11', username: 'hawaii', accessToken: 't', timeZone: 'Pacific/Honolulu', lastActiveAt: now },
        { githubId: '12', username: 'stale', accessToken: 't', timeZone: 'Asia/Tokyo', lastActiveAt: new Date(now - 8 * 24 * hour) },
        { githubId: '13', username: 'no-zone', accessToken: 't', lastActiveAt: now }
      ]);

      const { default: AIService } = await import('../services/ai/AICoordinator.js');
      summaryCalls = mock.method(YesterdaySummaryService.prototype, 'generateSummary', async function (force, apiKey, model, timeZone) {
        return { formattedCommits: { allCommits: [{ sha: 'x' }] }, apiKey, timeZone };
      });
      taskCalls = mock.method(AIService, 'generateTaskSuggestions', async () => []);
    });

    after(() => mock.restoreAll());

    test('builds briefs only for active users past their local brief hour', async () => {
      const { runMorningBriefs } = await import('../services/tasks/MorningBriefJob.js');
      // 12:00 UTC is 21:00 in Tokyo (due) and 02:00 in Honolulu (not yet)
      const stats = await runMorningBriefs(now);

      assert.deepEqual(stats, { eligible: 1, built: 1, failed: 0 });
      assert.equal(summaryCalls.mock.callCount(), 1);
      const [force, apiKey, , timeZone] = summaryCalls.mock.calls[0].arguments;
      assert.equal(force, false);
      assert.equal(apiKey, 'sk-1');
      assert.equal(timeZone, 'Asia/Tokyo');
      assert.equal(taskCalls.mock.callCount(), 1);
    });

    test('skips task suggestions for users without an OpenAI key', async () => {
      const { runMorningBriefs } = await import('../services/tasks/MorningBriefJob.js');
      summaryCalls.mock.resetCalls();
      taskCalls.mock.resetCalls();
      // 22:00 UTC is 07:00 in Tokyo and 12:00 in Honolulu, so both users are due
      const stats = await runMorningBriefs(new Date('2026-09-30T22:00:00Z'));

      assert.equal(stats.eligible, 2);
      assert.equal(summaryCalls.mock.callCount(), 2);
      assert.equal(taskCalls.mock.callCount(), 1);
    });

    test('skips users without access while billing is enabled', async () => {
      const { runMorningBriefs } = await import('../services/tasks/MorningBriefJob.js');
      process.env.BILLING_ENABLED = 'true';
      try {
        await User.updateOne({ username: 'tokyo' }, { $set: { trialEndsAt: new Date('2026-10-01T00:00:00Z') } });
        await User.updateOne({ username: 'hawaii' }, { $set: { trialEndsAt: new Date('2026-09-01T00:00:00Z') } });
        const stats = await runMorningBriefs(new Date('2026-09-30T22:00:00Z'));
        assert.equal(stats.eligible, 1, 'only the user still in their trial is eligible');
      } finally {
        delete process.env.BILLING_ENABLED;
      }
    });
  });

  describe('billing', () => {
    let AiUsage;
    let handleStripeEvent;
    const subscriptionEvent = (type, created, subscription) => ({
      id: `evt_${created}`, type, created,
      data: { object: { customer: 'cus_db', metadata: {}, items: { data: [{ price: { id: 'price_m' }, current_period_end: created + 1000 }] }, ...subscription } },
    });

    before(async () => {
      ({ default: AiUsage } = await import('../models/AiUsage.js'));
      ({ handleStripeEvent } = await import('../services/billing/StripeEvents.js'));
      await User.deleteMany({});
      await User.create({ githubId: '20', username: 'payer', accessToken: 't', billing: { customerId: 'cus_db' } });
    });

    const billing = async () => (await User.findOne({ username: 'payer' }).lean()).billing;

    test('startPendingTrials only touches users without a trial', async () => {
      await User.create([
        { githubId: '21', username: 'old-user', accessToken: 't' },
        { githubId: '22', username: 'trialing', accessToken: 't', trialEndsAt: new Date('2026-01-01') },
      ]);
      const trialEndsAt = new Date('2026-10-21T00:00:00Z');

      assert.equal(await User.startPendingTrials(trialEndsAt), 2, 'payer and old-user get a trial');
      assert.equal(await User.startPendingTrials(new Date('2030-01-01')), 0);
      assert.deepEqual((await User.findOne({ username: 'old-user' })).trialEndsAt, trialEndsAt);
      assert.deepEqual((await User.findOne({ username: 'trialing' })).trialEndsAt, new Date('2026-01-01'));
    });

    test('newer subscription events win over late older ones', async () => {
      await handleStripeEvent(subscriptionEvent('customer.subscription.updated', 2000, { id: 'sub_1', status: 'past_due' }));
      await handleStripeEvent(subscriptionEvent('customer.subscription.created', 1000, { id: 'sub_1', status: 'incomplete' }));
      assert.equal((await billing()).status, 'past_due');
      assert.deepEqual((await billing()).currentPeriodEnd, new Date(3000 * 1000));
    });

    test('a late cancel for a replaced subscription does not cancel the new one', async () => {
      await handleStripeEvent(subscriptionEvent('customer.subscription.deleted', 3000, { id: 'sub_1', status: 'canceled' }));
      await handleStripeEvent(subscriptionEvent('customer.subscription.created', 4000, { id: 'sub_2', status: 'active' }));
      await handleStripeEvent(subscriptionEvent('customer.subscription.deleted', 4000, { id: 'sub_1', status: 'canceled' }));
      const state = await billing();
      assert.deepEqual([state.subscriptionId, state.status], ['sub_2', 'active']);
    });

    test('checkout completion links the customer only when none is set', async () => {
      const user = await User.findOne({ username: 'old-user' });
      const session = (customer) => ({ id: 'evt_c', type: 'checkout.session.completed', created: 1, data: { object: { mode: 'subscription', customer, client_reference_id: String(user._id) } } });
      await handleStripeEvent(session('cus_first'));
      await handleStripeEvent(session('cus_second'));
      assert.equal((await User.findById(user._id)).billing.customerId, 'cus_first');
    });

    test('AI usage accumulates per user per UTC day', async () => {
      await AiUsage.init();
      const user = await User.findOne({ username: 'payer' });
      const day1 = new Date('2026-10-07T23:59:00Z');
      await Promise.all([AiUsage.record(user._id, 100, day1), AiUsage.record(user._id, 50, day1)]);
      assert.equal(await AiUsage.tokensToday(user._id, day1), 150);
      assert.equal(await AiUsage.tokensToday(user._id, new Date('2026-10-08T00:01:00Z')), 0);
    });
  });
});
