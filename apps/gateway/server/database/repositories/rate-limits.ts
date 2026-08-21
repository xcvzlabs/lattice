import { and, eq, lt, sql } from 'drizzle-orm';
import { db } from '../client.ts';
import { rateLimitCounters } from '../schema.ts';

const STALE_WINDOW_MS = 120_000;

/**
 * Increments the request count for the given one-minute window and returns the new total.
 * Also opportunistically deletes this application's windows older than two minutes, so the
 * table stays bounded without a separate cleanup job.
 */
export async function incrementAndCheckRateLimit(
  applicationId: string,
  windowStart: Date,
): Promise<number> {
  const [counter] = await db
    .insert(rateLimitCounters)
    .values({ applicationId, windowStart, requestCount: 1 })
    .onConflictDoUpdate({
      target: [rateLimitCounters.applicationId, rateLimitCounters.windowStart],
      set: { requestCount: sql`${rateLimitCounters.requestCount} + 1` },
    })
    .returning();

  if (counter === undefined) {
    throw new Error('Upsert into rate_limit_counters returned no row');
  }

  await db
    .delete(rateLimitCounters)
    .where(
      and(
        eq(rateLimitCounters.applicationId, applicationId),
        lt(rateLimitCounters.windowStart, new Date(Date.now() - STALE_WINDOW_MS)),
      ),
    );

  return counter.requestCount;
}
