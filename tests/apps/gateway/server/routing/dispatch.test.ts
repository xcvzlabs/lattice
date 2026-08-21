import type { ProviderAdapter } from '~/apps/gateway/server/providers/types.ts';
import type { ProviderCredentials } from '~/apps/gateway/server/registry/credentials.ts';
import type { ModelRegistryConfig } from '~/apps/gateway/server/registry/models.ts';
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '~/packages/api-contract/src/schemas/chat-completion.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProviderRequestError } from '~/apps/gateway/server/providers/types.ts';
import { recordFailure, resetCircuits } from '~/apps/gateway/server/routing/circuit-breaker.ts';
import {
  beginChatCompletionStream,
  createChatCompletion,
  isRetryableProviderError,
  type DispatchDeps,
} from '~/apps/gateway/server/routing/dispatch.ts';
import { recordLatency, resetLatencies } from '~/apps/gateway/server/routing/latency-tracker.ts';

beforeEach(() => {
  resetCircuits();
  resetLatencies();
});

const baseRequest: ChatCompletionRequest = {
  model: 'primary-model',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: false,
};

const registryWithFallback: ModelRegistryConfig = {
  version: 1,
  models: [
    {
      id: 'primary-model',
      provider: 'openai',
      providerModel: 'gpt-4o',
      fallbacks: ['fallback-model'],
    },
    { id: 'fallback-model', provider: 'anthropic', providerModel: 'claude-sonnet-4-5' },
  ],
};

const registryWithoutFallback: ModelRegistryConfig = {
  version: 1,
  models: [{ id: 'primary-model', provider: 'openai', providerModel: 'gpt-4o' }],
};

const providerCredentials: ProviderCredentials = {
  openai: { apiKey: 'sk-test' },
  anthropic: { apiKey: 'sk-test' },
  google: { apiKey: 'sk-test' },
};

