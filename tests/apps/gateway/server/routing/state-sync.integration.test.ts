import { eq, inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~/apps/gateway/server/database/client.ts';
import { upsertCircuitStates } from '~/apps/gateway/server/database/repositories/circuit-state.ts';
import { upsertLatencyStates } from '~/apps/gateway/server/database/repositories/latency-state.ts';
import {
  providerCircuitState,
  providerLatencyState,
} from '~/apps/gateway/server/database/schema.ts';
import {
  currentState,
  recordFailure,
  resetCircuits,
  syncCircuitBreakerState,
} from '~/apps/gateway/server/routing/circuit-breaker.ts';
import {
  averageLatency,
  recordLatency,
  resetLatencies,
  syncLatencyState,
} from '~/apps/gateway/server/routing/latency-tracker.ts';

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const reachable = await isDatabaseReachable();

describe.skipIf(!reachable)('syncCircuitBreakerState (integration)', () => {
  afterEach(async () => {
    resetCircuits();
    await db
      .delete(providerCircuitState)
      .where(inArray(providerCircuitState.provider, ['openai', 'anthropic']));
  });

  it('pushes local failures to the shared table', async () => {
    for (let count = 0; count < 5; count += 1) recordFailure('openai');
    expect(currentState('openai')).toBe('open');

    await syncCircuitBreakerState();

    const [row] = await db
      .select()
      .from(providerCircuitState)
      .where(eq(providerCircuitState.provider, 'openai'));
    expect(row?.consecutiveFailures).toBe(5);
    expect(row?.openedAt).not.toBeNull();
  });

  it('adopts a failure count another instance already wrote', async () => {
    await upsertCircuitStates([
      { provider: 'anthropic', consecutiveFailures: 5, openedAt: new Date() },
    ]);
    expect(currentState('anthropic')).toBe('closed');

    await syncCircuitBreakerState();

    expect(currentState('anthropic')).toBe('open');
  });

  it('keeps the local count when it already exceeds what the shared table has', async () => {
    for (let count = 0; count < 3; count += 1) recordFailure('openai');
    await upsertCircuitStates([{ provider: 'openai', consecutiveFailures: 1, openedAt: null }]);

    await syncCircuitBreakerState();

    expect(currentState('openai')).toBe('closed');
  });
});

describe.skipIf(!reachable)('syncLatencyState (integration)', () => {
  afterEach(async () => {
    resetLatencies();
    await db
      .delete(providerLatencyState)
      .where(inArray(providerLatencyState.modelId, ['gpt-4o', 'claude-3']));
  });

  it('pushes a local average to the shared table', async () => {
    recordLatency('gpt-4o', 250);

    await syncLatencyState();

    const [row] = await db
      .select()
      .from(providerLatencyState)
      .where(eq(providerLatencyState.modelId, 'gpt-4o'));
    expect(row?.averageLatencyMs).toBeCloseTo(250);
  });

  it('pulls in a model this instance has never sampled', async () => {
    await upsertLatencyStates([{ modelId: 'claude-3', averageLatencyMs: 400 }]);
    expect(averageLatency('claude-3')).toBeUndefined();

    await syncLatencyState();

    expect(averageLatency('claude-3')).toBeCloseTo(400);
  });
});
