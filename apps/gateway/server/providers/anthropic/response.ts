import type { ChatCompletionResponse, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

export const anthropicResponseSchema = v.object({
  id: v.string(),
  content: v.array(
    v.object({
      type: v.string(),
      text: v.optional(v.string()),
    }),
  ),
  stop_reason: v.nullable(v.string()),
  usage: v.object({
    input_tokens: v.number(),
    output_tokens: v.number(),
  }),
});
export type AnthropicResponse = v.InferOutput<typeof anthropicResponseSchema>;

function toFinishReason(reason: string | null): FinishReason {
  if (reason === 'max_tokens') return 'length';
  return 'stop';
}

function toContentText(content: AnthropicResponse['content']): string {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
}

export function fromAnthropicResponse(
  parsed: AnthropicResponse,
  model: string,
): ChatCompletionResponse {
  return {
    id: parsed.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: toContentText(parsed.content) },
        finish_reason: toFinishReason(parsed.stop_reason),
      },
    ],
    usage: {
      prompt_tokens: parsed.usage.input_tokens,
      completion_tokens: parsed.usage.output_tokens,
      total_tokens: parsed.usage.input_tokens + parsed.usage.output_tokens,
    },
  };
}
