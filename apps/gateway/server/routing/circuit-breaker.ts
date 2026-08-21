import * as v from 'valibot';
import { listCircuitStates, upsertCircuitStates } from '../database/repositories/circuit-state.ts';
import { providerIdSchema, type ProviderId } from '../registry/models.ts';

export type CircuitState = 'closed' | 'open' | 'half-open';

type CircuitEntry = {
  consecutiveFailures: number;
  openedAt?: number;
};

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

/**
 * The authoritative state for this process: `currentState` always reads from here, with zero
 * added latency on the request path. `syncCircuitBreakerState` (called periodically by
 * plugins/state-sync.ts) is what keeps this converged with the rest of the fleet — see that
 * function for the replication strategy.
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

/**
 * Replicates circuit state across every gateway instance without adding latency to the request
 * path: `currentState` never awaits this, it only ever reads the local map above.
 *
 * Push-then-pull, once per call: first every locally-known provider's state is written to the
 * shared table, then every row is read back and merged in, keeping whichever of (local, remote)
 * has the higher failure count. A circuit breaker should err toward caution, so once any
 * instance has observed enough failures to open a circuit, every instance converges to `open`
 * within one sync interval — while recovery still requires each instance to see its own
 * success, which is the same conservative direction real traffic should already be pushing it.
 */
export async function syncCircuitBreakerState(): Promise<void> {
  await upsertCircuitStates(
    Array.from(circuits.entries()).map(([provider, entry]) => ({
      provider,
      consecutiveFailures: entry.consecutiveFailures,
      openedAt: entry.openedAt === undefined ? null : new Date(entry.openedAt),
    })),
  );

  const remoteRows = await listCircuitStates();

  for (const row of remoteRows) {
    const parsedProvider = v.safeParse(providerIdSchema, row.provider);
    if (!parsedProvider.success) continue;

    const provider = parsedProvider.output;
    const local = circuits.get(provider);

    if (local !== undefined && local.consecutiveFailures >= row.consecutiveFailures) continue;

    circuits.set(provider, {
      consecutiveFailures: row.consecutiveFailures,
      openedAt: row.openedAt === null ? undefined : row.openedAt.getTime(),
    });
  }
}
