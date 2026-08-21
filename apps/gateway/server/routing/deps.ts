import type { DispatchDeps, ProviderAdapters } from './dispatch.ts';
import { createAnthropicAdapter } from '../providers/anthropic/adapter.ts';
import { createGoogleAdapter } from '../providers/google/adapter.ts';
import { createOllamaAdapter } from '../providers/ollama/adapter.ts';
import { createOpenAiAdapter } from '../providers/openai/adapter.ts';
import { createVllmAdapter } from '../providers/vllm/adapter.ts';
import { buildProviderCredentials } from '../registry/credentials.ts';
import { modelRegistry } from '../registry/index.ts';
import { env } from '../utils/env.ts';

const providerCredentials = buildProviderCredentials(env);

const adapters: ProviderAdapters = {
  openai: createOpenAiAdapter(),
  anthropic: createAnthropicAdapter(),
  google: createGoogleAdapter(),
};

if (providerCredentials.ollama?.baseUrl !== undefined) {
  adapters.ollama = createOllamaAdapter({
    baseUrl: providerCredentials.ollama.baseUrl,
  });
}

if (providerCredentials.vllm?.baseUrl !== undefined) {
  adapters.vllm = createVllmAdapter({
    baseUrl: providerCredentials.vllm.baseUrl,
  });
}

export const dispatchDeps: DispatchDeps = {
  registry: modelRegistry,
  adapters,
  providerCredentials,
};
