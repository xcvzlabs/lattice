import type { ChatCompletionRequest } from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { describe, expect, it } from 'vitest';
import { toGeminiRequest } from '~/apps/gateway/server/providers/google/request.ts';

describe('toGeminiRequest', () => {
  it('moves a system message into systemInstruction', () => {
    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [
        { role: 'system', content: 'Be terse.' },
        { role: 'user', content: 'Hello' },
      ],
      stream: false,
    };

    const result = toGeminiRequest(request);

    expect(result.systemInstruction).toEqual({ parts: [{ text: 'Be terse.' }] });
    expect(result.contents).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
  });

  it('maps the assistant role to model', () => {
    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
      ],
      stream: false,
    };

    const result = toGeminiRequest(request);
    expect(result.contents[1]?.role).toBe('model');
  });

  it('omits systemInstruction when no system message is present', () => {
    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: false,
    };

    expect(toGeminiRequest(request).systemInstruction).toBeUndefined();
  });

  it('maps generation parameters into generationConfig', () => {
    const request: ChatCompletionRequest = {
      model: 'gemini-pro',
      messages: [{ role: 'user', content: 'Hi' }],
      stream: false,
      temperature: 0.5,
      top_p: 0.9,
      max_tokens: 100,
      stop: ['END'],
    };

    expect(toGeminiRequest(request).generationConfig).toEqual({
      temperature: 0.5,
      topP: 0.9,
      maxOutputTokens: 100,
      stopSequences: ['END'],
    });
  });
});
