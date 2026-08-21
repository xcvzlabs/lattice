import type { ChatCompletionChunk, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

const messageStartEventSchema = v.object({
  type: v.literal('message_start'),
  message: v.object({
    id: v.string(),
    usage: v.object({ input_tokens: v.number() }),
  }),
});

const contentBlockDeltaEventSchema = v.object({
  type: v.literal('content_block_delta'),
  delta: v.object({
    type: v.literal('text_delta'),
    text: v.string(),
  }),
});

const messageDeltaEventSchema = v.object({
  type: v.literal('message_delta'),
  delta: v.object({
    stop_reason: v.nullable(v.string()),
  }),
  usage: v.object({ output_tokens: v.number() }),
});

const ignoredEventSchema = v.object({
  type: v.picklist(['content_block_start', 'content_block_stop', 'ping', 'message_stop']),
});

export const anthropicSseEventSchema = v.union([
  messageStartEventSchema,
  contentBlockDeltaEventSchema,
  messageDeltaEventSchema,
  ignoredEventSchema,
]);
export type AnthropicSseEvent = v.InferOutput<typeof anthropicSseEventSchema>;

export type AnthropicStreamState = {
  id: string;
  inputTokens: number;
};

export type AnthropicReduceResult = {
  state: AnthropicStreamState;
  chunk: ChatCompletionChunk | null;
};

function toFinishReason(reason: string | null): FinishReason | null {
  if (reason === null) return null;
  if (reason === 'max_tokens') return 'length';
  return 'stop';
}

/** Folds one Anthropic SSE event into the running stream state, emitting a canonical chunk where one applies. */
export function reduceAnthropicEvent(
  state: AnthropicStreamState,
  event: AnthropicSseEvent,
  model: string,
): AnthropicReduceResult {
  const created = Math.floor(Date.now() / 1000);

  if (event.type === 'message_start') {
    const nextState = { id: event.message.id, inputTokens: event.message.usage.input_tokens };
    return {
      state: nextState,
      chunk: {
        id: nextState.id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
      },
    };
  }

  if (event.type === 'content_block_delta') {
    return {
      state,
      chunk: {
        id: state.id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: { content: event.delta.text }, finish_reason: null }],
      },
    };
  }

  if (event.type === 'message_delta') {
    return {
      state,
      chunk: {
        id: state.id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: toFinishReason(event.delta.stop_reason) }],
        usage: {
          prompt_tokens: state.inputTokens,
          completion_tokens: event.usage.output_tokens,
          total_tokens: state.inputTokens + event.usage.output_tokens,
        },
      },
    };
  }

  return {
    state,
    chunk: null,
  };
}
