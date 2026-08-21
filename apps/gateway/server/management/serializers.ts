import type {
  Application as ApplicationDto,
  ApiKey as ApiKeyDto,
  RequestLog as RequestLogDto,
} from '@lattice/api-contract';
import type { ApiKey } from '../database/repositories/api-keys.ts';
import type { Application } from '../database/repositories/applications.ts';
import type { RequestLog } from '../database/repositories/request-logs.ts';

export function toApplicationDto(application: Application): ApplicationDto {
  return {
    id: application.id,
    name: application.name,
    createdAt: application.createdAt.toISOString(),
    monthlyTokenQuota: application.monthlyTokenQuota,
    rateLimitPerMinute: application.rateLimitPerMinute,
    disabledAt: application.disabledAt?.toISOString() ?? null,
    allowedModels: application.allowedModels,
    routingStrategy: application.routingStrategy,
  };
}

export function toApiKeyDto(apiKey: ApiKey): ApiKeyDto {
  return {
    id: apiKey.id,
    applicationId: apiKey.applicationId,
    keyPrefix: apiKey.keyPrefix,
    createdAt: apiKey.createdAt.toISOString(),
    revokedAt: apiKey.revokedAt?.toISOString() ?? null,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
  };
}

export function toRequestLogDto(requestLog: RequestLog): RequestLogDto {
  return {
    id: requestLog.id,
    applicationId: requestLog.applicationId,
    requestId: requestLog.requestId,
    model: requestLog.model,
    provider: requestLog.provider,
    status: requestLog.status,
    httpStatus: requestLog.httpStatus,
    errorCode: requestLog.errorCode,
    attempts: requestLog.attempts,
    latencyMs: requestLog.latencyMs,
    promptTokens: requestLog.promptTokens,
    completionTokens: requestLog.completionTokens,
    totalTokens: requestLog.totalTokens,
    estimatedCostUsd:
      requestLog.estimatedCostUsd === null ? null : Number(requestLog.estimatedCostUsd),
    createdAt: requestLog.createdAt.toISOString(),
  };
}
