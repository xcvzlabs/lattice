import { defineEnv } from '@lattice/env';
import * as v from 'valibot';

export const env = defineEnv({
  schema: v.object({
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
