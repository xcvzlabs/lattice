import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createOllamaAdapter } from '~/apps/gateway/server/providers/ollama/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'llama3',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

describe('createOllamaAdapter', () => {
  it('requests the configured base URL and reports failures as the ollama provider', async () => {
    let requestedUrl: string | undefined;

    const adapter = createOllamaAdapter(
      { baseUrl: 'http://localhost:11434' },
      {
        fetchImpl: (input) => {
          requestedUrl = String(input);
          return Promise.resolve(new Response('server error', { status: 503 }));
        },
      },
    );

    expect(adapter.id).toBe('ollama');

    await expect(
      adapter.createChatCompletion(baseRequest, {
        providerModel: 'llama3',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 503, provider: 'ollama' });

    expect(requestedUrl).toBe('http://localhost:11434/v1/chat/completions');
  });
});
