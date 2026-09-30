import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YesterdaySummaryService } from '../services/tasks/YesterdaySummaryService.js';

const start = new Date('2026-09-29T00:00:00Z');
const end = new Date('2026-09-29T23:59:59.999Z');

const repo = (i, pushedAt) => ({ id: i, name: `r${i}`, fullName: `me/r${i}`, pushedAt });
const commit = (sha, parents = [{}]) => ({
  sha, message: `work ${sha}`, parents, author: { name: 'Dev', date: '2026-09-29T10:00:00Z' }
});

const createService = ({ commitsFor = (name) => [commit(`${name}-sha`)] } = {}) => {
  const service = new YesterdaySummaryService('token', 'user-1');
  const calls = { getCommits: [], analyze: [] };
  let inflight = 0;
  calls.peak = 0;
  service.githubService = {
    getCommits: async (owner, name) => {
      calls.getCommits.push(name);
      calls.peak = Math.max(calls.peak, ++inflight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inflight--;
      return commitsFor(name);
    },
    getCommitDiff: async () => ({ files: [{ patch: '+line' }] })
  };
  service.aiService = {
    analyzeCommitDiff: async (c, diff, apiKey, model) => {
      calls.analyze.push({ apiKey, model });
      return { suggestedMessage: 'feat: change', confidence: 0.9 };
    }
  };
  return { service, calls };
};

test('uses a per-user repository id', () => {
  assert.equal(new YesterdaySummaryService('token', 'user-1').repositoryId, 'ALL_REPOS:user-1');
});

test('skips repositories not pushed since the window started', async () => {
  const { service, calls } = createService();
  const repos = [repo(1, '2026-09-29T12:00:00Z'), repo(2, '2026-09-01T00:00:00Z'), repo(3, undefined)];
  const { repositoryData } = await service.fetchAllCommits(repos, start, end);
  assert.deepEqual(calls.getCommits.sort(), ['r1', 'r3']);
  assert.deepEqual(repositoryData.map((r) => r.name), ['r1', 'r3']);
});

test('limits concurrent repository fetches', async () => {
  const { service, calls } = createService();
  const repos = Array.from({ length: 12 }, (_, i) => repo(i, '2026-09-29T12:00:00Z'));
  await service.fetchAllCommits(repos, start, end);
  assert.equal(calls.getCommits.length, 12);
  assert.ok(calls.peak <= 4, `peak concurrency ${calls.peak}`);
});

test("passes the user's key and model to commit analysis", async () => {
  const { service, calls } = createService();
  const { commits } = await service.fetchAllCommits([repo(1, '2026-09-29T12:00:00Z')], start, end, 'sk-user', 'gpt-6-luna');
  assert.equal(commits.length, 1);
  assert.deepEqual(calls.analyze, [{ apiKey: 'sk-user', model: 'gpt-6-luna' }]);
});

test('skips AI analysis without a key', async () => {
  const { service, calls } = createService();
  const { commits } = await service.fetchAllCommits([repo(1, '2026-09-29T12:00:00Z')], start, end, null);
  assert.equal(commits.length, 1);
  assert.equal(calls.analyze.length, 0);
});

test('drops merge commits and repositories without commits', async () => {
  const { service } = createService({
    commitsFor: (name) => (name === 'r1' ? [commit('merge', [{}, {}]), commit('real')] : [])
  });
  const repos = [repo(1, '2026-09-29T12:00:00Z'), repo(2, '2026-09-29T12:00:00Z')];
  const { commits, repositoryData } = await service.fetchAllCommits(repos, start, end);
  assert.equal(commits.length, 1);
  assert.deepEqual(repositoryData.map((r) => r.name), ['r1']);
});
