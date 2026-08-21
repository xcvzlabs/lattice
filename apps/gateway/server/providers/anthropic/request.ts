import type { ChatCompletionRequest } from '@lattice/api-contract';

export type AnthropicMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AnthropicRequest = {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream: boolean;
};

const DEFAULT_MAX_TOKENS = 4096;

function toStopSequences(stop: ChatCompletionRequest['stop']): string[] | undefined {
  if (stop === undefined) return undefined;
  return Array.isArray(stop) ? stop : [stop];
}

/** Anthropic has no system-role message. System prompts go in a separate top-level field. */
export function toAnthropicRequest(
  request: ChatCompletionRequest,
  providerModel: string,
  stream: boolean,
): AnthropicRequest {
  const systemMessages = request.messages.filter((message) => message.role === 'system');
  const conversationMessages = request.messages.filter((message) => message.role !== 'system');

  return {
    model: providerModel,
    max_tokens: request.max_tokens ?? DEFAULT_MAX_TOKENS,
    messages: conversationMessages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    })),
    system:
      systemMessages.length > 0
        ? systemMessages.map((message) => message.content).join('\n\n')
        : undefined,
    temperature: request.temperature,
    top_p: request.top_p,
    stop_sequences: toStopSequences(request.stop),
    stream,
  };
}
