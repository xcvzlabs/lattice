import { booleanEnv, defineEnv } from '@xcvzlabs/env';
import * as v from 'valibot';

export const env = defineEnv({
  schema: {
    latticeGatewayUrl: v.pipe(v.string(), v.url()),
    latticeManagementApiKey: v.pipe(v.string(), v.minLength(1)),
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
