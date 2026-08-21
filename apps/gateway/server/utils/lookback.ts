import type { H3Event } from 'nitro';
import { createLatticeError } from './errors.ts';

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOOKBACK_DAYS = 365;
const MS_PER_DAY = 86_400_000;

/** Parses the `days` query param into a `since` timestamp, defaulting to 30 days back. */
export function resolveLookbackSince(event: H3Event): Date {
  const raw = event.url.searchParams.get('days');
  const lookbackDays = raw === null ? DEFAULT_LOOKBACK_DAYS : Number(raw);

  if (!Number.isInteger(lookbackDays) || lookbackDays < 1 || lookbackDays > MAX_LOOKBACK_DAYS) {
    throw createLatticeError(
      400,
      'invalid_request',
      `"days" must be an integer between 1 and ${MAX_LOOKBACK_DAYS}`,
    );
  }

  return new Date(Date.now() - lookbackDays * MS_PER_DAY);
}
