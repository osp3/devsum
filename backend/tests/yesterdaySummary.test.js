import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YesterdaySummaryService } from '../services/tasks/YesterdaySummaryService.js';

const start = new Date('2026-09-29T00:00:00Z');
const end = new Date('2026-09-29T23:59:59.999Z');

const repo = (i, pushedAt) => ({ id: i, name: `r${i}`, fullName: `me/r${i}`, pushedAt });
const commit = (sha, parents = [{}]) => ({
  sha, message: `work ${sha}`, parents, author: { name: 'Dev', date: '2026-09-29T10:00:00Z' }
});
const pr = { number: 7, title: 'Add feature', url: 'https://github.com/me/r1/pull/7', action: 'merged', author: 'dev', repository: 'r1' };

const createService = ({ commitsFor = (r) => [commit(`${r.name}-sha`)], pullRequestsFor = () => [] } = {}) => {
  const service = new YesterdaySummaryService('token', 'user-1');
  const calls = { activity: [], analyze: [] };
  service.githubService = {
    getRecentActivity: async (repos, since, until) => {
      calls.activity.push({ repos: repos.map((r) => r.name), since, until });
      return repos.map((r) => ({ repo: r, commits: commitsFor(r), pullRequests: pullRequestsFor(r) }));
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

test('fetches activity for pushed repositories in one call', async () => {
  const { service, calls } = createService();
  const repos = [repo(1, '2026-09-29T12:00:00Z'), repo(2, '2026-09-01T00:00:00Z'), repo(3, undefined)];
  const { repositoryData } = await service.fetchAllCommits(repos, start, end);
  assert.equal(calls.activity.length, 1);
  assert.deepEqual(calls.activity[0].repos, ['r1', 'r3']);
  assert.equal(calls.activity[0].since, start);
  assert.deepEqual(repositoryData.map((r) => r.name), ['r1', 'r3']);
});

test('skips the GitHub call when no repository was pushed', async () => {
  const { service, calls } = createService();
  const result = await service.fetchAllCommits([repo(1, '2026-09-01T00:00:00Z')], start, end);
  assert.equal(calls.activity.length, 0);
  assert.deepEqual(result, { commits: [], repositoryData: [], pullRequests: [] });
});

test("passes the user's key and model to commit analysis", async () => {
  const { service, calls } = createService();
  const { commits } = await service.fetchAllCommits([repo(1, '2026-09-29T12:00:00Z')], start, end, 'sk-user', 'gpt-6-luna');
  assert.equal(commits.length, 1);
  assert.equal(commits[0].message, 'work r1-sha');
  assert.deepEqual(calls.analyze, [{ apiKey: 'sk-user', model: 'gpt-6-luna' }]);
});

test('skips AI analysis without a key', async () => {
  const { service, calls } = createService();
  const { commits } = await service.fetchAllCommits([repo(1, '2026-09-29T12:00:00Z')], start, end, null);
  assert.equal(commits.length, 1);
  assert.equal(calls.analyze.length, 0);
});

test('drops merge commits and keeps pull requests from repositories without commits', async () => {
  const { service } = createService({
    commitsFor: (r) => (r.name === 'r1' ? [commit('merge', [{}, {}]), commit('real')] : []),
    pullRequestsFor: (r) => (r.name === 'r2' ? [pr] : [])
  });
  const repos = [repo(1, '2026-09-29T12:00:00Z'), repo(2, '2026-09-29T12:00:00Z')];
  const { commits, repositoryData, pullRequests } = await service.fetchAllCommits(repos, start, end);
  assert.equal(commits.length, 1);
  assert.deepEqual(repositoryData.map((r) => r.name), ['r1']);
  assert.deepEqual(pullRequests, [pr]);
});
