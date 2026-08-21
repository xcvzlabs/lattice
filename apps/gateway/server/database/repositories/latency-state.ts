import { sql } from 'drizzle-orm';
import { db } from '../client.ts';
import { providerLatencyState } from '../schema.ts';

export type LatencyStateRow = {
  modelId: string;
  averageLatencyMs: number;
};

/** Bulk upsert so a full sync of every tracked model's latency is one round trip. A no-op for an
 * empty list, since `db.insert(...).values([])` is invalid SQL. */
export async function upsertLatencyStates(entries: LatencyStateRow[]): Promise<void> {
  if (entries.length === 0) return;

  await db
    .insert(providerLatencyState)
    .values(
      entries.map((entry) => ({
        modelId: entry.modelId,
        averageLatencyMs: entry.averageLatencyMs,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: providerLatencyState.modelId,
      set: {
        averageLatencyMs: sql`excluded.average_latency_ms`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

export async function listLatencyStates(): Promise<LatencyStateRow[]> {
  const rows = await db
    .select({
      modelId: providerLatencyState.modelId,
      averageLatencyMs: providerLatencyState.averageLatencyMs,
    })
    .from(providerLatencyState);

  return rows;
}
