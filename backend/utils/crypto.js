import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

let cachedKey;
const getKey = () => {
  if (!cachedKey) {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret) throw new Error('ENCRYPTION_KEY environment variable is required');
    cachedKey = crypto.createHash('sha256').update(secret).digest();
  }
  return cachedKey;
};

export const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

export const encryptSecret = (plain) => {
  if (!plain || isEncrypted(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join(':');
};

// Plaintext values written before encryption was added are returned as-is
export const decryptSecret = (value) => {
  if (!isEncrypted(value)) return value;
  try {
    const [iv, tag, data] = value.slice(PREFIX.length).split(':').map((part) => Buffer.from(part, 'base64'));
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (error) {
    console.error('❌ Failed to decrypt secret:', error.message);
    return null;
  }
};
