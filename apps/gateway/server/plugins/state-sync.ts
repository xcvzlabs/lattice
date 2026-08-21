import { log } from 'evlog';
import { definePlugin } from 'nitro';
import { syncCircuitBreakerState } from '../routing/circuit-breaker.ts';
import { syncLatencyState } from '../routing/latency-tracker.ts';

const SYNC_INTERVAL_MS = 5_000;

async function syncRoutingState(): Promise<void> {
  try {
    await Promise.all([syncCircuitBreakerState(), syncLatencyState()]);
  } catch (error) {
    log.error({
      message: 'Failed to sync routing state across instances',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Keeps the per-process circuit breaker and latency tracker (routing/circuit-breaker.ts,
// routing/latency-tracker.ts) converged across every gateway instance. Routing decisions
// themselves never await this — it only ever writes into the same in-memory caches those
// modules read from synchronously, on a short interval running alongside the request path.
export default definePlugin((nitroApp) => {
  void syncRoutingState();
  const interval = setInterval(() => void syncRoutingState(), SYNC_INTERVAL_MS);

  nitroApp.hooks.hook('close', () => {
    clearInterval(interval);
  });
});
