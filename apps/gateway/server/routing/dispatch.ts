import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderAdapter } from '../providers/types.ts';
import { HTTPError } from 'nitro';
import { ProviderRequestError } from '../providers/types.ts';
import {
  lookupModel,
  type ModelRegistryConfig,
  type ModelRegistryEntry,
  type ProviderApiKeys,
  type ProviderId,
} from '../registry/models.ts';
import { createLatticeError } from '../utils/errors.ts';

export type ProviderAdapters = Record<ProviderId, ProviderAdapter>;

export type DispatchDeps = {
  registry: ModelRegistryConfig;
  adapters: ProviderAdapters;
  providerApiKeys: ProviderApiKeys;
};

export type ChatCompletionDispatchResult = {
  response: ChatCompletionResponse;
  servedBy: ModelRegistryEntry;
};

export type StreamDispatchResult = {
  firstChunk: ChatCompletionChunk;
  remaining: AsyncGenerator<ChatCompletionChunk, void, void>;
  servedBy: ModelRegistryEntry;
};

type IdleAbortController = {
  signal: AbortSignal;
  reset: () => void;
  clear: () => void;
};

const NON_STREAMING_TIMEOUT_MS = 60_000;
const STREAM_IDLE_TIMEOUT_MS = 30_000;

/** 5xx/timeout/connection failures are worth retrying against the fallback; a bad request (4xx) is not. */
export function isRetryableProviderError(cause: unknown): boolean {
  if (cause instanceof ProviderRequestError) return cause.status >= 500;
  if (cause instanceof DOMException && cause.name === 'TimeoutError') return true;
  if (cause instanceof TypeError) return true;
  return false;
}

function resolveAttemptOrder(
  registry: ModelRegistryConfig,
  modelId: string,
): ModelRegistryEntry[] | undefined {
  const primary = lookupModel(registry, modelId);
  if (primary === undefined) return undefined;
  if (primary.fallback === undefined) return [primary];

  const fallback = lookupModel(registry, primary.fallback);
  return fallback === undefined ? [primary] : [primary, fallback];
}

/** Converts an exhausted retry loop's last error into a client-facing envelope; errors that are
 * already HTTPError (e.g. from requireApiKey/resolveAttemptOrder) pass through unchanged since
 * they exit the loop immediately and never reach this. It only wraps raw adapter failures. */
function toDispatchError(cause: unknown, attemptCount: number): HTTPError {
  if (HTTPError.isError(cause)) {
    return cause;
  }

  if (attemptCount > 1) {
    return createLatticeError(
      502,
      'all_providers_failed',
      'All configured providers failed to handle this request',
    );
  }

  return createLatticeError(502, 'provider_error', 'The provider failed to handle this request');
}

function requireApiKey(providerApiKeys: ProviderApiKeys, provider: ProviderId): string {
  const apiKey = providerApiKeys[provider];

  if (apiKey === undefined) {
    throw createLatticeError(
      500,
      'provider_error',
      `No API key configured for provider "${provider}"`,
    );
  }

  return apiKey;
}

export async function createChatCompletion(
  request: ChatCompletionRequest,
  deps: DispatchDeps,
): Promise<ChatCompletionDispatchResult> {
  const attemptOrder = resolveAttemptOrder(deps.registry, request.model);

  if (attemptOrder === undefined) {
    throw createLatticeError(404, 'model_not_found', `Unknown model "${request.model}"`);
  }

  let lastError: unknown;

  for (const entry of attemptOrder) {
    const apiKey = requireApiKey(deps.providerApiKeys, entry.provider);

    try {
      // This is a failover loop, not a batch. The fallback must only be called if the primary
      // actually fails, so Promise.all would be wrong here, not a speedup.
      // oxlint-disable-next-line no-await-in-loop
      const response = await deps.adapters[entry.provider].createChatCompletion(request, {
        apiKey,
        providerModel: entry.providerModel,
        signal: AbortSignal.timeout(NON_STREAMING_TIMEOUT_MS),
      });

      return {
        response,
        servedBy: entry,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error)) throw error;
    }
  }

  throw toDispatchError(lastError, attemptOrder.length);
}

function createIdleAbortController(idleTimeoutMs: number): IdleAbortController {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(): void {
    if (timer !== undefined) clearTimeout(timer);

    timer = setTimeout(() => {
      controller.abort(new DOMException('Provider stream went idle', 'TimeoutError'));
    }, idleTimeoutMs);
  }

  function clear(): void {
    if (timer !== undefined) clearTimeout(timer);
  }

  reset();

  return {
    signal: controller.signal,
    reset,
    clear,
  };
}

async function* drainWithIdleReset(
  generator: AsyncGenerator<ChatCompletionChunk, void, void>,
  reset: () => void,
  clear: () => void,
): AsyncGenerator<ChatCompletionChunk, void, void> {
  try {
    for await (const chunk of generator) {
      reset();
      yield chunk;
    }
  } finally {
    clear();
  }
}

/**
 * Failover for streaming responses can only happen before the first byte reaches the client. This
 * pulls exactly one chunk from each attempt before committing to it, so the caller only ever sees
 * the chunks of whichever attempt actually produced output, never a failed attempt's partial
 * bytes. A failure once `remaining` is being drained is a documented Phase 1 limitation. The
 * connection simply ends, since the client has already started receiving the winning attempt.
 */
export async function beginChatCompletionStream(
  request: ChatCompletionRequest,
  deps: DispatchDeps,
): Promise<StreamDispatchResult> {
  const attemptOrder = resolveAttemptOrder(deps.registry, request.model);

  if (attemptOrder === undefined) {
    throw createLatticeError(404, 'model_not_found', `Unknown model "${request.model}"`);
  }

  let lastError: unknown;

  for (const entry of attemptOrder) {
    const apiKey = requireApiKey(deps.providerApiKeys, entry.provider);
    const idle = createIdleAbortController(STREAM_IDLE_TIMEOUT_MS);

    try {
      const generator = deps.adapters[entry.provider].streamChatCompletion(request, {
        apiKey,
        providerModel: entry.providerModel,
        signal: idle.signal,
      });

      // Same reasoning as above. This only ever runs for the current attempt, and a fallback
      // attempt must not start until this one has proven itself unusable.
      // oxlint-disable-next-line no-await-in-loop
      const { value, done } = await generator.next();

      if (done || value === undefined) {
        throw new ProviderRequestError(
          entry.provider,
          502,
          'Provider stream ended before producing any output',
        );
      }

      idle.reset();

      return {
        firstChunk: value,
        remaining: drainWithIdleReset(generator, idle.reset, idle.clear),
        servedBy: entry,
      };
    } catch (error) {
      idle.clear();
      lastError = error;
      if (!isRetryableProviderError(error)) throw error;
    }
  }

  throw toDispatchError(lastError, attemptOrder.length);
}
