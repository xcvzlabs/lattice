import { defineHandler } from 'nitro';
import { currentState } from '../routing/circuit-breaker.ts';
import { dispatchDeps } from '../routing/deps.ts';

export default defineHandler(() => {
  const providers: Record<string, string> = {};

  for (const adapter of Object.values(dispatchDeps.adapters)) {
    if (adapter === undefined) continue;
    providers[adapter.id] = currentState(adapter.id);
  }

  return {
    status: 'ok',
    providers,
  };
});
