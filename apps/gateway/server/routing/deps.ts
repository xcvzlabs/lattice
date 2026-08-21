import type { ProviderApiKeys } from '../registry/models.ts';
import type { DispatchDeps, ProviderAdapters } from './dispatch.ts';
import { createAnthropicAdapter } from '../providers/anthropic/adapter.ts';
import { createGoogleAdapter } from '../providers/google/adapter.ts';
import { createOpenAiAdapter } from '../providers/openai/adapter.ts';
import { modelRegistry } from '../registry/index.ts';
import { env } from '../utils/env.ts';

const providerApiKeys: ProviderApiKeys = {
  openai: env.openaiApiKey,
  anthropic: env.anthropicApiKey,
  google: env.googleApiKey,
};

const adapters: ProviderAdapters = {
  openai: createOpenAiAdapter(),
  anthropic: createAnthropicAdapter(),
  google: createGoogleAdapter(),
};

export const dispatchDeps: DispatchDeps = {
  registry: modelRegistry,
  adapters,
  providerApiKeys,
};
