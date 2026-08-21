import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  RoutingStrategy,
} from '@lattice/api-contract';
import type { ProviderAdapter } from '../providers/types.ts';
import type { ProviderCredentials } from '../registry/credentials.ts';
import { HTTPError } from 'nitro';
import { ProviderRequestError } from '../providers/types.ts';
import {
  lookupModel,
  type ModelRegistryConfig,
  type ModelRegistryEntry,
  type ProviderId,
} from '../registry/models.ts';
import { createLatticeError } from '../utils/errors.ts';
import { currentState, recordFailure, recordSuccess } from './circuit-breaker.ts';
import { recordLatency } from './latency-tracker.ts';
import { rankCandidates } from './scoring.ts';

export type ProviderAdapters = Partial<Record<ProviderId, ProviderAdapter>>;

export type DispatchDeps = {
  registry: ModelRegistryConfig;
  adapters: ProviderAdapters;
  providerCredentials: ProviderCredentials;
};

export type DispatchContext = {
  /** `undefined` preserves the registry's declared candidate order (today's behavior). */
  routingStrategy?: RoutingStrategy;
  /** Fired after every attempt, including ones that lead to a thrown error, so a caller can
   * observe the final attempt count even when there's no successful result to read it from. */
  onAttempt?: (attempts: number) => void;
};

export type ChatCompletionDispatchResult = {
  response: ChatCompletionResponse;
  servedBy: ModelRegistryEntry;
  latencyMs: number;
  attempts: number;
};

export type StreamDispatchResult = {
  firstChunk: ChatCompletionChunk;
  remaining: AsyncGenerator<ChatCompletionChunk, void, void>;
  servedBy: ModelRegistryEntry;
  latencyMs: number;
  attempts: number;
};

type IdleAbortController = {
  signal: AbortSignal;
  reset: () => void;
  clear: () => void;
};

type ResolvedProvider = {
  adapter: ProviderAdapter;
  apiKey?: string;
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

/** `[primary, ...primary.fallbacks]`, flat and explicit — each entry's own chain, no recursion. */
function candidateOrder(
  registry: ModelRegistryConfig,
  modelId: string,
): ModelRegistryEntry[] | undefined {
  const primary = lookupModel(registry, modelId);
  if (primary === undefined) return undefined;

  const fallbacks = (primary.fallbacks ?? [])
    .map((id) => lookupModel(registry, id))
    .filter((entry) => entry !== undefined);

  return [primary, ...fallbacks];
}

/**
 * Drops any entry whose circuit is `open`, so a known-down provider doesn't eat a full
 * request timeout before falling over. Never drops down to zero attempts: if every
 * candidate is open, the original order is tried anyway rather than failing the request
 * on our own circuit-breaker bookkeeping. The surviving candidates are then reordered by
 * `strategy` — `undefined` leaves the registry's declared order untouched.
 */
function resolveAttemptOrder(
  registry: ModelRegistryConfig,
  modelId: string,
  strategy: RoutingStrategy | undefined,
): ModelRegistryEntry[] | undefined {
  const candidates = candidateOrder(registry, modelId);
  if (candidates === undefined) return undefined;

  const usable = candidates.filter((entry) => currentState(entry.provider) !== 'open');
  return rankCandidates(usable.length > 0 ? usable : candidates, strategy);
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

/**
 * `apiKey` may legitimately be `undefined` for a self-hosted provider running without
 * authentication. This only throws when the provider has no credentials entry or no
 * constructed adapter at all, which the registry's boot-time validation should already
 * have prevented for any routable model, so a request-time failure here means dispatch
 * deps drifted out of sync with the registry, not a real per-request condition.
 */
function resolveProvider(deps: DispatchDeps, provider: ProviderId): ResolvedProvider {
  const credentials = deps.providerCredentials[provider];
  const adapter = deps.adapters[provider];

  if (credentials === undefined || adapter === undefined) {
    throw createLatticeError(500, 'provider_error', `Provider "${provider}" is not configured`);
  }

  return { adapter, apiKey: credentials.apiKey };
}

export async function createChatCompletion(
  request: ChatCompletionRequest,
  deps: DispatchDeps,
  context: DispatchContext = {},
): Promise<ChatCompletionDispatchResult> {
  const attemptOrder = resolveAttemptOrder(deps.registry, request.model, context.routingStrategy);

  if (attemptOrder === undefined) {
    throw createLatticeError(404, 'model_not_found', `Unknown model "${request.model}"`);
  }

  const startedAt = performance.now();
  let lastError: unknown;
  let attempts = 0;

  for (const entry of attemptOrder) {
    attempts += 1;
    context.onAttempt?.(attempts);
    const { adapter, apiKey } = resolveProvider(deps, entry.provider);

    try {
      // oxlint-disable-next-line no-await-in-loop
      const response = await adapter.createChatCompletion(request, {
        apiKey,
        providerModel: entry.providerModel,
        signal: AbortSignal.timeout(NON_STREAMING_TIMEOUT_MS),
      });

      const latencyMs = performance.now() - startedAt;
      recordSuccess(entry.provider);
      recordLatency(entry.id, latencyMs);

      return {
        response,
        servedBy: entry,
        latencyMs,
        attempts,
      };
    } catch (error) {
      lastError = error;
      if (!isRetryableProviderError(error)) throw error;
      recordFailure(entry.provider);
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
  context: DispatchContext = {},
): Promise<StreamDispatchResult> {
  const attemptOrder = resolveAttemptOrder(deps.registry, request.model, context.routingStrategy);

  if (attemptOrder === undefined) {
    throw createLatticeError(404, 'model_not_found', `Unknown model "${request.model}"`);
  }

  const startedAt = performance.now();
  let lastError: unknown;
  let attempts = 0;

  for (const entry of attemptOrder) {
    attempts += 1;
    context.onAttempt?.(attempts);
    const { adapter, apiKey } = resolveProvider(deps, entry.provider);
    const idle = createIdleAbortController(STREAM_IDLE_TIMEOUT_MS);

    try {
      const generator = adapter.streamChatCompletion(request, {
        apiKey,
        providerModel: entry.providerModel,
        signal: idle.signal,
      });

      // oxlint-disable-next-line no-await-in-loop
      const { value, done } = await generator.next();

      if (done || value === undefined) {
        throw new ProviderRequestError(
          entry.provider,
          502,
          'Provider stream ended before producing any output',
        );
      }

      const latencyMs = performance.now() - startedAt;
      idle.reset();
      recordSuccess(entry.provider);
      recordLatency(entry.id, latencyMs);

      return {
        firstChunk: value,
        remaining: drainWithIdleReset(generator, idle.reset, idle.clear),
        servedBy: entry,
        latencyMs,
        attempts,
      };
    } catch (error) {
      idle.clear();
      lastError = error;

      if (!isRetryableProviderError(error)) throw error;
      recordFailure(entry.provider);
    }
  }

  throw toDispatchError(lastError, attemptOrder.length);
}
