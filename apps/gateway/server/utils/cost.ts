import type { ModelRegistryEntry } from '../registry/models.ts';

export type CostEstimateUsage = {
  promptTokens?: number;
  completionTokens?: number;
};

/** `undefined` when the entry has no configured pricing or usage is unknown for this request. */
export function estimateCost(
  entry: ModelRegistryEntry,
  usage: CostEstimateUsage,
): number | undefined {
  if (entry.pricing === undefined) return undefined;
  if (usage.promptTokens === undefined || usage.completionTokens === undefined) return undefined;

  const inputCost = (usage.promptTokens / 1_000_000) * entry.pricing.inputPerMillionUsd;
  const outputCost = (usage.completionTokens / 1_000_000) * entry.pricing.outputPerMillionUsd;

  return inputCost + outputCost;
}
