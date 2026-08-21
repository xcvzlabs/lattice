import { consola } from 'consola';
import { generateApiKey, hashApiKey } from '../server/auth/api-keys.ts';
import { createApiKey } from '../server/database/repositories/api-keys.ts';
import { createApplication } from '../server/database/repositories/applications.ts';
import { env } from '../server/utils/env.ts';

const name = Bun.argv[2];

if (name === undefined) {
  consola.error('Usage: bun run seed <application-name>');
  process.exit(1);
}

const application = await createApplication(name);
const apiKey = generateApiKey();
const keyHash = hashApiKey(apiKey.key, env.apiKeyPepper);

await createApiKey({
  applicationId: application.id,
  keyHash,
  keyPrefix: apiKey.prefix,
});

consola.info(`Application created: ${application.id} (${application.name})`);
consola.info(`API key (shown once, store it now): ${apiKey.key}`);
