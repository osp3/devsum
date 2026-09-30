import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency } from '../utils/concurrency.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('preserves input order and respects the limit', async () => {
  let inflight = 0;
  let peak = 0;
  const results = await mapWithConcurrency([30, 5, 20, 1, 10, 15], 3, async (ms, index) => {
    peak = Math.max(peak, ++inflight);
    await delay(ms);
    inflight--;
    return index;
  });
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5]);
  assert.equal(peak, 3);
});

test('handles empty input', async () => {
  assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
});

test('propagates errors', async () => {
  await assert.rejects(mapWithConcurrency([1], 2, async () => { throw new Error('boom'); }), /boom/);
});