function stubResponse(id: string): ChatCompletionResponse {
  return {
    id,
    object: 'chat.completion',
    created: 1,
    model: 'primary-model',
    choices: [{ index: 0, message: { role: 'assistant', content: id }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

function succeedingAdapter(
  id: 'openai' | 'anthropic' | 'google',
  response: ChatCompletionResponse,
): ProviderAdapter {
  return {
    id,
    createChatCompletion: () => Promise.resolve(response),
    // oxlint-disable-next-line require-await
    async *streamChatCompletion() {
      yield {
        id: response.id,
        object: 'chat.completion.chunk',
        created: 1,
        model: response.model,
        choices: [
          {
            index: 0,
            delta: { content: response.choices[0]?.message.content },
            finish_reason: 'stop',
          },
        ],
      };
    },
  };
}

function failingAdapter(id: 'openai' | 'anthropic' | 'google', cause: unknown): ProviderAdapter {
  return {
    id,
    createChatCompletion: () => {
      throw cause;
    },
    // eslint-disable-next-line require-yield, require-await
    async *streamChatCompletion() {
      throw cause;
    },
  };
}

async function* emptyStream(): AsyncGenerator<ChatCompletionChunk, void, void> {
  // no chunks
}

describe('isRetryableProviderError', () => {
  it('treats a 5xx ProviderRequestError as retryable', () => {
    expect(isRetryableProviderError(new ProviderRequestError('openai', 503, 'down'))).toBe(true);
  });

  it('treats a 4xx ProviderRequestError as not retryable', () => {
    expect(isRetryableProviderError(new ProviderRequestError('openai', 400, 'bad request'))).toBe(
      false,
    );
  });

  it('treats a timeout DOMException as retryable', () => {
    expect(isRetryableProviderError(new DOMException('timed out', 'TimeoutError'))).toBe(true);
  });

  it('treats a network TypeError as retryable', () => {
    expect(isRetryableProviderError(new TypeError('fetch failed'))).toBe(true);
  });

  it('treats an unrelated error as not retryable', () => {
    expect(isRetryableProviderError(new Error('something else'))).toBe(false);
  });
});

describe('createChatCompletion', () => {
  it('throws model_not_found for an unknown model', async () => {
    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('a')),
        anthropic: succeedingAdapter('anthropic', stubResponse('b')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    await expect(
      createChatCompletion({ ...baseRequest, model: 'no-such-model' }, deps),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('returns the primary provider response without touching the fallback', async () => {
    let fallbackCalled = false;
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('primary')),
        anthropic: {
          ...succeedingAdapter('anthropic', stubResponse('fallback')),
          createChatCompletion: () => {
            fallbackCalled = true;
            return Promise.resolve(stubResponse('fallback'));
          },
        },
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.response.id).toBe('primary');
    expect(result.servedBy.provider).toBe('openai');
    expect(fallbackCalled).toBe(false);
  });

  it('fails over to the fallback on a retryable primary failure', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.response.id).toBe('fallback');
    expect(result.servedBy.provider).toBe('anthropic');
  });

  it('does not fail over on a non-retryable primary failure', async () => {
    let fallbackCalled = false;
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 400, 'bad request')),
        anthropic: {
          ...succeedingAdapter('anthropic', stubResponse('fallback')),
          createChatCompletion: () => {
            fallbackCalled = true;
            return Promise.resolve(stubResponse('fallback'));
          },
        },
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    await expect(createChatCompletion(baseRequest, deps)).rejects.toMatchObject({ status: 400 });
    expect(fallbackCalled).toBe(false);
  });

  it('maps exhaustion of both attempts to all_providers_failed', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: failingAdapter('anthropic', new ProviderRequestError('anthropic', 503, 'down')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    await expect(createChatCompletion(baseRequest, deps)).rejects.toMatchObject({
      status: 502,
      data: { code: 'all_providers_failed' },
    });
  });

  it('aborts the provider request when the caller-supplied clientSignal fires', async () => {
    const clientController = new AbortController();
    let capturedSignal: AbortSignal | undefined;

    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: {
          id: 'openai',
          createChatCompletion: (_request, context) => {
            capturedSignal = context.signal;
            return Promise.resolve(stubResponse('a'));
          },
          streamChatCompletion: emptyStream,
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('b')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    clientController.abort();
    await createChatCompletion(baseRequest, deps, { clientSignal: clientController.signal });

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('maps a single retryable failure with no fallback to provider_error', async () => {
    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: succeedingAdapter('anthropic', stubResponse('c')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    await expect(createChatCompletion(baseRequest, deps)).rejects.toMatchObject({
      status: 502,
      data: { code: 'provider_error' },
    });
  });
});

describe('beginChatCompletionStream', () => {
  it('returns the first chunk and drains the rest from the primary provider', async () => {
    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('primary')),
        anthropic: succeedingAdapter('anthropic', stubResponse('b')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await beginChatCompletionStream({ ...baseRequest, stream: true }, deps);
    expect(result.firstChunk.choices[0]?.delta.content).toBe('primary');
    expect(result.servedBy.provider).toBe('openai');

    const rest: ChatCompletionChunk[] = [];
    for await (const chunk of result.remaining) rest.push(chunk);
    expect(rest).toHaveLength(0);
  });

  it('fails over to the fallback before the client sees any bytes', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await beginChatCompletionStream({ ...baseRequest, stream: true }, deps);
    expect(result.firstChunk.choices[0]?.delta.content).toBe('fallback');
  });

  it('treats an empty stream as a retryable provider failure', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: {
          ...succeedingAdapter('openai', stubResponse('a')),
          streamChatCompletion: emptyStream,
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await beginChatCompletionStream({ ...baseRequest, stream: true }, deps);
    expect(result.firstChunk.choices[0]?.delta.content).toBe('fallback');
  });

  it('aborts the upstream provider stream as soon as the client disconnects mid-stream', async () => {
    const clientController = new AbortController();
    let capturedSignal: AbortSignal | undefined;

    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: {
          id: 'openai',
          createChatCompletion: () => Promise.resolve(stubResponse('a')),
          // oxlint-disable-next-line require-await
          async *streamChatCompletion(_request, context) {
            capturedSignal = context.signal;
            yield {
              id: 'chunk-1',
              object: 'chat.completion.chunk',
              created: 1,
              model: 'primary-model',
              choices: [{ index: 0, delta: { content: 'first' }, finish_reason: null }],
            };
            // Simulates the client hanging up between two chunks, once streaming is underway.
            clientController.abort();
            yield {
              id: 'chunk-2',
              object: 'chat.completion.chunk',
              created: 1,
              model: 'primary-model',
              choices: [{ index: 0, delta: { content: 'second' }, finish_reason: 'stop' }],
            };
          },
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('b')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await beginChatCompletionStream({ ...baseRequest, stream: true }, deps, {
      clientSignal: clientController.signal,
    });

    expect(capturedSignal?.aborted).toBe(false);

    const rest: ChatCompletionChunk[] = [];
    for await (const chunk of result.remaining) rest.push(chunk);

    expect(rest).toHaveLength(1);
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('circuit breaker interplay', () => {
  it('skips a primary whose circuit is open and goes straight to the fallback', async () => {
    for (let count = 0; count < 5; count += 1) recordFailure('openai');
    let primaryCalled = false;

    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: {
          ...succeedingAdapter('openai', stubResponse('primary')),
          createChatCompletion: () => {
            primaryCalled = true;
            return Promise.resolve(stubResponse('primary'));
          },
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.servedBy.provider).toBe('anthropic');
    expect(primaryCalled).toBe(false);
  });

  it('still attempts a provider whose circuit is open when it is the only candidate', async () => {
    for (let count = 0; count < 5; count += 1) recordFailure('openai');

    const deps: DispatchDeps = {
      registry: registryWithoutFallback,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('primary')),
        anthropic: succeedingAdapter('anthropic', stubResponse('b')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.servedBy.provider).toBe('openai');
  });
});

describe('result metadata', () => {
  it('reports one attempt on a first-try success', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('primary')),
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.attempts).toBe(1);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('reports two attempts after one retryable failure', async () => {
    const deps: DispatchDeps = {
      registry: registryWithFallback,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.attempts).toBe(2);
  });
});

describe('multi-hop fallback chains', () => {
  const registryWithChain: ModelRegistryConfig = {
    version: 1,
    models: [
      {
        id: 'primary-model',
        provider: 'openai',
        providerModel: 'gpt-4o',
        fallbacks: ['fallback-model', 'second-fallback-model'],
      },
      { id: 'fallback-model', provider: 'anthropic', providerModel: 'claude-sonnet-4-5' },
      { id: 'second-fallback-model', provider: 'google', providerModel: 'gemini-2.5-pro' },
    ],
  };

  it('falls through two hops when the first two candidates fail', async () => {
    const deps: DispatchDeps = {
      registry: registryWithChain,
      adapters: {
        openai: failingAdapter('openai', new ProviderRequestError('openai', 503, 'down')),
        anthropic: failingAdapter('anthropic', new ProviderRequestError('anthropic', 503, 'down')),
        google: succeedingAdapter('google', stubResponse('second-fallback')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.response.id).toBe('second-fallback');
    expect(result.servedBy.provider).toBe('google');
    expect(result.attempts).toBe(3);
  });
});

describe('routing strategy', () => {
  const registryWithChain: ModelRegistryConfig = {
    version: 1,
    models: [
      {
        id: 'primary-model',
        provider: 'openai',
        providerModel: 'gpt-4o',
        fallbacks: ['fallback-model'],
        pricing: { inputPerMillionUsd: 10, outputPerMillionUsd: 10 },
      },
      {
        id: 'fallback-model',
        provider: 'anthropic',
        providerModel: 'claude-sonnet-4-5',
        pricing: { inputPerMillionUsd: 1, outputPerMillionUsd: 1 },
      },
    ],
  };

  it('prefers the cheaper healthy candidate first under a cost strategy', async () => {
    let primaryCalled = false;
    const deps: DispatchDeps = {
      registry: registryWithChain,
      adapters: {
        openai: {
          ...succeedingAdapter('openai', stubResponse('primary')),
          createChatCompletion: () => {
            primaryCalled = true;
            return Promise.resolve(stubResponse('primary'));
          },
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps, { routingStrategy: 'cost' });
    expect(result.servedBy.provider).toBe('anthropic');
    expect(primaryCalled).toBe(false);
  });

  it('prefers the lower-latency healthy candidate first under a latency strategy', async () => {
    recordLatency('primary-model', 500);
    recordLatency('fallback-model', 50);
    let primaryCalled = false;

    const deps: DispatchDeps = {
      registry: registryWithChain,
      adapters: {
        openai: {
          ...succeedingAdapter('openai', stubResponse('primary')),
          createChatCompletion: () => {
            primaryCalled = true;
            return Promise.resolve(stubResponse('primary'));
          },
        },
        anthropic: succeedingAdapter('anthropic', stubResponse('fallback')),
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps, { routingStrategy: 'latency' });
    expect(result.servedBy.provider).toBe('anthropic');
    expect(primaryCalled).toBe(false);
  });

  it('leaves registry order untouched with no strategy', async () => {
    let fallbackCalled = false;
    const deps: DispatchDeps = {
      registry: registryWithChain,
      adapters: {
        openai: succeedingAdapter('openai', stubResponse('primary')),
        anthropic: {
          ...succeedingAdapter('anthropic', stubResponse('fallback')),
          createChatCompletion: () => {
            fallbackCalled = true;
            return Promise.resolve(stubResponse('fallback'));
          },
        },
        google: succeedingAdapter('google', stubResponse('c')),
      },
      providerCredentials,
    };

    const result = await createChatCompletion(baseRequest, deps);
    expect(result.servedBy.provider).toBe('openai');
    expect(fallbackCalled).toBe(false);
  });
});
