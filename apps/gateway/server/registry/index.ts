import { env } from '../utils/env.ts';
import { buildProviderCredentials } from './credentials.ts';
import { modelRegistryConfig } from './models.config.ts';
import { loadModelRegistry } from './models.ts';

export type { ModelRegistryConfig, ModelRegistryEntry, ProviderId } from './models.ts';
export { lookupModel } from './models.ts';
export type { ProviderCredentials } from './credentials.ts';

const providerCredentials = buildProviderCredentials(env);

// Validated once at import time so a misconfigured registry crashes boot, not a request.
export const modelRegistry = loadModelRegistry(modelRegistryConfig, providerCredentials);
