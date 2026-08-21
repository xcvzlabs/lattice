import { describe, expect, it } from 'vitest';
import { parseGeminiChunk } from '~/apps/gateway/server/providers/google/stream.ts';

describe('parseGeminiChunk', () => {
  it('maps an intermediate chunk without usage', () => {
    const result = parseGeminiChunk(
      { candidates: [{ content: { parts: [{ text: 'Hi' }] } }] },
      'gemini-pro',
    );

    expect(result.choices[0]?.delta.content).toBe('Hi');
    expect(result.choices[0]?.finish_reason).toBeNull();
    expect(result.usage).toBeUndefined();
  });

  it('carries usage and finish_reason on the terminal chunk', () => {
    const result = parseGeminiChunk(
      {
        candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 },
      },
      'gemini-pro',
    );

    expect(result.choices[0]?.finish_reason).toBe('stop');
    expect(result.usage).toEqual({ prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 });
  });
});
