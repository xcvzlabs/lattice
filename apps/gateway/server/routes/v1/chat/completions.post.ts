import {
  chatCompletionRequestSchema,
  type ChatCompletionChunk,
  type ChatCompletionUsage,
} from '@lattice/api-contract';
import { createRequestLogger, log } from 'evlog';
import { defineHandler, type H3Event } from 'nitro';
import { createEventStream } from 'nitro/h3';
import * as v from 'valibot';
import { recordUsage, type RecordUsageInput } from '../../../database/repositories/usage.ts';
import { dispatchDeps } from '../../../routing/deps.ts';
import { beginChatCompletionStream, createChatCompletion } from '../../../routing/dispatch.ts';
import { createLatticeError, toErrorLogFields } from '../../../utils/errors.ts';
import { assertWithinQuota } from '../../../utils/quota.ts';
import { getApplication, getRequestId } from '../../../utils/request-context.ts';

const DONE_MESSAGE = '[DONE]';

function toSseMessage(chunk: ChatCompletionChunk): string {
  return JSON.stringify(chunk);
}

/**
 * Usage accounting must never delay or fail the client response, so this is fired without
 * awaiting the result; any failure is logged and otherwise swallowed.
 */
function recordUsageInBackground(input: RecordUsageInput): void {
  void (async () => {
    try {
      await recordUsage(input);
    } catch (error) {
      log.error({
        message: 'Failed to record usage',
        error: error instanceof Error ? error.message : String(error),
        applicationId: input.applicationId,
      });
    }
  })();
}

type StreamLogContext = {
  applicationId: string;
  model: string;
  provider: string;
};

async function drainStreamInBackground(
  remaining: AsyncGenerator<ChatCompletionChunk, void, void>,
  stream: ReturnType<typeof createEventStream>,
  context: StreamLogContext,
): Promise<void> {
  let lastUsage: ChatCompletionUsage | undefined;

  try {
    for await (const chunk of remaining) {
      if (chunk.usage !== undefined && chunk.usage !== null) lastUsage = chunk.usage;
      await stream.push(toSseMessage(chunk));
    }
    await stream.push(DONE_MESSAGE);
  } catch (error) {
    log.error({
      message: 'Streaming response interrupted after bytes were sent to the client',
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
  } finally {
    await stream.close();

    recordUsageInBackground({
      applicationId: context.applicationId,
      model: context.model,
      provider: context.provider,
      promptTokens: lastUsage?.prompt_tokens,
      completionTokens: lastUsage?.completion_tokens,
      totalTokens: lastUsage?.total_tokens,
    });
  }
}

export default defineHandler(async (event: H3Event) => {
  const application = getApplication(event.req);

  if (application === undefined) {
    throw createLatticeError(401, 'missing_api_key', 'Missing API key');
  }

  await assertWithinQuota(application);

  const requestLog = createRequestLogger({
    method: event.req.method,
    path: event.url.pathname,
    requestId: getRequestId(event.req) ?? Bun.randomUUIDv7(),
  });

  requestLog.set({ applicationId: application.id });

  let rawBody: unknown;

  try {
    rawBody = await event.req.json();
  } catch {
    throw createLatticeError(400, 'invalid_request', 'Request body must be valid JSON');
  }

  const parsedBody = v.safeParse(chatCompletionRequestSchema, rawBody);

  if (!parsedBody.success) {
    throw createLatticeError(400, 'invalid_request', 'Invalid chat completion request body');
  }

  const request = parsedBody.output;
  requestLog.set({ model: request.model });

  if (request.stream) {
    const result = await beginChatCompletionStream(request, dispatchDeps);
    const stream = createEventStream(event);

    requestLog.set({ provider: result.servedBy.provider, status: 200 });
    requestLog.emit();

    await stream.push(toSseMessage(result.firstChunk));
    void drainStreamInBackground(result.remaining, stream, {
      applicationId: application.id,
      model: request.model,
      provider: result.servedBy.provider,
    });

    return stream.send();
  }

  try {
    const result = await createChatCompletion(request, dispatchDeps);

    requestLog.set({
      provider: result.servedBy.provider,
      status: 200,
      usage: {
        promptTokens: result.response.usage.prompt_tokens,
        completionTokens: result.response.usage.completion_tokens,
        totalTokens: result.response.usage.total_tokens,
      },
    });
    requestLog.emit();

    recordUsageInBackground({
      applicationId: application.id,
      model: request.model,
      provider: result.servedBy.provider,
      promptTokens: result.response.usage.prompt_tokens,
      completionTokens: result.response.usage.completion_tokens,
      totalTokens: result.response.usage.total_tokens,
    });

    return result.response;
  } catch (error) {
    const { status, code } = toErrorLogFields(error);

    requestLog.error(error instanceof Error ? error : String(error), { code: code ?? undefined });
    requestLog.set({ status });
    requestLog.emit();

    throw error;
  }
});
