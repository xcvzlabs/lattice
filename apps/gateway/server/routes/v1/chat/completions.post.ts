import { chatCompletionRequestSchema, type ChatCompletionChunk } from '@lattice/api-contract';
import { createRequestLogger, log } from 'evlog';
import { defineHandler, type H3Event } from 'nitro';
import { createEventStream } from 'nitro/h3';
import * as v from 'valibot';
import { dispatchDeps } from '../../../routing/deps.ts';
import { beginChatCompletionStream, createChatCompletion } from '../../../routing/dispatch.ts';
import { createLatticeError, toErrorLogFields } from '../../../utils/errors.ts';
import { getApplication, getRequestId } from '../../../utils/request-context.ts';

const DONE_MESSAGE = '[DONE]';

function toSseMessage(chunk: ChatCompletionChunk): string {
  return JSON.stringify(chunk);
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
  try {
    for await (const chunk of remaining) {
      await stream.push(toSseMessage(chunk));
    }
    await stream.push(DONE_MESSAGE);
  } catch (error) {
    // The client has already received bytes from this stream. Per the documented Phase 1
    // limitation, a mid-stream failure just ends the connection rather than failing over. The
    // request-scoped wide event has already emitted by this point (it's emitted around
    // stream.send(), not when the streamed body finishes), so this uses evlog's global log API
    // instead of the per-request logger, which would silently no-op after emit.
    log.error({
      message: 'Streaming response interrupted after bytes were sent to the client',
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
  } finally {
    await stream.close();
  }
}

export default defineHandler(async (event: H3Event) => {
  const application = getApplication(event.req);
  if (application === undefined) {
    throw createLatticeError(401, 'missing_api_key', 'Missing API key');
  }

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

    return result.response;
  } catch (error) {
    const { status, code } = toErrorLogFields(error);

    requestLog.error(error instanceof Error ? error : String(error), { code: code ?? undefined });
    requestLog.set({ status });
    requestLog.emit();

    throw error;
  }
});
