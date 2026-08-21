import { defineConfig } from 'drizzle-kit';
import { env } from './server/utils/env.ts';

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: env.db,
  introspect: {
    casing: 'camel',
  },
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
  verbose: true,
});
