import { describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey } from '~/apps/gateway/server/auth/api-keys.ts';

describe('generateApiKey', () => {
  it('produces a key with the lattice_sk_ prefix', () => {
    const { key } = generateApiKey();
    expect(key.startsWith('lattice_sk_')).toBe(true);
  });

  it('returns a prefix that is a prefix of the full key', () => {
    const { key, prefix } = generateApiKey();
    expect(key.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(key.length);
  });

  it('generates a different key on every call', () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.key).not.toBe(second.key);
  });
});

describe('hashApiKey', () => {
  it('is deterministic for the same key and pepper', () => {
    const hashOne = hashApiKey('lattice_sk_abc', 'pepper-one');
    const hashTwo = hashApiKey('lattice_sk_abc', 'pepper-one');
    expect(hashOne).toBe(hashTwo);
  });

  it('produces a 64-character hex digest', () => {
    const hash = hashApiKey('lattice_sk_abc', 'pepper-one');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs when the key changes', () => {
    const hashOne = hashApiKey('lattice_sk_abc', 'pepper-one');
    const hashTwo = hashApiKey('lattice_sk_def', 'pepper-one');
    expect(hashOne).not.toBe(hashTwo);
  });

  it('differs when the pepper changes', () => {
    const hashOne = hashApiKey('lattice_sk_abc', 'pepper-one');
    const hashTwo = hashApiKey('lattice_sk_abc', 'pepper-two');
    expect(hashOne).not.toBe(hashTwo);
  });
});
