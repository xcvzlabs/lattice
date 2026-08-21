import { listLatencyStates, upsertLatencyStates } from '../database/repositories/latency-state.ts';

const EWMA_ALPHA = 0.2;

/**
 * The authoritative state for this process: `averageLatency` always reads from here, with zero
 * added latency on the request path. `syncLatencyState` (called periodically by
 * plugins/state-sync.ts) is what keeps this converged with the rest of the fleet.
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

/**
 * Replicates latency state across every gateway instance without adding latency to the request
 * path: `averageLatency` never awaits this, it only ever reads the local map above.
 *
 * Push-then-pull, once per call: this instance's own averages are written first, then every
 * row (including the ones just written) is read back into the local cache. Last-write-wins is
 * an acceptable approximation here — this is a routing heuristic, not a financial or safety
 * counter, so a slightly stale blended average across instances is a fine tradeoff for not
 * needing per-sample coordination.
 */
export async function syncLatencyState(): Promise<void> {
  await upsertLatencyStates(
    Array.from(averages.entries()).map(([modelId, averageLatencyMs]) => ({
      modelId,
      averageLatencyMs,
    })),
  );

  const remoteRows = await listLatencyStates();

  for (const row of remoteRows) {
    averages.set(row.modelId, row.averageLatencyMs);
  }
}
