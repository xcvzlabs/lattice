import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
} from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { createOpenAiAdapter } from '~/apps/gateway/server/providers/openai/adapter.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'gpt-4o',
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

function sseResponse(lines: string[]): Response {
  const body = `${lines.map((line) => `data: ${line}\n\n`).join('')}data: [DONE]\n\n`;
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

describe('createOpenAiAdapter.createChatCompletion', () => {
  it('maps the OpenAI response back to the canonical shape', async () => {
    const adapter = createOpenAiAdapter({
      fetchImpl: () =>
        Promise.resolve(
          jsonResponse({
            id: 'chatcmpl-1',
            created: 1,
            choices: [{ index: 0, message: { content: 'Hi' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        ),
    });

    const result = await adapter.createChatCompletion(baseRequest, {
      apiKey: 'sk-test',
      providerModel: 'gpt-4o-2024',
      signal: new AbortController().signal,
    });

    expect(result.choices[0]?.message.content).toBe('Hi');
  });

  it('throws a ProviderRequestError carrying the upstream status on failure', async () => {
    const adapter = createOpenAiAdapter({
      fetchImpl: () => Promise.resolve(new Response('server error', { status: 503 })),
    });

    await expect(
      adapter.createChatCompletion(baseRequest, {
        apiKey: 'sk-test',
        providerModel: 'gpt-4o',
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ status: 503, provider: 'openai' });
  });
});

describe('createOpenAiAdapter.streamChatCompletion', () => {
  it('yields canonical chunks parsed from the SSE stream', async () => {
    const adapter = createOpenAiAdapter({
      fetchImpl: () =>
        Promise.resolve(
          sseResponse([
            JSON.stringify({
              id: 'chatcmpl-1',
              created: 1,
              choices: [
                { index: 0, delta: { role: 'assistant', content: 'Hi' }, finish_reason: null },
              ],
            }),
            JSON.stringify({
              id: 'chatcmpl-1',
              created: 1,
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
              usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
            }),
          ]),
        ),
    });

    const chunks: ChatCompletionChunk[] = [];
    for await (const chunk of adapter.streamChatCompletion(
      { ...baseRequest, stream: true },
      { apiKey: 'sk-test', providerModel: 'gpt-4o', signal: new AbortController().signal },
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.choices[0]?.delta.content).toBe('Hi');
    expect(chunks[1]?.usage).toEqual({ prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 });
  });
});
