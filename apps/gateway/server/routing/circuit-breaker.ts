import type { ProviderId } from '../registry/models.ts';

export type CircuitState = 'closed' | 'open' | 'half-open';

type CircuitEntry = {
  consecutiveFailures: number;
  openedAt?: number;
};

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

/**
 * Per-process, in-memory only. A multi-instance deployment gets one circuit per instance
 * rather than a shared view, which is the accepted tradeoff for not introducing a shared
 * store just for this.
 */
const circuits = new Map<ProviderId, CircuitEntry>();

function entryFor(provider: ProviderId): CircuitEntry {
  const existing = circuits.get(provider);
  if (existing !== undefined) return existing;

  const created: CircuitEntry = { consecutiveFailures: 0 };
  circuits.set(provider, created);
  return created;
}

export function recordSuccess(provider: ProviderId): void {
  const entry = entryFor(provider);
  entry.consecutiveFailures = 0;
  entry.openedAt = undefined;
}

export function recordFailure(provider: ProviderId): void {
  const entry = entryFor(provider);
  entry.consecutiveFailures += 1;

  if (entry.consecutiveFailures >= FAILURE_THRESHOLD && entry.openedAt === undefined) {
    entry.openedAt = Date.now();
  }
}

export function currentState(provider: ProviderId): CircuitState {
  const entry = circuits.get(provider);
  if (entry?.openedAt === undefined) return 'closed';
  return Date.now() - entry.openedAt >= COOLDOWN_MS ? 'half-open' : 'open';
}

/** Test-only: clears all tracked circuit state between test cases. */
export function resetCircuits(): void {
  circuits.clear();
}
