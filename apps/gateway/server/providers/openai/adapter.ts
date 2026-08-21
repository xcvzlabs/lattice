import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderAdapter, ProviderAdapterDeps, ProviderRequestContext } from '../types.ts';
import * as v from 'valibot';
import { parseDataOnlySseStream } from '../sse.ts';
import { ProviderRequestError } from '../types.ts';
import { toOpenAiRequest } from './request.ts';
import { fromOpenAiResponse, openAiChatCompletionSchema } from './response.ts';
import { openAiChunkSchema, parseOpenAiChunk } from './stream.ts';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

function requestInit(
  request: ChatCompletionRequest,
  context: ProviderRequestContext,
  stream: boolean,
): RequestInit {
  return {
    method: 'POST',
    headers: {
      authorization: `Bearer ${context.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(toOpenAiRequest({ ...request, stream }, context.providerModel)),
    signal: context.signal,
  };
}

export function createOpenAiAdapter(deps: ProviderAdapterDeps = {}): ProviderAdapter {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function createChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): Promise<ChatCompletionResponse> {
    const response = await fetchImpl(
      OPENAI_CHAT_COMPLETIONS_URL,
      requestInit(request, context, false),
    );
    if (!response.ok) {
      throw new ProviderRequestError(
        'openai',
        response.status,
        `OpenAI request failed (${response.status})`,
      );
    }

    const body: unknown = await response.json();
    return fromOpenAiResponse(v.parse(openAiChatCompletionSchema, body), request.model);
  }

  async function* streamChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void> {
    const response = await fetchImpl(
      OPENAI_CHAT_COMPLETIONS_URL,
      requestInit(request, context, true),
    );

    if (!response.ok) {
      throw new ProviderRequestError(
        'openai',
        response.status,
        `OpenAI request failed (${response.status})`,
      );
    }

    for await (const event of parseDataOnlySseStream(response)) {
      yield parseOpenAiChunk(v.parse(openAiChunkSchema, event), request.model);
    }
  }

  return {
    id: 'openai',
    createChatCompletion,
    streamChatCompletion,
  };
}
