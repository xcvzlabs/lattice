import { and, eq, sql } from 'drizzle-orm';
import { db } from '../client.ts';
import { applicationUsageCounters, usageRecords } from '../schema.ts';

export type UsageRecord = typeof usageRecords.$inferSelect;
export type UsageCounter = typeof applicationUsageCounters.$inferSelect;

export type RecordUsageInput = {
  applicationId: string;
  model: string;
  provider: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Present when `reserveUsageTokens` already added an estimate to the counter pre-dispatch;
   * the counter is reconciled down to actual usage instead of having totalTokens added on top
   * of a reservation that's already sitting in it. */
  reservedTokens?: number;
};

function monthPeriodStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function currentMonthPeriodStart(): Date {
  return monthPeriodStart(new Date());
}

/**
 * Writes the per-request usage record and reconciles the current month's running counter in
 * one transaction, so a quota check never sees one write without the other. `totalTokens`
 * absent means the provider didn't report usage for this request; the counter's request
 * count still increments so request history stays accurate, but no tokens are added. When
 * `reservedTokens` is present, only the difference between actual and reserved usage is
 * applied, since the reservation already added its estimate to the counter.
 */
export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const periodStart = currentMonthPeriodStart();
  const actualTokens = input.totalTokens ?? 0;
  const tokensDelta = actualTokens - (input.reservedTokens ?? 0);

  await db.transaction(async (tx) => {
    await tx.insert(usageRecords).values({
      applicationId: input.applicationId,
      model: input.model,
      provider: input.provider,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
    });

    await tx
      .insert(applicationUsageCounters)
      .values({
        applicationId: input.applicationId,
        periodStart,
        tokensUsed: tokensDelta,
        requestsUsed: 1,
      })
      .onConflictDoUpdate({
        target: [applicationUsageCounters.applicationId, applicationUsageCounters.periodStart],
        set: {
          tokensUsed: sql`${applicationUsageCounters.tokensUsed} + ${tokensDelta}`,
          requestsUsed: sql`${applicationUsageCounters.requestsUsed} + 1`,
        },
      });
  });
}

/**
 * Atomically reserves `reservedTokens` against `quota` for the given period, so a burst of
 * concurrent requests can't all read the same stale counter and all pass a pre-dispatch check
 * before any of them writes back — the check and the write happen in the same conditional
 * `UPDATE`. Returns `false` without writing anything when the reservation would push usage over
 * quota. The row is created first if this is the period's first reservation, since `UPDATE`
 * alone can't match a row that doesn't exist yet.
 */
export async function reserveUsageTokens(
  applicationId: string,
  periodStart: Date,
  reservedTokens: number,
  quota: number,
): Promise<boolean> {
  await db
    .insert(applicationUsageCounters)
    .values({ applicationId, periodStart, tokensUsed: 0, requestsUsed: 0 })
    .onConflictDoNothing();

  const [updated] = await db
    .update(applicationUsageCounters)
    .set({ tokensUsed: sql`${applicationUsageCounters.tokensUsed} + ${reservedTokens}` })
    .where(
      and(
        eq(applicationUsageCounters.applicationId, applicationId),
        eq(applicationUsageCounters.periodStart, periodStart),
        sql`${applicationUsageCounters.tokensUsed} + ${reservedTokens} <= ${quota}`,
      ),
    )
    .returning();

  return updated !== undefined;
}

/** Undoes a reservation from `reserveUsageTokens` that was never reconciled by `recordUsage`,
 * because the request failed before dispatch produced any usage to reconcile it with. */
export async function releaseUsageTokens(
  applicationId: string,
  periodStart: Date,
  reservedTokens: number,
): Promise<void> {
  await db
    .update(applicationUsageCounters)
    .set({ tokensUsed: sql`${applicationUsageCounters.tokensUsed} - ${reservedTokens}` })
    .where(
      and(
        eq(applicationUsageCounters.applicationId, applicationId),
        eq(applicationUsageCounters.periodStart, periodStart),
      ),
    );
}

export async function getUsageCounter(
  applicationId: string,
  periodStart: Date,
): Promise<UsageCounter | undefined> {
  const [counter] = await db
    .select()
    .from(applicationUsageCounters)
    .where(
      and(
        eq(applicationUsageCounters.applicationId, applicationId),
        eq(applicationUsageCounters.periodStart, periodStart),
      ),
    )
    .limit(1);

  return counter;
}
