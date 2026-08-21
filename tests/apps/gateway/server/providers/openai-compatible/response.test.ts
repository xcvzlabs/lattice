import { describe, expect, it } from 'vitest';
import { fromOpenAiResponse } from '~/apps/gateway/server/providers/openai-compatible/response.ts';

describe('fromOpenAiResponse', () => {
  it('maps a well-formed OpenAI response into the canonical shape', () => {
    const result = fromOpenAiResponse(
      {
        id: 'chatcmpl-1',
        created: 1_700_000_000,
        choices: [{ index: 0, message: { content: 'Hi there' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      },
      'gpt-4o',
    );

    expect(result).toEqual({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi there' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
    });
  });

  it('falls back to stop for an unrecognized finish_reason', () => {
    const result = fromOpenAiResponse(
      {
        id: 'chatcmpl-1',
        created: 1_700_000_000,
        choices: [{ index: 0, message: { content: 'Hi' }, finish_reason: 'tool_calls' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      },
      'gpt-4o',
    );

    expect(result.choices[0]?.finish_reason).toBe('stop');
  });

  it('substitutes an empty string for a null message content', () => {
    const result = fromOpenAiResponse(
      {
        id: 'chatcmpl-1',
        created: 1_700_000_000,
        choices: [{ index: 0, message: { content: null }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      },
      'gpt-4o',
    );

    expect(result.choices[0]?.message.content).toBe('');
  });
});
