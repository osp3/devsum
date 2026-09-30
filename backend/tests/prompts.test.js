import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSummaryPrompt } from '../services/prompts/SummaryPromptBuilder.js';
import { createWorkSignature, groupByCategory } from '../services/prompts/PromptUtils.js';
import { formatCommitObject } from '../utils/CommitFormatter.js';

const repo = { name: 'devsum', fullName: 'me/devsum' };
const commits = [
  formatCommitObject({ sha: 'aaaaaaa1', message: 'fix: login bug\n\ndetails', author: { name: 'Dev' } }, repo),
  formatCommitObject({ sha: 'bbbbbbb2', message: 'add dashboard', author: { name: 'Dev' } }, repo)
];

test('formatted commits carry their first-line message', () => {
  assert.equal(commits[0].message, 'fix: login bug');
  assert.equal(commits[1].message, 'add dashboard');
});

test('summary prompt includes commit messages and pull requests', () => {
  const prompt = createSummaryPrompt(commits, [
    { number: 12, title: 'Ship brief', action: 'merged', author: 'dev', repository: 'devsum' }
  ]);
  assert.ok(prompt.includes('fix: login bug'));
  assert.ok(!prompt.includes('undefined'));
  assert.ok(prompt.includes('MERGED: #12 "Ship brief" by dev (devsum)'));
});

test('summary prompt omits the pull request section when there are none', () => {
  assert.ok(!createSummaryPrompt(commits).includes('PULL REQUEST ACTIVITY'));
});

test('commits are grouped by their conventional type', () => {
  assert.deepEqual(Object.keys(groupByCategory(commits)).sort(), ['feat', 'fix']);
});

test('work signature differs for different commits with the same shape', () => {
  const other = commits.map((c, i) => ({ ...c, sha: `other${i}` }));
  assert.notEqual(createWorkSignature(commits), createWorkSignature(other));
  assert.equal(createWorkSignature(commits), createWorkSignature([...commits].reverse()));
});
