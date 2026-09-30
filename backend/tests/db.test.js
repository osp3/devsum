import { after, before, describe, test } from 'node:test';
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
      getCommits: async () => [{ sha: 'abc1234', message: 'fix: bug', parents: [{}], author: { name: 'Dev', date: now.toISOString() } }]
    };
    service.aiService = {
      analyzeCommitDiff: async () => assert.fail('AI must not be called without a key'),
      generateDailySummary: async () => assert.fail('AI must not be called without a key')
    };

    const result = await service.generateSummary(false, null, undefined, 'UTC');
    assert.equal(result.commitCount, 1);
    assert.ok(result.summary.length > 0);
  });
});
