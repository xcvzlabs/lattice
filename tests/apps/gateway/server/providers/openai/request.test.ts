import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { toOpenAiRequest } from '~/apps/gateway/server/providers/openai/request.ts';

const baseRequest: ChatCompletionRequest = {
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

describe('toOpenAiRequest', () => {
  it('rewrites the model to the provider model string', () => {
    const result = toOpenAiRequest(baseRequest, 'gpt-4o-2024-08-06');
    expect(result.model).toBe('gpt-4o-2024-08-06');
  });

  it('passes messages through unchanged', () => {
    const result = toOpenAiRequest(baseRequest, 'gpt-4o');
    expect(result.messages).toEqual(baseRequest.messages);
  });

  it('omits stream_options when not streaming', () => {
    const result = toOpenAiRequest(baseRequest, 'gpt-4o');
    expect(result.stream_options).toBeUndefined();
  });

  it('requests usage on the terminal chunk when streaming', () => {
    const result = toOpenAiRequest({ ...baseRequest, stream: true }, 'gpt-4o');
    expect(result.stream_options).toEqual({ include_usage: true });
  });
});
