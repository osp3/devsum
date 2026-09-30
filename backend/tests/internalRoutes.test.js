import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

process.env.CRON_SECRET = 'cron-test-secret';
const { default: internalRoutes } = await import('../routes/internal.js');

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use('/internal', internalRoutes);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  baseUrl = `http://localhost:${server.address().port}/internal/morning-briefs`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const post = (authorization) => fetch(baseUrl, { method: 'POST', headers: authorization ? { authorization } : {} });

test('rejects missing and wrong secrets', async () => {
  assert.equal((await post()).status, 401);
  assert.equal((await post('Bearer wrong')).status, 401);
  assert.equal((await post('cron-test-secret-but-longer')).status, 401);
});

test('returns 503 when CRON_SECRET is not configured', async () => {
  delete process.env.CRON_SECRET;
  try {
    assert.equal((await post('Bearer anything')).status, 503);
  } finally {
    process.env.CRON_SECRET = 'cron-test-secret';
  }
});
