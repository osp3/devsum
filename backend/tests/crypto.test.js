import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ENCRYPTION_KEY ||= 'test-encryption-key';
const { encryptSecret, decryptSecret, isEncrypted } = await import('../utils/crypto.js');

test('round-trips a secret', () => {
  const encrypted = encryptSecret('gho_secret');
  assert.ok(isEncrypted(encrypted));
  assert.ok(!encrypted.includes('gho_secret'));
  assert.equal(decryptSecret(encrypted), 'gho_secret');
});

test('uses a random IV per encryption', () => {
  assert.notEqual(encryptSecret('same'), encryptSecret('same'));
});

test('does not double-encrypt and passes through empty values', () => {
  const encrypted = encryptSecret('value');
  assert.equal(encryptSecret(encrypted), encrypted);
  assert.equal(encryptSecret(''), '');
  assert.equal(encryptSecret(undefined), undefined);
});

test('returns legacy plaintext unchanged', () => {
  assert.equal(decryptSecret('sk-legacy'), 'sk-legacy');
});

test('rejects tampered ciphertext', () => {
  const encrypted = encryptSecret('value');
  const last = encrypted.at(-2) === 'A' ? 'B' : 'A';
  assert.equal(decryptSecret(encrypted.slice(0, -2) + last + encrypted.at(-1)), null);
});
