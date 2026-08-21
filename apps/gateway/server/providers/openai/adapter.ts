import type { ProviderAdapter, ProviderAdapterDeps } from '../types.ts';
import { createOpenAiCompatibleAdapter } from '../openai-compatible/adapter.ts';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

export function createOpenAiAdapter(deps: ProviderAdapterDeps = {}): ProviderAdapter {
  return createOpenAiCompatibleAdapter(
    {
      id: 'openai',
      label: 'OpenAI',
      endpointUrl: OPENAI_CHAT_COMPLETIONS_URL,
    },
    deps,
  );
}
