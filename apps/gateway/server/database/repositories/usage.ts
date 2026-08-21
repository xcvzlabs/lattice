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
};

function monthPeriodStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function currentMonthPeriodStart(): Date {
  return monthPeriodStart(new Date());
}

/**
 * Writes the per-request usage record and increments the current month's running counter in
 * one transaction, so a quota check never sees one write without the other. `totalTokens`
 * absent means the provider didn't report usage for this request; the counter's request
 * count still increments so request history stays accurate, but no tokens are added.
 */
export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const periodStart = currentMonthPeriodStart();
  const tokens = input.totalTokens ?? 0;

  await db.transaction(async (tx) => {
    await tx.insert(usageRecords).values(input);

    await tx
      .insert(applicationUsageCounters)
      .values({
        applicationId: input.applicationId,
        periodStart,
        tokensUsed: tokens,
        requestsUsed: 1,
      })
      .onConflictDoUpdate({
        target: [applicationUsageCounters.applicationId, applicationUsageCounters.periodStart],
        set: {
          tokensUsed: sql`${applicationUsageCounters.tokensUsed} + ${tokens}`,
          requestsUsed: sql`${applicationUsageCounters.requestsUsed} + 1`,
        },
      });
  });
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
