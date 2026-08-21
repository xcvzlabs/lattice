import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderId } from '../../registry/models.ts';
import type { ProviderAdapter, ProviderAdapterDeps, ProviderRequestContext } from '../types.ts';
import * as v from 'valibot';
import { parseDataOnlySseStream } from '../sse.ts';
import { assertProviderOk } from '../types.ts';
import { toOpenAiRequest } from './request.ts';
import { fromOpenAiResponse, openAiChatCompletionSchema } from './response.ts';
import { openAiChunkSchema, parseOpenAiChunk } from './stream.ts';

export type OpenAiCompatibleAdapterOptions = {
  id: ProviderId;
  /** Human-readable name used in error messages, e.g. `OpenAI` rather than `openai`. */
  label: string;
  /** Full chat-completions endpoint, e.g. `https://api.openai.com/v1/chat/completions`. */
  endpointUrl: string;
};

type OpenAiCompatibleHeaders = {
  'content-type': 'application/json';
  authorization?: string;
};

function requestHeaders(apiKey: string | undefined): OpenAiCompatibleHeaders {
  const headers: OpenAiCompatibleHeaders = { 'content-type': 'application/json' };
  if (apiKey !== undefined) headers.authorization = `Bearer ${apiKey}`;
  return headers;
}

function requestInit(
  request: ChatCompletionRequest,
  context: ProviderRequestContext,
  stream: boolean,
): RequestInit {
  return {
    method: 'POST',
    headers: requestHeaders(context.apiKey),
    body: JSON.stringify(toOpenAiRequest({ ...request, stream }, context.providerModel)),
    signal: context.signal,
  };
}

/** Shared adapter for any provider that speaks the OpenAI chat-completions wire format (OpenAI itself, Ollama, vLLM). */
export function createOpenAiCompatibleAdapter(
  options: OpenAiCompatibleAdapterOptions,
  deps: ProviderAdapterDeps = {},
): ProviderAdapter {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function createChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): Promise<ChatCompletionResponse> {
    const response = await fetchImpl(options.endpointUrl, requestInit(request, context, false));

    assertProviderOk(response, options.id, options.label);

    const body: unknown = await response.json();
    return fromOpenAiResponse(v.parse(openAiChatCompletionSchema, body), request.model);
  }

  async function* streamChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void> {
    const response = await fetchImpl(options.endpointUrl, requestInit(request, context, true));

    assertProviderOk(response, options.id, options.label);

    for await (const event of parseDataOnlySseStream(response)) {
      yield parseOpenAiChunk(v.parse(openAiChunkSchema, event), request.model);
    }
  }

  return {
    id: options.id,
    createChatCompletion,
    streamChatCompletion,
  };
}
