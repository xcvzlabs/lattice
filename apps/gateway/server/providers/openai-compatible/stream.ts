import type { ChatCompletionChunk, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

const openAiChunkUsageSchema = v.object({
  prompt_tokens: v.number(),
  completion_tokens: v.number(),
  total_tokens: v.number(),
});

export const openAiChunkSchema = v.object({
  id: v.string(),
  created: v.number(),
  choices: v.array(
    v.object({
      index: v.number(),
      delta: v.object({
        role: v.optional(v.literal('assistant')),
        content: v.optional(v.nullable(v.string())),
      }),
      finish_reason: v.nullable(v.string()),
    }),
  ),
  usage: v.optional(v.nullable(openAiChunkUsageSchema)),
});
export type OpenAiChatCompletionChunk = v.InferOutput<typeof openAiChunkSchema>;

function toFinishReason(reason: string): FinishReason {
  if (reason === 'length') return 'length';
  if (reason === 'content_filter') return 'content_filter';
  return 'stop';
}

export function parseOpenAiChunk(
  parsed: OpenAiChatCompletionChunk,
  model: string,
): ChatCompletionChunk {
  return {
    id: parsed.id,
    object: 'chat.completion.chunk',
    created: parsed.created,
    model,
    choices: parsed.choices.map((choice) => ({
      index: choice.index,
      delta: {
        role: choice.delta.role,
        content: choice.delta.content ?? undefined,
      },
      finish_reason: choice.finish_reason === null ? null : toFinishReason(choice.finish_reason),
    })),
    usage: parsed.usage ?? undefined,
  };
}
