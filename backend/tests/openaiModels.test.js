import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OPENAI_MODEL, isSupportedModel, listModels, resolveModel } from '../config/openaiModels.js';

test('falls back to the default for unsupported or inherited names', () => {
  assert.equal(resolveModel('gpt-4o-mini'), DEFAULT_OPENAI_MODEL);
  assert.equal(resolveModel('toString'), DEFAULT_OPENAI_MODEL);
  assert.equal(resolveModel(undefined), DEFAULT_OPENAI_MODEL);
  assert.equal(isSupportedModel('__proto__'), false);
});

test('lists every supported model', () => {
  const models = listModels();
  assert.ok(models.every(({ value }) => isSupportedModel(value) && resolveModel(value) === value));
});
