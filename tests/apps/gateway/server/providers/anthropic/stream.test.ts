import { describe, expect, it } from 'vitest';
import {
  reduceAnthropicEvent,
  type AnthropicSseEvent,
  type AnthropicStreamState,
} from '~/apps/gateway/server/providers/anthropic/stream.ts';

describe('reduceAnthropicEvent', () => {
  it('emits an assistant-role chunk and captures input tokens on message_start', () => {
    const state: AnthropicStreamState = { id: '', inputTokens: 0 };
    const result = reduceAnthropicEvent(
      state,
      { type: 'message_start', message: { id: 'msg_1', usage: { input_tokens: 12 } } },
      'claude-sonnet',
    );

    expect(result.state).toEqual({ id: 'msg_1', inputTokens: 12 });
    expect(result.chunk?.choices[0]?.delta).toEqual({ role: 'assistant' });
  });

  it('emits a content delta chunk carrying the running id', () => {
    const state: AnthropicStreamState = { id: 'msg_1', inputTokens: 12 };
    const result = reduceAnthropicEvent(
      state,
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } },
      'claude-sonnet',
    );

    expect(result.state).toEqual(state);
    expect(result.chunk?.id).toBe('msg_1');
    expect(result.chunk?.choices[0]?.delta.content).toBe('Hi');
  });

  it('emits the terminal chunk with mapped finish_reason and combined usage on message_delta', () => {
    const state: AnthropicStreamState = { id: 'msg_1', inputTokens: 12 };
    const result = reduceAnthropicEvent(
      state,
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 8 } },
      'claude-sonnet',
    );

    expect(result.chunk?.choices[0]?.finish_reason).toBe('stop');
    expect(result.chunk?.usage).toEqual({
      prompt_tokens: 12,
      completion_tokens: 8,
      total_tokens: 20,
    });
  });

  it('maps max_tokens stop_reason to length', () => {
    const state: AnthropicStreamState = { id: 'msg_1', inputTokens: 12 };
    const result = reduceAnthropicEvent(
      state,
      { type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 8 } },
      'claude-sonnet',
    );

    expect(result.chunk?.choices[0]?.finish_reason).toBe('length');
  });

  it('ignores non-content events without emitting a chunk', () => {
    const state: AnthropicStreamState = { id: 'msg_1', inputTokens: 12 };
    const result = reduceAnthropicEvent(state, { type: 'ping' }, 'claude-sonnet');

    expect(result.chunk).toBeNull();
    expect(result.state).toEqual(state);
  });

  it('processes a full event sequence end to end', () => {
    let state: AnthropicStreamState = { id: '', inputTokens: 0 };
    const chunks = [];

    const events: AnthropicSseEvent[] = [
      { type: 'message_start', message: { id: 'msg_1', usage: { input_tokens: 12 } } },
      { type: 'content_block_start' },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } },
      { type: 'content_block_stop' },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 2 } },
      { type: 'message_stop' },
    ];

    for (const event of events) {
      const result = reduceAnthropicEvent(state, event, 'claude-sonnet');
      state = result.state;
      if (result.chunk !== null) chunks.push(result.chunk);
    }

    expect(chunks).toHaveLength(4);
    expect(
      chunks
        .map((chunk) => chunk.choices[0]?.delta.content)
        .filter((content) => content !== undefined),
    ).toEqual(['Hello', ' world']);
    expect(chunks.at(-1)?.usage).toEqual({
      prompt_tokens: 12,
      completion_tokens: 2,
      total_tokens: 14,
    });
  });
});
