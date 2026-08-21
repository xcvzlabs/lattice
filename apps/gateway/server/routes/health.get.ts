import { sql } from 'drizzle-orm';
import { defineHandler } from 'nitro';
import { db } from '../database/client.ts';
import { currentState } from '../routing/circuit-breaker.ts';
import { dispatchDeps } from '../routing/deps.ts';

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export default defineHandler(async () => {
  const providers: Record<string, string> = {};

  for (const adapter of Object.values(dispatchDeps.adapters)) {
    if (adapter === undefined) continue;
    providers[adapter.id] = currentState(adapter.id);
  }

  const databaseReachable = await isDatabaseReachable();

  const body = {
    status: databaseReachable ? 'ok' : 'degraded',
    database: databaseReachable ? 'ok' : 'unreachable',
    providers,
  };

  return new Response(JSON.stringify(body), {
    status: databaseReachable ? 200 : 503,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
});
