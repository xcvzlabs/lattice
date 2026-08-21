import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from '../client.ts';
import { requestLogs } from '../schema.ts';

export type RequestLog = typeof requestLogs.$inferSelect;

export type RecordRequestLogInput = {
  applicationId: string;
  requestId: string;
  model: string;
  provider?: string;
  status: 'success' | 'error';
  httpStatus: number;
  errorCode?: string;
  attempts: number;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
};

export type ListRequestLogsFilter = {
  applicationId?: string;
  model?: string;
  provider?: string;
  status?: 'success' | 'error';
  since?: Date;
  until?: Date;
};

export type ListRequestLogsOptions = ListRequestLogsFilter & {
  limit: number;
  offset: number;
};

export type UsageSummaryRow = {
  day: string;
  requests: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

/** Append-only insert. This table has no counter to keep in sync, unlike `recordUsage`. */
export async function recordRequestLog(input: RecordRequestLogInput): Promise<void> {
  await db.insert(requestLogs).values({
    ...input,
    estimatedCostUsd: input.estimatedCostUsd?.toString(),
  });
}

function filterConditions(filter: ListRequestLogsFilter): (SQL | undefined)[] {
  return [
    filter.applicationId !== undefined
      ? eq(requestLogs.applicationId, filter.applicationId)
      : undefined,
    filter.model !== undefined ? eq(requestLogs.model, filter.model) : undefined,
    filter.provider !== undefined ? eq(requestLogs.provider, filter.provider) : undefined,
    filter.status !== undefined ? eq(requestLogs.status, filter.status) : undefined,
    filter.since !== undefined ? gte(requestLogs.createdAt, filter.since) : undefined,
    filter.until !== undefined ? lte(requestLogs.createdAt, filter.until) : undefined,
  ];
}

export async function listRequestLogs(options: ListRequestLogsOptions): Promise<RequestLog[]> {
  return db
    .select()
    .from(requestLogs)
    .where(and(...filterConditions(options)))
    .orderBy(desc(requestLogs.createdAt))
    .limit(options.limit)
    .offset(options.offset);
}

/** Daily rollup of request volume, token usage, and estimated spend, optionally scoped to a
 * single application — omitting `applicationId` summarizes across every application, for the
 * dashboard's overview page. */
export async function getUsageSummary(
  since: Date,
  applicationId?: string,
): Promise<UsageSummaryRow[]> {
  const day = sql<string>`date_trunc('day', ${requestLogs.createdAt})`;
  const conditions = [gte(requestLogs.createdAt, since)];
  if (applicationId !== undefined) conditions.push(eq(requestLogs.applicationId, applicationId));

  // count()/sum() come back over the wire as strings (Postgres bigint/numeric, to avoid
  // precision loss past Number.MAX_SAFE_INTEGER) regardless of the `sql<...>` type parameter
  // below, which only annotates the TS type — it doesn't coerce the runtime value. Converting
  // here, once, keeps every caller of this repository working with real numbers.
  const rows = await db
    .select({
      day: sql<string>`${day}`,
      requests: sql<string>`count(*)`,
      totalTokens: sql<string>`coalesce(sum(${requestLogs.totalTokens}), 0)`,
      estimatedCostUsd: sql<string>`coalesce(sum(${requestLogs.estimatedCostUsd}), 0)`,
    })
    .from(requestLogs)
    .where(and(...conditions))
    .groupBy(day)
    .orderBy(day);

  return rows.map((row) => ({
    day: row.day,
    requests: Number(row.requests),
    totalTokens: Number(row.totalTokens),
    estimatedCostUsd: Number(row.estimatedCostUsd),
  }));
}
