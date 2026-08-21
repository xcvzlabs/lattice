import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createGoogleAdapter } from '~/apps/gateway/server/providers/google/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'gemini-pro',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

function jsonResponse<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function geminiSseResponse(events: unknown[]): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

describe('createGoogleAdapter.createChatCompletion', () => {
  it('maps the Gemini response back to the canonical shape', async () => {
    const adapter = createGoogleAdapter({
      fetchImpl: async () =>
        jsonResponse({
          candidates: [{ content: { parts: [{ text: 'Hi there' }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 },
        }),
    });

    const result = await adapter.createChatCompletion(baseRequest, {
      apiKey: 'test-key',
      providerModel: 'gemini-2.5-pro',
      signal: new AbortController().signal,
    });

    expect(result.choices[0]?.message.content).toBe('Hi there');
    expect(result.usage).toEqual({ prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 });
  });

  it('throws a ProviderRequestError carrying the upstream status on failure', async () => {
    const adapter = createGoogleAdapter({
      fetchImpl: async () => new Response('rate limited', { status: 429 }),
    });

    await expect(
      adapter.createChatCompletion(baseRequest, {
        apiKey: 'test-key',
        providerModel: 'gemini-2.5-pro',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 429, provider: 'google' });
  });
});

describe('createGoogleAdapter.streamChatCompletion', () => {
  it('yields canonical chunks parsed from the data-only SSE stream', async () => {
    const adapter = createGoogleAdapter({
      fetchImpl: async () =>
        geminiSseResponse([
          { candidates: [{ content: { parts: [{ text: 'Hi' }] } }] },
          {
            candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }],
            usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1, totalTokenCount: 5 },
          },
        ]),
    });

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of adapter.streamChatCompletion(
      { ...baseRequest, stream: true },
      { apiKey: 'test-key', providerModel: 'gemini-2.5-pro', signal: new AbortController().signal },
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.choices[0]?.delta.content).toBe('Hi');
    expect(chunks[1]?.usage).toEqual({ prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 });
  });
});
