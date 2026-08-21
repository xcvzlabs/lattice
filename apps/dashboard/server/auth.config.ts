import { defineServerAuth } from '@nuxtjs/better-auth/config';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '~~/server/database/client.ts';
import * as schema from '~~/server/database/schema.ts';

const ONE_HOUR_SECONDS = 60 * 60;

export default defineServerAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  // Every session here is a full admin over every application (see .github/SECURITY.md) — a
  // shorter, explicit lifetime is worth more here than in a typical multi-tenant app, and
  // stating it explicitly means a future change to better-auth's own defaults can't quietly
  // loosen it.
  session: {
    expiresIn: 12 * ONE_HOUR_SECONDS,
    updateAge: ONE_HOUR_SECONDS,
  },
  // better-auth already defaults this to `true` in production; stated explicitly so the
  // intent doesn't depend on that default staying unchanged.
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
});
