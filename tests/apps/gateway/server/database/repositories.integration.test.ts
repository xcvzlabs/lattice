import { eq, inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~/apps/gateway/server/database/client.ts';
import {
  createApiKey,
  findActiveApiKeyByHash,
  touchLastUsedAt,
} from '~/apps/gateway/server/database/repositories/api-keys.ts';
import { createApplication } from '~/apps/gateway/server/database/repositories/applications.ts';
import { incrementAndCheckRateLimit } from '~/apps/gateway/server/database/repositories/rate-limits.ts';
import {
  currentMonthPeriodStart,
  getUsageCounter,
  recordUsage,
} from '~/apps/gateway/server/database/repositories/usage.ts';
import {
  apiKeys,
  applicationUsageCounters,
  applications,
  rateLimitCounters,
  usageRecords,
} from '~/apps/gateway/server/database/schema.ts';
import { assertWithinQuota } from '~/apps/gateway/server/utils/quota.ts';

async function isDatabaseReachable(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const reachable = await isDatabaseReachable();

describe.skipIf(!reachable)('api key repositories (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(apiKeys).where(inArray(apiKeys.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('creates an application and returns an active api key scoped to it', async () => {
    const application = await createApplication('integration-test-app');
    createdApplicationIds.push(application.id);

    const apiKey = await createApiKey({
      applicationId: application.id,
      keyHash: 'hash-active',
      keyPrefix: 'lattice_sk_abcd',
    });

    const lookup = await findActiveApiKeyByHash('hash-active');
    expect(lookup?.apiKey.id).toBe(apiKey.id);
    expect(lookup?.application.id).toBe(application.id);
  });

  it('does not return a revoked key', async () => {
    const application = await createApplication('integration-test-app-revoked');
    createdApplicationIds.push(application.id);

    await createApiKey({
      applicationId: application.id,
      keyHash: 'hash-revoked',
      keyPrefix: 'lattice_sk_efgh',
    });
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.keyHash, 'hash-revoked'));

    const lookup = await findActiveApiKeyByHash('hash-revoked');
    expect(lookup).toBeUndefined();
  });

  it('updates last_used_at without throwing', async () => {
    const application = await createApplication('integration-test-app-touch');
    createdApplicationIds.push(application.id);

    const apiKey = await createApiKey({
      applicationId: application.id,
      keyHash: 'hash-touch',
      keyPrefix: 'lattice_sk_ijkl',
    });

    await expect(touchLastUsedAt(apiKey.id)).resolves.toBeUndefined();
  });

  it('enforces uniqueness on key_hash', async () => {
    const application = await createApplication('integration-test-app-unique');
    createdApplicationIds.push(application.id);

    await createApiKey({
      applicationId: application.id,
      keyHash: 'hash-unique',
      keyPrefix: 'lattice_sk_mnop',
    });

    await expect(
      createApiKey({
        applicationId: application.id,
        keyHash: 'hash-unique',
        keyPrefix: 'lattice_sk_qrst',
      }),
    ).rejects.toThrow();
  });
});

