import { defineConfig } from 'nitro';

// No `handlers` entries for auth/rate-limit/management-auth: this version of nitro has a bug
// that crashes every request matching a route-scoped `{ route, handler, middleware: true }`
// entry (see server/middleware/02.auth.ts for the root cause). Those middleware now live under
// server/middleware/ as self-scoping global middleware instead.
export default defineConfig({
  compatibilityDate: '2026-08-21',
  serverDir: './server',
  preset: 'bun',
  errorHandler: './server/utils/error-handler.ts',
});
