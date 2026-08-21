import type { env as envSingleton } from '../utils/env.ts';
import type { ProviderId } from './models.ts';

export type ProviderCredentials = Partial<
  Record<ProviderId, { apiKey?: string; baseUrl?: string }>
>;

/**
 * A provider is "configured" once this holds an entry for it, not once `apiKey` is set.
 * Cloud providers are identified by `apiKey`; self-hosted providers are identified by
 * `baseUrl` and may have no `apiKey` at all.
 */
export function buildProviderCredentials(env: typeof envSingleton) {
  return {
    openai: env.openaiApiKey !== undefined ? { apiKey: env.openaiApiKey } : undefined,
    anthropic: env.anthropicApiKey !== undefined ? { apiKey: env.anthropicApiKey } : undefined,
    google: env.googleApiKey !== undefined ? { apiKey: env.googleApiKey } : undefined,
    ollama:
      env.ollamaBaseUrl !== undefined
        ? { apiKey: env.ollamaApiKey, baseUrl: env.ollamaBaseUrl }
        : undefined,
    vllm:
      env.vllmBaseUrl !== undefined
        ? { apiKey: env.vllmApiKey, baseUrl: env.vllmBaseUrl }
        : undefined,
  } satisfies ProviderCredentials;
}
