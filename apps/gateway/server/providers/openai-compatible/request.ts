import type { ChatCompletionRequest } from '@lattice/api-contract';

export type OpenAiChatCompletionRequest = {
  model: string;
  messages: ChatCompletionRequest['messages'];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
  stream_options?: { include_usage: boolean };
};

export function toOpenAiRequest(
  request: ChatCompletionRequest,
  providerModel: string,
): OpenAiChatCompletionRequest {
  return {
    model: providerModel,
    messages: request.messages,
    stream: request.stream,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    top_p: request.top_p,
    stop: request.stop,
    stream_options: request.stream ? { include_usage: true } : undefined,
  };
}
