import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRecentActivity } from '../services/external/GitHubAPIClient.js';

const since = new Date('2026-09-29T00:00:00Z');
const until = new Date('2026-09-29T23:59:59.999Z');
const repos = (count) => Array.from({ length: count }, (_, i) => ({ id: i, name: `r${i}`, fullName: `me/r${i}` }));

const repoNode = ({ commits = [], pullRequests = [] } = {}) => ({
  defaultBranchRef: { target: { history: { nodes: commits } } },
  pullRequests: { nodes: pullRequests }
});

const fakeOctokit = (respond) => {
  const calls = [];
  return {
    calls,
    graphql: async (query, variables) => {
      calls.push({ query, variables });
      return respond(query, variables);
    }
  };
};

test('batches repositories and passes names as variables', async () => {
  const octokit = fakeOctokit((query, variables) =>
    Object.fromEntries(Object.keys(variables).filter((k) => /^o\d+$/.test(k)).map((k) => [`r${k.slice(1)}`, repoNode()])));

  const result = await getRecentActivity(octokit, repos(45), since, until);

  assert.equal(octokit.calls.length, 3);
  assert.equal(result.length, 45);
  assert.deepEqual(result.map((r) => r.repo.name), repos(45).map((r) => r.name));
  const { query, variables } = octokit.calls[0];
  assert.equal(variables.since, since.toISOString());
  assert.equal(variables.o0, 'me');
  assert.equal(variables.n0, 'r0');
  assert.ok(!query.includes('"me"'), 'repository names must not be interpolated into the query');
});

test('maps commits to the REST commit shape', async () => {
  const octokit = fakeOctokit(() => ({
    r0: repoNode({
      commits: [
        { oid: 'abc123', message: 'feat: x\n\nbody', author: { name: 'Dev', date: '2026-09-29T10:00:00Z' }, parents: { totalCount: 1 } },
        { oid: 'def456', message: 'Merge branch', author: { name: 'Dev', date: '2026-09-29T11:00:00Z' }, parents: { totalCount: 2 } }
      ]
    })
  }));

  const [{ commits }] = await getRecentActivity(octokit, repos(1), since, until);
  assert.deepEqual(commits[0], {
    sha: 'abc123', message: 'feat: x\n\nbody', author: { name: 'Dev', date: '2026-09-29T10:00:00Z' }, parents: [{}]
  });
  assert.equal(commits[1].parents.length, 2);
});

test('keeps only pull requests opened, merged or closed in the range', async () => {
  const base = { title: 't', url: 'u', author: { login: 'dev' } };
  const octokit = fakeOctokit(() => ({
    r0: repoNode({
      pullRequests: [
        { ...base, number: 1, createdAt: '2026-09-20T00:00:00Z', mergedAt: '2026-09-29T09:00:00Z', closedAt: '2026-09-29T09:00:00Z' },
        { ...base, number: 2, createdAt: '2026-09-29T08:00:00Z', mergedAt: null, closedAt: null },
        { ...base, number: 3, createdAt: '2026-09-20T00:00:00Z', mergedAt: null, closedAt: '2026-09-29T08:00:00Z' },
        { ...base, number: 4, createdAt: '2026-09-20T00:00:00Z', mergedAt: null, closedAt: null },
        { ...base, number: 5, createdAt: '2026-09-30T00:00:00Z', mergedAt: null, closedAt: null, author: null }
      ]
    })
  }));

  const [{ pullRequests }] = await getRecentActivity(octokit, repos(1), since, until);
  assert.deepEqual(pullRequests.map((p) => [p.number, p.action]), [[1, 'merged'], [2, 'opened'], [3, 'closed']]);
  assert.deepEqual(pullRequests[0], { number: 1, title: 't', url: 'u', action: 'merged', author: 'dev', repository: 'r0' });
});

test('uses partial data when some repositories fail', async () => {
  const octokit = fakeOctokit(() => {
    const error = new Error('Could not resolve to a Repository');
    error.data = { r0: repoNode({ commits: [{ oid: 'a', message: 'm', author: {}, parents: { totalCount: 1 } }] }), r1: null };
    throw error;
  });

  const result = await getRecentActivity(octokit, repos(2), since, until);
  assert.equal(result[0].commits.length, 1);
  assert.deepEqual(result[1], { repo: repos(2)[1], commits: [], pullRequests: [] });
});

test('rethrows errors without data', async () => {
  const octokit = fakeOctokit(() => { throw Object.assign(new Error('Bad credentials'), { status: 401 }); });
  await assert.rejects(getRecentActivity(octokit, repos(1), since, until));
});
