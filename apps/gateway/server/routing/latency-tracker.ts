const EWMA_ALPHA = 0.2;

/**
 * Per-process, in-memory only — the same accepted tradeoff as circuit-breaker.ts. A
 * multi-instance deployment gets one latency view per instance rather than a shared one.
 */
const averages = new Map<string, number>();

/** Folds a new sample into the running exponentially-weighted moving average for `modelId`. */
export function recordLatency(modelId: string, durationMs: number): void {
  const previous = averages.get(modelId);
  const next =
    previous === undefined ? durationMs : previous + EWMA_ALPHA * (durationMs - previous);
  averages.set(modelId, next);
}

/** `undefined` means no sample has been recorded yet for this model in this process. */
export function averageLatency(modelId: string): number | undefined {
  return averages.get(modelId);
}

/** Test-only: clears all tracked latency state between test cases. */
export function resetLatencies(): void {
  averages.clear();
}
