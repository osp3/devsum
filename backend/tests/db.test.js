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
  });
});
