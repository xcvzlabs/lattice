import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { toAnthropicRequest } from '~/apps/gateway/server/providers/anthropic/request.ts';

describe('toAnthropicRequest', () => {
  it('moves a system message out of messages and into the system field', () => {
    const request: ChatCompletionRequest = {
      model: 'claude-sonnet',
      messages: [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'Hello' },
      ],
      stream: false,
    };

    const result = toAnthropicRequest(request, 'claude-sonnet-4-5', false);

    expect(result.system).toBe('Be terse.');
    expect(result.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('omits the system field when no system message is present', () => {
    const request: ChatCompletionRequest = {
      model: 'claude-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    };

    const result = toAnthropicRequest(request, 'claude-sonnet-4-5', false);
    expect(result.system).toBeUndefined();
  });

  it('defaults max_tokens when the request does not specify one', () => {
    const request: ChatCompletionRequest = {
      model: 'claude-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    };

    const result = toAnthropicRequest(request, 'claude-sonnet-4-5', false);
    expect(result.max_tokens).toBeGreaterThan(0);
  });

  it('normalizes a single stop string into stop_sequences', () => {
    const request: ChatCompletionRequest = {
      model: 'claude-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
      stop: 'END',
    };

    const result = toAnthropicRequest(request, 'claude-sonnet-4-5', false);
    expect(result.stop_sequences).toEqual(['END']);
  });

  it('sets stream on the request independently of the request body', () => {
    const request: ChatCompletionRequest = {
      model: 'claude-sonnet',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    };

    const result = toAnthropicRequest(request, 'claude-sonnet-4-5', true);
    expect(result.stream).toBe(true);
  });
});
