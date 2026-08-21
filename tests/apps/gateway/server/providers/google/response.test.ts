import { describe, expect, it } from 'vitest';
import { fromGeminiResponse } from '~/apps/gateway/server/providers/google/response.ts';

describe('fromGeminiResponse', () => {
  it('concatenates text parts into a single content string', () => {
    const result = fromGeminiResponse(
      {
        candidates: [
          { content: { parts: [{ text: 'Hello ' }, { text: 'there' }] }, finishReason: 'STOP' },
        ],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 },
      },
      'gemini-pro',
    );

    expect(result.choices[0]?.message.content).toBe('Hello there');
  });

  it('maps MAX_TOKENS to length', () => {
    const result = fromGeminiResponse(
      {
        candidates: [{ content: { parts: [{ text: 'Hi' }] }, finishReason: 'MAX_TOKENS' }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      },
      'gemini-pro',
    );

    expect(result.choices[0]?.finish_reason).toBe('length');
  });

  it('maps SAFETY to content_filter', () => {
    const result = fromGeminiResponse(
      {
        candidates: [{ content: { parts: [{ text: '' }] }, finishReason: 'SAFETY' }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 0, totalTokenCount: 1 },
      },
      'gemini-pro',
    );

    expect(result.choices[0]?.finish_reason).toBe('content_filter');
  });

  it('maps token counts directly from usageMetadata', () => {
    const result = fromGeminiResponse(
      {
        candidates: [{ content: { parts: [{ text: 'Hi' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, totalTokenCount: 14 },
      },
      'gemini-pro',
    );

    expect(result.usage).toEqual({ prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
  });
});
