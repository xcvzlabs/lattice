import type { ChatCompletionResponse, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

export const openAiChatCompletionSchema = v.object({
  id: v.string(),
  created: v.number(),
  choices: v.pipe(
    v.array(
      v.object({
        index: v.number(),
        message: v.object({ content: v.nullable(v.string()) }),
        finish_reason: v.string(),
      }),
    ),
    v.minLength(1),
  ),
  usage: v.object({
    prompt_tokens: v.number(),
    completion_tokens: v.number(),
    total_tokens: v.number(),
  }),
});
export type OpenAiChatCompletionResponse = v.InferOutput<typeof openAiChatCompletionSchema>;

function toFinishReason(reason: string): FinishReason {
  if (reason === 'length') return 'length';
  if (reason === 'content_filter') return 'content_filter';
  return 'stop';
}

export function fromOpenAiResponse(
  parsed: OpenAiChatCompletionResponse,
  model: string,
): ChatCompletionResponse {
  return {
    id: parsed.id,
    object: 'chat.completion',
    created: parsed.created,
    model,
    choices: parsed.choices.map((choice) => ({
      index: choice.index,
      message: { role: 'assistant', content: choice.message.content ?? '' },
      finish_reason: toFinishReason(choice.finish_reason),
    })),
    usage: parsed.usage,
  };
}
