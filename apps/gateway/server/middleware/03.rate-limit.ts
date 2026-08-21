import { defineMiddleware } from 'nitro';
import { incrementAndCheckRateLimit } from '../database/repositories/rate-limits.ts';
import { createLatticeError } from '../utils/errors.ts';
import { getApplication } from '../utils/request-context.ts';

const WINDOW_MS = 60_000;

function currentWindowStart(): Date {
  return new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);
}

export default defineMiddleware(async (event) => {
  if (!event.url.pathname.startsWith('/v1/')) return;

  const application = getApplication(event.req);

  if (application === undefined) return;
  if (application.rateLimitPerMinute === null) return;

  const requestCount = await incrementAndCheckRateLimit(application.id, currentWindowStart());

  if (requestCount > application.rateLimitPerMinute) {
    throw createLatticeError(429, 'rate_limit_exceeded', 'Rate limit exceeded');
  }
});
