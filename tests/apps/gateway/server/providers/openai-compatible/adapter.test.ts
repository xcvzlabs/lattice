import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createOpenAiCompatibleAdapter } from '~/apps/gateway/server/providers/openai-compatible/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'local-model',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

// oxlint-disable-next-line no-unnecessary-type-parameters
function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const successBody = {
  id: 'chatcmpl-1',
  created: 1,
  choices: [{ index: 0, message: { content: 'Hi' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

describe('createOpenAiCompatibleAdapter', () => {
  it('sends a bearer token when apiKey is set', async () => {
    let capturedInit: RequestInit | undefined;

    const adapter = createOpenAiCompatibleAdapter(
      { id: 'ollama', label: 'Ollama', endpointUrl: 'http://localhost:11434/v1/chat/completions' },
      {
        fetchImpl: (_input, init) => {
          capturedInit = init;
          return Promise.resolve(jsonResponse(successBody));
        },
      },
    );

    await adapter.createChatCompletion(baseRequest, {
      apiKey: 'sk-test',
      providerModel: 'llama3',
      signal: new AbortController().signal,
    });

    expect(capturedInit?.headers).toMatchObject({ authorization: 'Bearer sk-test' });
  });

  it('omits the authorization header when no apiKey is configured', async () => {
    let capturedInit: RequestInit | undefined;

    const adapter = createOpenAiCompatibleAdapter(
      { id: 'ollama', label: 'Ollama', endpointUrl: 'http://localhost:11434/v1/chat/completions' },
      {
        fetchImpl: (_input, init) => {
          capturedInit = init;
          return Promise.resolve(jsonResponse(successBody));
        },
      },
    );

    await adapter.createChatCompletion(baseRequest, {
      providerModel: 'llama3',
      signal: new AbortController().signal,
    });

    expect(capturedInit?.headers).not.toHaveProperty('authorization');
  });

  it('tags a failed request with the configured provider id', async () => {
    const adapter = createOpenAiCompatibleAdapter(
      { id: 'vllm', label: 'vLLM', endpointUrl: 'http://localhost:8000/v1/chat/completions' },
      { fetchImpl: () => Promise.resolve(new Response('server error', { status: 503 })) },
    );

    await expect(
      adapter.createChatCompletion(baseRequest, {
        providerModel: 'llama3',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 503, provider: 'vllm' });
  });
});
