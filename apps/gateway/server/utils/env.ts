import { booleanEnv, defineEnv } from '@xcvzlabs/env';
import * as v from 'valibot';

const MIN_PEPPER_LENGTH = 32;

export const env = defineEnv({
  schema: {
    apiKeyPepper: v.pipe(v.string(), v.minLength(MIN_PEPPER_LENGTH)),
    openaiApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    anthropicApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    googleApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    ollamaBaseUrl: v.optional(v.pipe(v.string(), v.minLength(1))),
    ollamaApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    vllmBaseUrl: v.optional(v.pipe(v.string(), v.minLength(1))),
    vllmApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    db: {
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      user: v.string(),
      password: v.string(),
      ssl: booleanEnv,
      database: v.string(),
    },
  },
});
