import * as v from 'valibot';

export const requestLogSchema = v.object({
  id: v.string(),
  applicationId: v.string(),
  requestId: v.string(),
  model: v.string(),
  provider: v.nullable(v.string()),
  status: v.picklist(['success', 'error']),
  httpStatus: v.number(),
  errorCode: v.nullable(v.string()),
  attempts: v.number(),
  latencyMs: v.number(),
  promptTokens: v.nullable(v.number()),
  completionTokens: v.nullable(v.number()),
  totalTokens: v.nullable(v.number()),
  estimatedCostUsd: v.nullable(v.number()),
  createdAt: v.string(),
});
export type RequestLog = v.InferOutput<typeof requestLogSchema>;

export const requestLogListResponseSchema = v.object({
  data: v.array(requestLogSchema),
  limit: v.number(),
  offset: v.number(),
});
export type RequestLogListResponse = v.InferOutput<typeof requestLogListResponseSchema>;
