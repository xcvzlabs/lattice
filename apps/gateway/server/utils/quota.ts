import type { ChatCompletionRequest } from '@lattice/api-contract';
import type { Application } from '../database/repositories/applications.ts';
import {
  currentMonthPeriodStart,
  releaseUsageTokens,
  reserveUsageTokens,
} from '../database/repositories/usage.ts';
import { createLatticeError } from './errors.ts';

// A request's real token cost is only known after the provider responds, so the reservation
// taken before dispatch is a conservative upper bound rather than an exact charge — capped here
// so a single request's `max_tokens` can't inflate the amount held against the quota.
const DEFAULT_TOKEN_RESERVATION = 4096;

export type QuotaReservation = {
  applicationId: string;
  periodStart: Date;
  reservedTokens: number;
};

/**
 * Atomically reserves an upper-bound estimate of this request's token cost against the
 * application's monthly quota before dispatch. The check and the reservation happen in the
 * same conditional database write, so concurrent requests can't all read the same stale usage
 * count and all pass the check before any of them writes back. `undefined` when the application
 * has no configured quota — nothing to reserve.
 *
 * The estimate is reconciled down to actual usage by `recordUsage`'s `reservedTokens` field once
 * real usage is known, or refunded entirely by `releaseQuotaReservation` if the request fails
 * before producing any usage to reconcile with.
 */
export async function reserveQuota(
  application: Application,
  request: Pick<ChatCompletionRequest, 'max_tokens'>,
): Promise<QuotaReservation | undefined> {
  if (application.monthlyTokenQuota === null) return undefined;

  const periodStart = currentMonthPeriodStart();
  const reservedTokens = Math.min(
    request.max_tokens ?? DEFAULT_TOKEN_RESERVATION,
    DEFAULT_TOKEN_RESERVATION,
  );

  const committed = await reserveUsageTokens(
    application.id,
    periodStart,
    reservedTokens,
    application.monthlyTokenQuota,
  );

  if (!committed) {
    throw createLatticeError(429, 'quota_exceeded', 'Monthly token quota exceeded');
  }

  return { applicationId: application.id, periodStart, reservedTokens };
}

/** Refunds a reservation for a request that failed before `recordUsage` ran to reconcile it
 * down to actual usage. A no-op when no reservation was made. */
export async function releaseQuotaReservation(
  reservation: QuotaReservation | undefined,
): Promise<void> {
  if (reservation === undefined) return;

  await releaseUsageTokens(
    reservation.applicationId,
    reservation.periodStart,
    reservation.reservedTokens,
  );
}
