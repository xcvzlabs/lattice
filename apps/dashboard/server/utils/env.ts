import { booleanEnvSchema, defineEnv } from '@lattice/env';
import * as v from 'valibot';

export const env = defineEnv({
  schema: v.object({
    latticeGatewayUrl: v.pipe(v.string(), v.url()),
    latticeManagementApiKey: v.pipe(v.string(), v.minLength(1)),
    db: v.object({
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      user: v.string(),
      password: v.string(),
      ssl: booleanEnvSchema,
      database: v.string(),
    }),
  }),
});
