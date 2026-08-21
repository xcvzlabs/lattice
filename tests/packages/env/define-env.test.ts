import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { defineEnv } from '~/packages/env/define-env.ts';
import { EnvValidationError } from '~/packages/env/errors.ts';

describe('defineEnv', () => {
  it('parses a flat schema against the given source', () => {
    const env = defineEnv({
      schema: v.object({
        port: v.pipe(v.string(), v.toNumber()),
      }),
      source: { PORT: '3000' },
    });

    expect(env).toEqual({ port: 3000 });
  });

  it('maps nested object schemas to underscore-joined env var names', () => {
    const env = defineEnv({
      schema: v.object({
        db: v.object({
          host: v.string(),
          ssl: v.pipe(v.string(), v.toBoolean()),
        }),
      }),
      source: { DB_HOST: 'localhost', DB_SSL: 'true' },
    });

    expect(env).toEqual({ db: { host: 'localhost', ssl: true } });
  });

  it('maps camelCase keys to screaming-snake-case env var names', () => {
    const env = defineEnv({
      schema: v.object({
        apiBaseUrl: v.string(),
      }),
      source: { API_BASE_URL: 'https://example.com' },
    });

    expect(env).toEqual({ apiBaseUrl: 'https://example.com' });
  });

  it('throws EnvValidationError when a required env var is missing', () => {
    expect(() =>
      defineEnv({
        schema: v.object({ db: v.object({ host: v.string() }) }),
        source: {},
      }),
    ).toThrow(EnvValidationError);
  });

  it('reports every failing env var, not just the first', () => {
    expect.assertions(2);

    try {
      defineEnv({
        schema: v.object({
          db: v.object({
            host: v.string(),
            port: v.pipe(v.string(), v.toNumber()),
          }),
        }),
        source: {},
      });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      if (error instanceof EnvValidationError) {
        const envVars = error.issues.map((issue) => issue.envVar);
        expect(envVars).toEqual(expect.arrayContaining(['DB_HOST', 'DB_PORT']));
      }
    }
  });

  it('reads from Bun.env when no source is given', () => {
    Bun.env.LATTICE_ENV_TEST_VALUE = 'from-bun-env';

    try {
      const env = defineEnv({
        schema: v.object({ latticeEnvTestValue: v.string() }),
      });

      expect(env).toEqual({ latticeEnvTestValue: 'from-bun-env' });
    } finally {
      delete Bun.env.LATTICE_ENV_TEST_VALUE;
    }
  });
});