describe.skipIf(!reachable)('usage repository (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(usageRecords).where(inArray(usageRecords.applicationId, createdApplicationIds));
    await db
      .delete(applicationUsageCounters)
      .where(inArray(applicationUsageCounters.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('writes a usage record and initializes the monthly counter', async () => {
    const application = await createApplication('integration-test-usage');
    createdApplicationIds.push(application.id);

    await recordUsage({
      applicationId: application.id,
      model: 'gpt-4o',
      provider: 'openai',
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });

    const [record] = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.applicationId, application.id));
    expect(record?.totalTokens).toBe(15);

    const counter = await getUsageCounter(application.id, currentMonthPeriodStart());
    expect(counter?.tokensUsed).toBe(15);
    expect(counter?.requestsUsed).toBe(1);
  });

  it('accumulates tokens and requests across multiple calls in the same period', async () => {
    const application = await createApplication('integration-test-usage-accumulate');
    createdApplicationIds.push(application.id);

    await recordUsage({
      applicationId: application.id,
      model: 'gpt-4o',
      provider: 'openai',
      totalTokens: 10,
    });
    await recordUsage({
      applicationId: application.id,
      model: 'gpt-4o',
      provider: 'openai',
      totalTokens: 20,
    });

    const counter = await getUsageCounter(application.id, currentMonthPeriodStart());
    expect(counter?.tokensUsed).toBe(30);
    expect(counter?.requestsUsed).toBe(2);
  });

  it('counts a request with unknown usage without adding tokens', async () => {
    const application = await createApplication('integration-test-usage-unknown');
    createdApplicationIds.push(application.id);

    await recordUsage({ applicationId: application.id, model: 'gpt-4o', provider: 'openai' });

    const counter = await getUsageCounter(application.id, currentMonthPeriodStart());
    expect(counter?.tokensUsed).toBe(0);
    expect(counter?.requestsUsed).toBe(1);
  });
});

describe.skipIf(!reachable)('assertWithinQuota (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(usageRecords).where(inArray(usageRecords.applicationId, createdApplicationIds));
    await db
      .delete(applicationUsageCounters)
      .where(inArray(applicationUsageCounters.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('allows a request when no quota is configured', async () => {
    const application = await createApplication('integration-test-quota-none');
    createdApplicationIds.push(application.id);

    await expect(assertWithinQuota(application)).resolves.toBeUndefined();
  });

  it('allows a request when usage is below the quota', async () => {
    const application = await createApplication('integration-test-quota-under');
    createdApplicationIds.push(application.id);
    await db
      .update(applications)
      .set({ monthlyTokenQuota: 100 })
      .where(eq(applications.id, application.id));

    await recordUsage({
      applicationId: application.id,
      model: 'gpt-4o',
      provider: 'openai',
      totalTokens: 50,
    });

    const [updated] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    if (updated === undefined) throw new Error('expected the application to still exist');

    await expect(assertWithinQuota(updated)).resolves.toBeUndefined();
  });

  it('rejects a request once usage reaches the quota', async () => {
    const application = await createApplication('integration-test-quota-exceeded');
    createdApplicationIds.push(application.id);
    await db
      .update(applications)
      .set({ monthlyTokenQuota: 100 })
      .where(eq(applications.id, application.id));

    await recordUsage({
      applicationId: application.id,
      model: 'gpt-4o',
      provider: 'openai',
      totalTokens: 100,
    });

    const [updated] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, application.id));
    if (updated === undefined) throw new Error('expected the application to still exist');

    await expect(assertWithinQuota(updated)).rejects.toMatchObject({
      status: 429,
      data: { code: 'quota_exceeded' },
    });
  });
});

describe.skipIf(!reachable)('incrementAndCheckRateLimit (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db
      .delete(rateLimitCounters)
      .where(inArray(rateLimitCounters.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('starts a window at 1 and increments on repeated calls', async () => {
    const application = await createApplication('integration-test-rate-limit');
    createdApplicationIds.push(application.id);
    const windowStart = new Date();

    expect(await incrementAndCheckRateLimit(application.id, windowStart)).toBe(1);
    expect(await incrementAndCheckRateLimit(application.id, windowStart)).toBe(2);
    expect(await incrementAndCheckRateLimit(application.id, windowStart)).toBe(3);
  });

  it('tracks separate windows independently', async () => {
    const application = await createApplication('integration-test-rate-limit-windows');
    createdApplicationIds.push(application.id);
    const firstWindow = new Date();
    const secondWindow = new Date(firstWindow.getTime() + 60_000);

    expect(await incrementAndCheckRateLimit(application.id, firstWindow)).toBe(1);
    expect(await incrementAndCheckRateLimit(application.id, secondWindow)).toBe(1);
    expect(await incrementAndCheckRateLimit(application.id, firstWindow)).toBe(2);
  });
});
