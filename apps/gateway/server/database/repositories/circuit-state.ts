import { sql } from 'drizzle-orm';
import { db } from '../client.ts';
import { providerCircuitState } from '../schema.ts';

export type CircuitStateRow = {
  provider: string;
  consecutiveFailures: number;
  openedAt: Date | null;
};

/** Bulk upsert so a full sync of every tracked provider's state is one round trip. A no-op for
 * an empty list, since `db.insert(...).values([])` is invalid SQL. */
export async function upsertCircuitStates(entries: CircuitStateRow[]): Promise<void> {
  if (entries.length === 0) return;

  await db
    .insert(providerCircuitState)
    .values(
      entries.map((entry) => ({
        provider: entry.provider,
        consecutiveFailures: entry.consecutiveFailures,
        openedAt: entry.openedAt,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: providerCircuitState.provider,
      set: {
        consecutiveFailures: sql`excluded.consecutive_failures`,
        openedAt: sql`excluded.opened_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

export async function listCircuitStates(): Promise<CircuitStateRow[]> {
  const rows = await db
    .select({
      provider: providerCircuitState.provider,
      consecutiveFailures: providerCircuitState.consecutiveFailures,
      openedAt: providerCircuitState.openedAt,
    })
    .from(providerCircuitState);

  return rows;
}
