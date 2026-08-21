import * as v from 'valibot';

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 32_000;

export const chatMessageRoleSchema = v.picklist(['system', 'user', 'assistant']);
export type ChatMessageRole = v.InferOutput<typeof chatMessageRoleSchema>;

// An unrecognized key like `tool_calls` must fail validation instead of being silently dropped,
// since Phase 1 is text-only and has no tool-calling support.
export const chatMessageSchema = v.strictObject({
  role: chatMessageRoleSchema,
  content: v.pipe(v.string(), v.maxLength(MAX_MESSAGE_LENGTH)),
});
export type ChatMessage = v.InferOutput<typeof chatMessageSchema>;

export const finishReasonSchema = v.picklist(['stop', 'length', 'content_filter']);
export type FinishReason = v.InferOutput<typeof finishReasonSchema>;

// Same reasoning applies here: a request carrying `tools`/`tool_choice`/etc. should get a clear
// 400 (unsupported_parameter) rather than have those fields silently ignored.
export const chatCompletionRequestSchema = v.strictObject({
  model: v.pipe(v.string(), v.minLength(1)),
  messages: v.pipe(v.array(chatMessageSchema), v.minLength(1), v.maxLength(MAX_MESSAGES)),
  stream: v.optional(v.boolean(), false),
  temperature: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(2))),
  max_tokens: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  top_p: v.optional(v.number()),
  stop: v.optional(v.union([v.string(), v.array(v.string())])),
});
export type ChatCompletionRequest = v.InferOutput<typeof chatCompletionRequestSchema>;

export const chatCompletionUsageSchema = v.object({
  prompt_tokens: v.number(),
  completion_tokens: v.number(),
  total_tokens: v.number(),
});
export type ChatCompletionUsage = v.InferOutput<typeof chatCompletionUsageSchema>;

export const chatCompletionResponseSchema = v.object({
  id: v.string(),
  object: v.literal('chat.completion'),
  created: v.number(),
  model: v.string(),
  choices: v.array(
    v.object({
      index: v.number(),
      message: v.object({
        role: v.literal('assistant'),
        content: v.string(),
      }),
      finish_reason: finishReasonSchema,
    }),
  ),
  usage: chatCompletionUsageSchema,
});
export type ChatCompletionResponse = v.InferOutput<typeof chatCompletionResponseSchema>;

export const chatCompletionChunkSchema = v.object({
  id: v.string(),
  object: v.literal('chat.completion.chunk'),
  created: v.number(),
  model: v.string(),
  choices: v.array(
    v.object({
      index: v.number(),
      delta: v.object({
        role: v.optional(v.literal('assistant')),
        content: v.optional(v.string()),
      }),
      finish_reason: v.nullable(finishReasonSchema),
    }),
  ),
  // Present only on the terminal chunk, when the upstream provider reports it there.
  usage: v.optional(v.nullable(chatCompletionUsageSchema)),
});
export type ChatCompletionChunk = v.InferOutput<typeof chatCompletionChunkSchema>;
