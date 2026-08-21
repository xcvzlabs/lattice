import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
  chatCompletionChunkSchema,
  chatCompletionRequestSchema,
  chatCompletionResponseSchema,
} from '~/packages/api-contract/src/schemas/chat-completion.ts';

describe('chatCompletionRequestSchema', () => {
  it('accepts a minimal valid request', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.success).toBe(true);
  });

  it('defaults stream to false when omitted', () => {
    const result = v.parse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.stream).toBe(false);
  });

  it('rejects an empty messages array', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a message array beyond the max length', () => {
    const messages = Array.from({ length: 201 }, () => ({
      role: 'user' as const,
      content: 'hi',
    }));

    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages,
    });

    expect(result.success).toBe(false);
  });

  it('rejects message content beyond the max length', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'a'.repeat(32_001) }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unsupported top-level parameter like tools', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tools: [{ type: 'function', function: { name: 'get_weather' } }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects array-style message content', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown role', () => {
    const result = v.safeParse(chatCompletionRequestSchema, {
      model: 'gpt-4o',
      messages: [{ role: 'system-admin', content: 'Hello' }],
    });

    expect(result.success).toBe(false);
  });
});

describe('chatCompletionResponseSchema', () => {
  it('accepts a well-formed response', () => {
    const result = v.safeParse(chatCompletionResponseSchema, {
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi there' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown finish_reason', () => {
    const result = v.safeParse(chatCompletionResponseSchema, {
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Hi there' },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    expect(result.success).toBe(false);
  });
});

describe('chatCompletionChunkSchema', () => {
  it('accepts a delta chunk without usage', () => {
    const result = v.safeParse(chatCompletionChunkSchema, {
      id: 'chatcmpl-1',
      object: 'chat.completion.chunk',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }],
    });

    expect(result.success).toBe(true);
  });

  it('accepts a terminal chunk carrying usage', () => {
    const result = v.safeParse(chatCompletionChunkSchema, {
      id: 'chatcmpl-1',
      object: 'chat.completion.chunk',
      created: 1_700_000_000,
      model: 'gpt-4o',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    expect(result.success).toBe(true);
  });
});
