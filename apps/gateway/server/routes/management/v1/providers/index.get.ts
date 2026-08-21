import type { ProviderHealthResponse } from '@lattice/api-contract';
import { defineHandler } from 'nitro';
import { currentState } from '../../../../routing/circuit-breaker.ts';
import { dispatchDeps } from '../../../../routing/deps.ts';
import { averageLatency } from '../../../../routing/latency-tracker.ts';

export default defineHandler((): ProviderHealthResponse => {
  const data = Object.values(dispatchDeps.adapters)
    .filter((adapter) => adapter !== undefined)
    .map((adapter) => ({
      provider: adapter.id,
      circuitState: currentState(adapter.id),
      models: dispatchDeps.registry.models
        .filter((model) => model.provider === adapter.id)
        .map((model) => ({
          modelId: model.id,
          averageLatencyMs: averageLatency(model.id) ?? null,
        })),
    }));

  return { data };
});
