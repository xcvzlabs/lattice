import { consola } from 'consola';
import { generateApiKey, hashApiKey } from '../server/auth/api-keys.ts';
import { createManagementApiKey } from '../server/database/repositories/management-api-keys.ts';
import { env } from '../server/utils/env.ts';

const name = Bun.argv[2];

if (name === undefined) {
  consola.error('Usage: bun run seed-management-key <name>');
  process.exit(1);
}

const apiKey = generateApiKey();
const keyHash = hashApiKey(apiKey.key, env.apiKeyPepper);

const managementApiKey = await createManagementApiKey({
  name,
  keyHash,
  keyPrefix: apiKey.prefix,
});

consola.info(`Management API key created: ${managementApiKey.id} (${managementApiKey.name})`);
consola.info(`API key (shown once, store it now): ${apiKey.key}`);
