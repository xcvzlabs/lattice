import type { ModelRegistryEntry } from '../../../registry/models.ts';
import {
  chatCompletionRequestSchema,
  type ChatCompletionChunk,
  type ChatCompletionUsage,
} from '@lattice/api-contract';
import { createRequestLogger, log } from 'evlog';
import { defineHandler, type H3Event } from 'nitro';
import { createEventStream } from 'nitro/h3';
import * as v from 'valibot';
import {
  recordRequestLog,
  type RecordRequestLogInput,
} from '../../../database/repositories/request-logs.ts';
import { recordUsage, type RecordUsageInput } from '../../../database/repositories/usage.ts';
import { dispatchDeps } from '../../../routing/deps.ts';
import {
  beginChatCompletionStream,
  createChatCompletion,
  type DispatchContext,
} from '../../../routing/dispatch.ts';
import { estimateCost } from '../../../utils/cost.ts';
import { createLatticeError, toErrorLogFields } from '../../../utils/errors.ts';
import { assertModelPermitted } from '../../../utils/policy.ts';
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

/** Same fire-and-forget contract as recordUsageInBackground: observability must never delay or
 * fail the client response. */
function recordRequestLogInBackground(input: RecordRequestLogInput): void {
  void (async () => {
    try {
      await recordRequestLog(input);
    } catch (error) {
      log.error({
        message: 'Failed to record request log',
        error: error instanceof Error ? error.message : String(error),
        applicationId: input.applicationId,
      });
    }
  })();
}

type StreamLogContext = {
  applicationId: string;
  requestId: string;
  model: string;
  servedBy: ModelRegistryEntry;
  attempts: number;
  latencyMs: number;
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
      applicationId: context.applicationId,
      model: context.model,
      provider: context.servedBy.provider,
    });
  } finally {
    await stream.close();

    recordUsageInBackground({
      applicationId: context.applicationId,
      model: context.model,
      provider: context.servedBy.provider,
      promptTokens: lastUsage?.prompt_tokens,
      completionTokens: lastUsage?.completion_tokens,
      totalTokens: lastUsage?.total_tokens,
    });

    recordRequestLogInBackground({
      applicationId: context.applicationId,
      requestId: context.requestId,
      model: context.model,
      provider: context.servedBy.provider,
      status: 'success',
      httpStatus: 200,
      attempts: context.attempts,
      latencyMs: context.latencyMs,
      promptTokens: lastUsage?.prompt_tokens,
      completionTokens: lastUsage?.completion_tokens,
      totalTokens: lastUsage?.total_tokens,
      estimatedCostUsd: estimateCost(context.servedBy, {
        promptTokens: lastUsage?.prompt_tokens,
        completionTokens: lastUsage?.completion_tokens,
      }),
    });
  }
}

export default defineHandler(async (event: H3Event) => {
  const requestStartedAt = performance.now();
  const application = getApplication(event.req);

  if (application === undefined) {
    throw createLatticeError(401, 'missing_api_key', 'Missing API key');
  }

  await assertWithinQuota(application);

  const requestId = getRequestId(event.req) ?? Bun.randomUUIDv7();
  const requestLog = createRequestLogger({
    method: event.req.method,
    path: event.url.pathname,
    requestId,
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

  assertModelPermitted(application, request.model);

  let attemptsSoFar = 0;
  const dispatchContext: DispatchContext = {
    routingStrategy: application.routingStrategy ?? undefined,
    onAttempt: (attempts) => {
      attemptsSoFar = attempts;
    },
  };

  if (request.stream) {
    let result: Awaited<ReturnType<typeof beginChatCompletionStream>>;

    try {
      result = await beginChatCompletionStream(request, dispatchDeps, dispatchContext);
    } catch (error) {
      const { status, code } = toErrorLogFields(error);

      requestLog.error(error instanceof Error ? error : String(error), {
        code: code ?? undefined,
      });
      requestLog.set({ status });
      requestLog.emit();

      recordRequestLogInBackground({
        applicationId: application.id,
        requestId,
        model: request.model,
        status: 'error',
        httpStatus: status,
        errorCode: code ?? undefined,
        attempts: attemptsSoFar,
        latencyMs: performance.now() - requestStartedAt,
      });

      throw error;
    }

    const stream = createEventStream(event);

    requestLog.set({ provider: result.servedBy.provider, status: 200 });
    requestLog.emit();

    await stream.push(toSseMessage(result.firstChunk));
    void drainStreamInBackground(result.remaining, stream, {
      applicationId: application.id,
      requestId,
      model: request.model,
      servedBy: result.servedBy,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
    });

    return stream.send();
  }

  try {
    const result = await createChatCompletion(request, dispatchDeps, dispatchContext);

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

    recordRequestLogInBackground({
      applicationId: application.id,
      requestId,
      model: request.model,
      provider: result.servedBy.provider,
      status: 'success',
      httpStatus: 200,
      attempts: result.attempts,
      latencyMs: result.latencyMs,
      promptTokens: result.response.usage.prompt_tokens,
      completionTokens: result.response.usage.completion_tokens,
      totalTokens: result.response.usage.total_tokens,
      estimatedCostUsd: estimateCost(result.servedBy, {
        promptTokens: result.response.usage.prompt_tokens,
        completionTokens: result.response.usage.completion_tokens,
      }),
    });

    return result.response;
  } catch (error) {
    const { status, code } = toErrorLogFields(error);

    requestLog.error(error instanceof Error ? error : String(error), { code: code ?? undefined });
    requestLog.set({ status });
    requestLog.emit();

    recordRequestLogInBackground({
      applicationId: application.id,
      requestId,
      model: request.model,
      status: 'error',
      httpStatus: status,
      errorCode: code ?? undefined,
      attempts: attemptsSoFar,
      latencyMs: performance.now() - requestStartedAt,
    });

    throw error;
  }
});
