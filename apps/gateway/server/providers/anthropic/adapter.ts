import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@lattice/api-contract';
import type { ProviderAdapter, ProviderAdapterDeps, ProviderRequestContext } from '../types.ts';
import * as v from 'valibot';
import { parseNamedEventSseStream } from '../sse.ts';
import { ProviderRequestError } from '../types.ts';
import { toAnthropicRequest } from './request.ts';
import { anthropicResponseSchema, fromAnthropicResponse } from './response.ts';
import {
  anthropicSseEventSchema,
  reduceAnthropicEvent,
  type AnthropicStreamState,
} from './stream.ts';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function headersFor(apiKey: string): HeadersInit {
  return {
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json',
  };
}

export function createAnthropicAdapter(deps: ProviderAdapterDeps = {}): ProviderAdapter {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function createChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): Promise<ChatCompletionResponse> {
    const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: headersFor(context.apiKey),
      body: JSON.stringify(toAnthropicRequest(request, context.providerModel, false)),
      signal: context.signal,
    });

    if (!response.ok) {
      throw new ProviderRequestError(
        'anthropic',
        response.status,
        `Anthropic request failed (${response.status})`,
      );
    }

    const body: unknown = await response.json();
    return fromAnthropicResponse(v.parse(anthropicResponseSchema, body), request.model);
  }

  async function* streamChatCompletion(
    request: ChatCompletionRequest,
    context: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void> {
    const response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: headersFor(context.apiKey),
      body: JSON.stringify(toAnthropicRequest(request, context.providerModel, true)),
      signal: context.signal,
    });

    if (!response.ok) {
      throw new ProviderRequestError(
        'anthropic',
        response.status,
        `Anthropic request failed (${response.status})`,
      );
    }

    let state: AnthropicStreamState = {
      id: '',
      inputTokens: 0,
    };

    for await (const { data } of parseNamedEventSseStream(response)) {
      const event = v.parse(anthropicSseEventSchema, data);
      const result = reduceAnthropicEvent(state, event, request.model);
      state = result.state;
      if (result.chunk !== null) yield result.chunk;
    }
  }

  return {
    id: 'anthropic',
    createChatCompletion,
    streamChatCompletion,
  };
}
