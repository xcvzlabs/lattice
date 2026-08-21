import type { ProviderAdapter, ProviderAdapterDeps } from '../types.ts';
import { createOpenAiCompatibleAdapter } from '../openai-compatible/adapter.ts';

export type OllamaAdapterOptions = {
  baseUrl: string;
};

export function createOllamaAdapter(
  options: OllamaAdapterOptions,
  deps: ProviderAdapterDeps = {},
): ProviderAdapter {
  return createOpenAiCompatibleAdapter(
    {
      id: 'ollama',
      label: 'Ollama',
      endpointUrl: `${options.baseUrl}/v1/chat/completions`,
    },
    deps,
  );
}
