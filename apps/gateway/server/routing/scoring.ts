import type { RoutingStrategy } from '@lattice/api-contract';
import type { ModelRegistryEntry } from '../registry/models.ts';
import { averageLatency } from './latency-tracker.ts';

/** Blended $/million-token price. Lower is cheaper. `undefined` when the entry has no pricing. */
function costScore(entry: ModelRegistryEntry): number | undefined {
  if (entry.pricing === undefined) return undefined;
  return entry.pricing.inputPerMillionUsd + entry.pricing.outputPerMillionUsd;
}

function latencyScore(entry: ModelRegistryEntry): number | undefined {
  return averageLatency(entry.id);
}

/** Min-max normalizes `values` (ignoring `undefined`s) to `[0, 1]`; every value equal maps to 0. */
function normalize(values: (number | undefined)[]): (number | undefined)[] {
  const known = values.filter((value) => value !== undefined);
  const min = Math.min(...known);
  const max = Math.max(...known);
  const range = max - min;

  return values.map((value) =>
    value === undefined ? undefined : range === 0 ? 0 : (value - min) / range,
  );
}

function balancedScores(candidates: ModelRegistryEntry[]): (number | undefined)[] {
  const normalizedCost = normalize(candidates.map(costScore));
  const normalizedLatency = normalize(candidates.map(latencyScore));

  return normalizedCost.map((cost, index) => {
    const latency = normalizedLatency[index];
    if (cost === undefined && latency === undefined) return undefined;
    if (cost === undefined) return latency;
    if (latency === undefined) return cost;
    return cost * 0.5 + latency * 0.5;
  });
}

/**
 * Stable-sorts `candidates` ascending by the same-indexed `scores` entry. A candidate with no
 * score (no pricing, or no latency sample yet) sorts after every scored candidate, but is never
 * dropped — an unranked candidate is still a valid fallback.
 */
function sortByScores(
  candidates: ModelRegistryEntry[],
  scores: (number | undefined)[],
): ModelRegistryEntry[] {
  return candidates
    .map((entry, index) => ({ entry, index, value: scores[index] }))
    .toSorted((left, right) => {
      if (left.value === undefined && right.value === undefined) return left.index - right.index;
      if (left.value === undefined) return 1;
      if (right.value === undefined) return -1;
      return left.value - right.value || left.index - right.index;
    })
    .map(({ entry }) => entry);
}

/**
 * Reorders `candidates` (already filtered for circuit health by the caller) by the requesting
 * application's routing preference. `undefined` strategy preserves the registry's declared
 * order untouched — today's deterministic behavior for every application without an explicit
 * policy.
 */
export function rankCandidates(
  candidates: ModelRegistryEntry[],
  strategy: RoutingStrategy | undefined,
): ModelRegistryEntry[] {
  if (strategy === undefined) return candidates;
  if (strategy === 'cost') return sortByScores(candidates, candidates.map(costScore));
  if (strategy === 'latency') return sortByScores(candidates, candidates.map(latencyScore));
  return sortByScores(candidates, balancedScores(candidates));
}
