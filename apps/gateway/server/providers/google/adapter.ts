import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderAdapter, ProviderAdapterDeps, ProviderRequestContext } from '../types.ts';
import * as v from 'valibot';
import { parseDataOnlySseStream } from '../sse.ts';
import { ProviderRequestError } from '../types.ts';
import { toGeminiRequest } from './request.ts';
import { fromGeminiResponse, geminiResponseSchema } from './response.ts';
import { geminiChunkSchema, parseGeminiChunk } from './stream.ts';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Gemini takes its API key as a query parameter and its model as a URL path segment, not the body. */
function endpointUrl(
  providerModel: string,
  method: string,
  apiKey: string,
  stream: boolean,
): string {
  const query = stream
    ? `alt=sse&key=${encodeURIComponent(apiKey)}`
    : `key=${encodeURIComponent(apiKey)}`;
  return `${GEMINI_BASE_URL}/${providerModel}:${method}?${query}`;
}

export function createGoogleAdapter(deps: ProviderAdapterDeps = {}): ProviderAdapter {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function createChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): Promise<ChatCompletionResponse> {
    const response = await fetchImpl(
      endpointUrl(context.providerModel, 'generateContent', context.apiKey, false),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toGeminiRequest(request)),
        signal: context.signal,
      },
    );

    if (!response.ok) {
      throw new ProviderRequestError(
        'google',
        response.status,
        `Google request failed (${response.status})`,
      );
    }

    const body: unknown = await response.json();
    return fromGeminiResponse(v.parse(geminiResponseSchema, body), request.model);
  }

  async function* streamChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void> {
    const response = await fetchImpl(
      endpointUrl(context.providerModel, 'streamGenerateContent', context.apiKey, true),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toGeminiRequest(request)),
        signal: context.signal,
      },
    );

    if (!response.ok) {
      throw new ProviderRequestError(
        'google',
        response.status,
        `Google request failed (${response.status})`,
      );
    }

    for await (const event of parseDataOnlySseStream(response)) {
      yield parseGeminiChunk(v.parse(geminiChunkSchema, event), request.model);
    }
  }

  return {
    id: 'google',
    createChatCompletion,
    streamChatCompletion,
  };
}
