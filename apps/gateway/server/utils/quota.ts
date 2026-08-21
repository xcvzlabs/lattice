import type { Application } from '../database/repositories/applications.ts';
import { currentMonthPeriodStart, getUsageCounter } from '../database/repositories/usage.ts';
import { createLatticeError } from './errors.ts';

/** No-op when the application has no configured quota (`monthlyTokenQuota === null`). */
export async function assertWithinQuota(application: Application): Promise<void> {
  if (application.monthlyTokenQuota === null) return;

  const counter = await getUsageCounter(application.id, currentMonthPeriodStart());
  const tokensUsed = counter?.tokensUsed ?? 0;

  if (tokensUsed >= application.monthlyTokenQuota) {
    throw createLatticeError(429, 'quota_exceeded', 'Monthly token quota exceeded');
  }
}
