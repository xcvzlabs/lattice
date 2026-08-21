import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Integration tests need apps/gateway's DB credentials. Bun only auto-loads .env
// relative to the process CWD (repo root), which apps/gateway/.env isn't, so load it
// explicitly here. Guarded because CI has no checked-in .env and injects real env vars directly.
const gatewayEnvPath = fileURLToPath(new URL('./apps/gateway/.env', import.meta.url));
if (existsSync(gatewayEnvPath)) {
  process.loadEnvFile(gatewayEnvPath);
}

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    restoreMocks: true,
  },
});
