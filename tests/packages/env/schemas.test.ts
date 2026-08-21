import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { booleanEnvSchema } from '~/packages/env/schemas.ts';

describe('booleanEnvSchema', () => {
  it('parses "true" as true', () => {
    expect(v.parse(booleanEnvSchema, 'true')).toBe(true);
  });

  it('parses "false" as false', () => {
    expect(v.parse(booleanEnvSchema, 'false')).toBe(false);
  });

  it('rejects any other string, unlike a plain Boolean() coercion', () => {
    expect(() => v.parse(booleanEnvSchema, 'no')).toThrow();
    expect(() => v.parse(booleanEnvSchema, '')).toThrow();
    expect(() => v.parse(booleanEnvSchema, '0')).toThrow();
  });
});
