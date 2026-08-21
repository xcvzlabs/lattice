import type { ProviderAdapter, ProviderAdapterDeps } from '../types.ts';
import { createOpenAiCompatibleAdapter } from '../openai-compatible/adapter.ts';

export type VllmAdapterOptions = {
  baseUrl: string;
};

export function createVllmAdapter(
  options: VllmAdapterOptions,
  deps: ProviderAdapterDeps = {},
): ProviderAdapter {
  return createOpenAiCompatibleAdapter(
    {
      id: 'vllm',
      label: 'vLLM',
      endpointUrl: `${options.baseUrl}/v1/chat/completions`,
    },
    deps,
  );
}
