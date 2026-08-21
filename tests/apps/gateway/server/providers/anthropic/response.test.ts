import { describe, expect, it } from 'vitest';
import { fromAnthropicResponse } from '~/apps/gateway/server/providers/anthropic/response.ts';

describe('fromAnthropicResponse', () => {
  it('concatenates text blocks into a single content string', () => {
    const result = fromAnthropicResponse(
      {
        id: 'msg_1',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'there' },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      'claude-sonnet',
    );

    expect(result.choices[0]?.message.content).toBe('Hello there');
  });

  it('maps max_tokens stop_reason to length', () => {
    const result = fromAnthropicResponse(
      {
        id: 'msg_1',
        content: [{ type: 'text', text: 'Hi' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      'claude-sonnet',
    );

    expect(result.choices[0]?.finish_reason).toBe('length');
  });

  it('maps end_turn and other stop reasons to stop', () => {
    const result = fromAnthropicResponse(
      {
        id: 'msg_1',
        content: [{ type: 'text', text: 'Hi' }],
        stop_reason: 'stop_sequence',
        usage: { input_tokens: 1, output_tokens: 1 },
      },
      'claude-sonnet',
    );

    expect(result.choices[0]?.finish_reason).toBe('stop');
  });

  it('sums input and output tokens into total_tokens', () => {
    const result = fromAnthropicResponse(
      {
        id: 'msg_1',
        content: [{ type: 'text', text: 'Hi' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      'claude-sonnet',
    );

    expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
  });
});
