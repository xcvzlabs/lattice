import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { errorEnvelopeSchema } from '~/packages/api-contract/src/schemas/error.ts';

describe('errorEnvelopeSchema', () => {
  it('accepts a well-formed envelope', () => {
    const result = v.safeParse(errorEnvelopeSchema, {
      error: { message: 'Invalid API key', type: 'authentication_error', code: 'invalid_api_key' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a null code', () => {
    const result = v.safeParse(errorEnvelopeSchema, {
      error: { message: 'Internal error', type: 'internal_error', code: null },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a missing message', () => {
    const result = v.safeParse(errorEnvelopeSchema, {
      error: { type: 'internal_error', code: null },
    });

    expect(result.success).toBe(false);
  });
});
