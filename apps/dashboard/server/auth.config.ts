import { defineServerAuth } from '@nuxtjs/better-auth/config';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '~~/server/database/client.ts';
import * as schema from '~~/server/database/schema.ts';

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
});
