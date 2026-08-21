import * as v from 'valibot';

export const usageSummaryRowSchema = v.object({
  day: v.string(),
  requests: v.number(),
  totalTokens: v.number(),
  estimatedCostUsd: v.number(),
});
export type UsageSummaryRow = v.InferOutput<typeof usageSummaryRowSchema>;

export const usageSummaryResponseSchema = v.object({
  data: v.array(usageSummaryRowSchema),
});
export type UsageSummaryResponse = v.InferOutput<typeof usageSummaryResponseSchema>;
