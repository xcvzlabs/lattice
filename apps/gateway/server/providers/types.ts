import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderId } from '../registry/models.ts';

export type ProviderRequestContext = {
  apiKey: string;
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
