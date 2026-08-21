import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createAnthropicAdapter } from '~/apps/gateway/server/providers/anthropic/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'claude-sonnet',
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

function anthropicSseResponse(events: { event: string; data: unknown }[]): Response {
  const body = events
    .map(({ event, data }) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

describe('createAnthropicAdapter.createChatCompletion', () => {
  it('maps the Anthropic response back to the canonical shape', async () => {
    const adapter = createAnthropicAdapter({
      fetchImpl: () =>
        Promise.resolve(
          jsonResponse({
            id: 'msg_1',
            content: [{ type: 'text', text: 'Hi there' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 4, output_tokens: 2 },
          }),
        ),
    });

    const result = await adapter.createChatCompletion(baseRequest, {
      apiKey: 'sk-test',
      providerModel: 'claude-sonnet-4-5',
      signal: new AbortController().signal,
    });

    expect(result.choices[0]?.message.content).toBe('Hi there');
    expect(result.usage).toEqual({ prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 });
  });

  it('throws a ProviderRequestError carrying the upstream status on failure', async () => {
    const adapter = createAnthropicAdapter({
      fetchImpl: () => Promise.resolve(new Response('overloaded', { status: 529 })),
    });

    await expect(
      adapter.createChatCompletion(baseRequest, {
        apiKey: 'sk-test',
        providerModel: 'claude-sonnet-4-5',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 529, provider: 'anthropic' });
  });
});

describe('createAnthropicAdapter.streamChatCompletion', () => {
  it('yields canonical chunks parsed from the named-event SSE stream', async () => {
    const adapter = createAnthropicAdapter({
      fetchImpl: () =>
        Promise.resolve(
          anthropicSseResponse([
            {
              event: 'message_start',
              data: {
                type: 'message_start',
                message: { id: 'msg_1', usage: { input_tokens: 4 } },
              },
            },
            {
              event: 'content_block_delta',
              data: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } },
            },
            {
              event: 'message_delta',
              data: {
                type: 'message_delta',
                delta: { stop_reason: 'end_turn' },
                usage: { output_tokens: 1 },
              },
            },
            { event: 'message_stop', data: { type: 'message_stop' } },
          ]),
        ),
    });

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of adapter.streamChatCompletion(
      { ...baseRequest, stream: true },
      {
        apiKey: 'sk-test',
        providerModel: 'claude-sonnet-4-5',
        signal: new AbortController().signal,
      },
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[1]?.choices[0]?.delta.content).toBe('Hi');
    expect(chunks[2]?.usage).toEqual({ prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 });
  });
});
