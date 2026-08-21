import * as v from 'valibot';
import { routingStrategySchema } from './routing-strategy.ts';

export const applicationSchema = v.object({
  id: v.string(),
  name: v.string(),
  createdAt: v.string(),
  monthlyTokenQuota: v.nullable(v.number()),
  rateLimitPerMinute: v.nullable(v.number()),
  disabledAt: v.nullable(v.string()),
  allowedModels: v.nullable(v.array(v.string())),
  routingStrategy: v.nullable(routingStrategySchema),
});
export type Application = v.InferOutput<typeof applicationSchema>;

export const applicationListResponseSchema = v.object({
  data: v.array(applicationSchema),
});
export type ApplicationListResponse = v.InferOutput<typeof applicationListResponseSchema>;

export const createApplicationRequestSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
});
export type CreateApplicationRequest = v.InferOutput<typeof createApplicationRequestSchema>;

// `disabled` is a boolean toggle rather than exposing the raw `disabledAt` timestamp for a
// client to set directly — the gateway owns when that timestamp is written.
export const updateApplicationRequestSchema = v.object({
  name: v.optional(v.pipe(v.string(), v.minLength(1))),
  monthlyTokenQuota: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  rateLimitPerMinute: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
  allowedModels: v.optional(v.nullable(v.array(v.pipe(v.string(), v.minLength(1))))),
  routingStrategy: v.optional(v.nullable(routingStrategySchema)),
  disabled: v.optional(v.boolean()),
});
export type UpdateApplicationRequest = v.InferOutput<typeof updateApplicationRequestSchema>;
