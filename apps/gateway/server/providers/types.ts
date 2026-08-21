import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderId } from '../registry/models.ts';

export type ProviderRequestContext = {
  /** Absent for self-hosted providers that run without authentication. */
  apiKey?: string;
  providerModel: string;
  signal: AbortSignal;
};

export type ProviderAdapter = {
  id: ProviderId;
  createChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): Promise<ChatCompletionResponse>;
  streamChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void>;
};

/** Narrower than `typeof fetch` so test stubs don't need to match Bun's extra static members. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ProviderAdapterDeps = {
  fetchImpl?: FetchLike;
};

/** Carries the upstream HTTP status so dispatch can decide whether a failure is retryable. */
export class ProviderRequestError extends Error {
  readonly status: number;
  readonly provider: ProviderId;

  constructor(provider: ProviderId, status: number, message: string) {
    super(message);
    this.name = 'ProviderRequestError';
    this.status = status;
    this.provider = provider;
  }
}

/** Throws the shared "request failed" `ProviderRequestError` shape for a non-2xx response, so
 * every adapter reports a failed upstream call the same way. */
export function assertProviderOk(response: Response, provider: ProviderId, label: string): void {
  if (response.ok) return;

  throw new ProviderRequestError(
    provider,
    response.status,
    `${label} request failed (${response.status})`,
  );
}

/**
 * Narrows `ProviderRequestContext.apiKey` to `string` for cloud provider adapters, which
 * always require one. The registry only lets a cloud-provider model through boot-time
 * validation when an API key is configured, so a missing key here means dispatch deps
 * drifted out of sync with the registry, not a real per-request condition.
 */
export function requireApiKey(context: ProviderRequestContext, provider: ProviderId): string {
  if (context.apiKey === undefined) {
    throw new ProviderRequestError(provider, 500, `Missing API key for provider "${provider}"`);
  }

  return context.apiKey;
}
