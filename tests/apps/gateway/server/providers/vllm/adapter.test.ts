import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createVllmAdapter } from '~/apps/gateway/server/providers/vllm/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'mistral-7b',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

describe('createVllmAdapter', () => {
  it('requests the configured base URL and reports failures as the vllm provider', async () => {
    let requestedUrl: string | undefined;

    const adapter = createVllmAdapter(
      { baseUrl: 'http://localhost:8000' },
      {
        fetchImpl: (input) => {
          requestedUrl = String(input);
          return Promise.resolve(new Response('server error', { status: 503 }));
        },
      },
    );

    expect(adapter.id).toBe('vllm');

    await expect(
      adapter.createChatCompletion(baseRequest, {
        providerModel: 'mistral-7b',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 503, provider: 'vllm' });

    expect(requestedUrl).toBe('http://localhost:8000/v1/chat/completions');
  });
});
