import { eq, inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~/apps/gateway/server/database/client.ts';
import { createApplication } from '~/apps/gateway/server/database/repositories/applications.ts';
import { applications, rateLimitCounters } from '~/apps/gateway/server/database/schema.ts';
import rateLimitMiddleware from '~/apps/gateway/server/middleware/03.rate-limit.ts';
import { setApplication } from '~/apps/gateway/server/utils/request-context.ts';
import { mockEvent, noopNext } from '~/apps/gateway/test-support/mock-event.ts';

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const reachable = await isDatabaseReachable();

describe.skipIf(!reachable)('rate-limit middleware (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db
      .delete(rateLimitCounters)
      .where(inArray(rateLimitCounters.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  async function withRateLimit(name: string, rateLimitPerMinute: number | null) {
    const application = await createApplication(name);
    createdApplicationIds.push(application.id);
    await db
      .update(applications)
      .set({ rateLimitPerMinute })
      .where(eq(applications.id, application.id));

    const [updated] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    if (updated === undefined) throw new Error('expected the application to still exist');
    return updated;
  }

  it('ignores requests outside /v1/*', async () => {
    const event = mockEvent('http://localhost/management/v1/applications');

    await expect(rateLimitMiddleware(event, noopNext)).resolves.toBeUndefined();
  });

  it('is a no-op when no application was attached by the auth middleware', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions');

    await expect(rateLimitMiddleware(event, noopNext)).resolves.toBeUndefined();
  });

  it('is a no-op when the application has no configured rate limit', async () => {
    const application = await withRateLimit('integration-test-rate-limit-mw-unlimited', null);
    const event = mockEvent('http://localhost/v1/chat/completions');
    setApplication(event.req, application);

    await expect(rateLimitMiddleware(event, noopNext)).resolves.toBeUndefined();
  });

  it('allows requests within the limit', async () => {
    const application = await withRateLimit('integration-test-rate-limit-mw-under', 5);
    const event = mockEvent('http://localhost/v1/chat/completions');
    setApplication(event.req, application);

    await expect(rateLimitMiddleware(event, noopNext)).resolves.toBeUndefined();
  });

  it('rejects once the per-minute limit is exceeded', async () => {
    const application = await withRateLimit('integration-test-rate-limit-mw-exceeded', 2);

    for (let count = 0; count < 2; count += 1) {
      const event = mockEvent('http://localhost/v1/chat/completions');
      setApplication(event.req, application);
      // Each call must land before the next fires, since they share the same one-minute window.
      // oxlint-disable-next-line no-await-in-loop
      await rateLimitMiddleware(event, noopNext);
    }

    const thirdEvent = mockEvent('http://localhost/v1/chat/completions');
    setApplication(thirdEvent.req, application);

    await expect(rateLimitMiddleware(thirdEvent, noopNext)).rejects.toMatchObject({
      status: 429,
      data: { code: 'rate_limit_exceeded' },
    });
  });
});
