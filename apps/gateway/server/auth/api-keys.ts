import { createHmac, randomBytes } from 'node:crypto';

export type GeneratedApiKey = {
  key: string;
  prefix: string;
};

const KEY_BYTE_LENGTH = 32;
const KEY_PREFIX = 'lattice_sk_';
const DISPLAY_PREFIX_LENGTH = 12;

/** Generates a high-entropy, opaque API key. The raw key is never stored, only its hash. */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(KEY_BYTE_LENGTH).toString('base64url');
  const key = `${KEY_PREFIX}${secret}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + DISPLAY_PREFIX_LENGTH) };
}

/** HMAC-SHA256 keeps the hash one-way even for someone holding both the pepper and a DB dump. */
export function hashApiKey(key: string, pepper: string): string {
  return createHmac('sha256', pepper).update(key).digest('hex');
}
