import { describe, expect, it } from 'vitest';
import { parseOpenAiChunk } from '~/apps/gateway/server/providers/openai/stream.ts';

describe('parseOpenAiChunk', () => {
  it('maps a delta chunk into the canonical shape', () => {
    const result = parseOpenAiChunk(
      {
        id: 'chatcmpl-1',
        created: 1_700_000_000,
        choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finish_reason: null }],
      },
      'gpt-4o',
    );

    expect(result).toEqual({
      id: 'chatcmpl-1',
      object: 'chat.completion.chunk',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [{ index: 0, delta: { role: 'assistant', content: 'Hi' }, finish_reason: null }],
      usage: undefined,
    });
  });

  it('carries usage on the terminal chunk', () => {
    const result = parseOpenAiChunk(
      {
        id: 'chatcmpl-1',
        created: 1_700_000_000,
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      },
      'gpt-4o',
    );

    expect(result.usage).toEqual({ prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 });
    expect(result.choices[0]?.finish_reason).toBe('stop');
  });
});
