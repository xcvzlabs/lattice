import { defineConfig } from 'nitro';

export default defineConfig({
  compatibilityDate: '2026-08-21',
  serverDir: './server',
  preset: 'bun',
  errorHandler: './server/utils/error-handler.ts',
  handlers: [
    {
      route: '/v1/**',
      handler: './server/handlers/auth-middleware.ts',
      middleware: true,
    },
    {
      route: '/v1/**',
      handler: './server/handlers/rate-limit-middleware.ts',
      middleware: true,
    },
  ],
});
