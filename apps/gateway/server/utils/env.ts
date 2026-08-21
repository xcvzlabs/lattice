import { defineEnv } from '@lattice/env';
import * as v from 'valibot';

const MIN_PEPPER_LENGTH = 32;

export const env = defineEnv({
  schema: v.object({
    apiKeyPepper: v.pipe(v.string(), v.minLength(MIN_PEPPER_LENGTH)),
    // minLength(1) so a present-but-blank value (e.g. `OPENAI_API_KEY=`) fails loudly at boot
    // instead of the registry silently treating an empty string as "this provider is configured".
    openaiApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    anthropicApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    googleApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    db: v.object({
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      user: v.string(),
      password: v.string(),
      ssl: v.pipe(v.string(), v.toBoolean()),
      database: v.string(),
    }),
  }),
});
