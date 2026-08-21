import type { ChatCompletionRequest } from '@lattice/api-contract';

export type GeminiContent = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export type GeminiRequest = {
  contents: GeminiContent[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
};

function toStopSequences(stop: ChatCompletionRequest['stop']): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

/** Gemini has no system-role content. System prompts go in a separate top-level field, and the
 * assistant's own turns use role "model" rather than "assistant". The target model is part of
 * the request URL, not this body, so unlike OpenAI/Anthropic there's no providerModel parameter. */
export function toGeminiRequest(request: ChatCompletionRequest): GeminiRequest {
  const systemMessages = request.messages.filter((message) => message.role === 'system');
  const conversationMessages = request.messages.filter((message) => message.role !== 'system');

  return {
    contents: conversationMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    systemInstruction:
      systemMessages.length > 0
        ? { parts: [{ text: systemMessages.map((message) => message.content).join('\n\n') }] }
        : undefined,
    generationConfig: {
      temperature: request.temperature,
      topP: request.top_p,
      maxOutputTokens: request.max_tokens,
      stopSequences: toStopSequences(request.stop),
    },
  };
}
