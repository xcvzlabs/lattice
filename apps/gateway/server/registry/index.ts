import { env } from '../utils/env.ts';
import { modelRegistryConfig } from './models.config.ts';
import { loadModelRegistry, type ProviderApiKeys } from './models.ts';

export type { ModelRegistryConfig, ModelRegistryEntry, ProviderId } from './models.ts';
export { lookupModel } from './models.ts';

const providerApiKeys: ProviderApiKeys = {
  openai: env.openaiApiKey,
  anthropic: env.anthropicApiKey,
  google: env.googleApiKey,
};

// Validated once at import time so a misconfigured registry crashes boot, not a request.
export const modelRegistry = loadModelRegistry(modelRegistryConfig, providerApiKeys);
