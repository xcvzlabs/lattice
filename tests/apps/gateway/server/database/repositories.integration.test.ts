import { eq, inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~/apps/gateway/server/database/client.ts';
import {
  createApiKey,
  findActiveApiKeyByHash,
  listApiKeysForApplication,
  revokeApiKey,
  touchLastUsedAt,
} from '~/apps/gateway/server/database/repositories/api-keys.ts';
import {
  createApplication,
  disableApplication,
  enableApplication,
  getApplicationById,
  listApplications,
  updateApplication,
} from '~/apps/gateway/server/database/repositories/applications.ts';
import {
  createManagementApiKey,
  findActiveManagementApiKeyByHash,
  touchManagementApiKeyLastUsedAt,
} from '~/apps/gateway/server/database/repositories/management-api-keys.ts';
import { incrementAndCheckRateLimit } from '~/apps/gateway/server/database/repositories/rate-limits.ts';
import {
  getUsageSummary,
  listRequestLogs,
  recordRequestLog,
} from '~/apps/gateway/server/database/repositories/request-logs.ts';
import {
  currentMonthPeriodStart,
  getUsageCounter,
  recordUsage,
} from '~/apps/gateway/server/database/repositories/usage.ts';
import {
  apiKeys,
  applicationUsageCounters,
  applications,
  managementApiKeys,
  rateLimitCounters,
  requestLogs,
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

describe.skipIf(!reachable)('application management (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(apiKeys).where(inArray(apiKeys.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('lists applications newest first', async () => {
    const first = await createApplication('integration-test-list-a');
    createdApplicationIds.push(first.id);
    const second = await createApplication('integration-test-list-b');
    createdApplicationIds.push(second.id);

    const all = await listApplications();
    const ids = all.map((application) => application.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });

  it('fetches a single application by id', async () => {
    const application = await createApplication('integration-test-get');
    createdApplicationIds.push(application.id);

    expect((await getApplicationById(application.id))?.id).toBe(application.id);
    expect(await getApplicationById('00000000-0000-0000-0000-000000000000')).toBeUndefined();
  });

  it('updates policy and quota fields', async () => {
    const application = await createApplication('integration-test-update');
    createdApplicationIds.push(application.id);

    const updated = await updateApplication(application.id, {
      monthlyTokenQuota: 1000,
      allowedModels: ['gpt-4o'],
      routingStrategy: 'cost',
    });

    expect(updated?.monthlyTokenQuota).toBe(1000);
    expect(updated?.allowedModels).toEqual(['gpt-4o']);
    expect(updated?.routingStrategy).toBe('cost');
  });

  it('disables and re-enables an application', async () => {
    const application = await createApplication('integration-test-disable');
    createdApplicationIds.push(application.id);

    const disabled = await disableApplication(application.id);
    expect(disabled?.disabledAt).not.toBeNull();

    const enabled = await enableApplication(application.id);
    expect(enabled?.disabledAt).toBeNull();
  });

  it('lists and revokes api keys scoped to an application', async () => {
    const application = await createApplication('integration-test-keys');
    createdApplicationIds.push(application.id);

    const apiKey = await createApiKey({
      applicationId: application.id,
      keyHash: 'hash-management-list',
      keyPrefix: 'lattice_sk_uvwx',
    });

    const listed = await listApiKeysForApplication(application.id);
    expect(listed.map((key) => key.id)).toContain(apiKey.id);

    const revoked = await revokeApiKey(apiKey.id, application.id);
    expect(revoked?.revokedAt).not.toBeNull();

    // Revoking an already-revoked key matches no row and returns undefined.
    expect(await revokeApiKey(apiKey.id, application.id)).toBeUndefined();
  });
});

describe.skipIf(!reachable)('management api keys (integration)', () => {
  const createdManagementApiKeyIds: string[] = [];

  afterEach(async () => {
    if (createdManagementApiKeyIds.length === 0) return;
    await db
      .delete(managementApiKeys)
      .where(inArray(managementApiKeys.id, createdManagementApiKeyIds));
    createdManagementApiKeyIds.length = 0;
  });

  it('creates a key and finds it active by hash', async () => {
    const key = await createManagementApiKey({
      name: 'integration-test-dashboard',
      keyHash: 'hash-management-active',
      keyPrefix: 'lattice_sk_mgmt',
    });
    createdManagementApiKeyIds.push(key.id);

    const found = await findActiveManagementApiKeyByHash('hash-management-active');
    expect(found?.id).toBe(key.id);
  });

  it('does not return a revoked management key', async () => {
    const key = await createManagementApiKey({
      name: 'integration-test-revoked',
      keyHash: 'hash-management-revoked',
      keyPrefix: 'lattice_sk_mgmt',
    });
    createdManagementApiKeyIds.push(key.id);

    await db
      .update(managementApiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(managementApiKeys.id, key.id));

    expect(await findActiveManagementApiKeyByHash('hash-management-revoked')).toBeUndefined();
  });

  it('updates last_used_at without throwing', async () => {
    const key = await createManagementApiKey({
      name: 'integration-test-touch',
      keyHash: 'hash-management-touch',
      keyPrefix: 'lattice_sk_mgmt',
    });
    createdManagementApiKeyIds.push(key.id);

    await expect(touchManagementApiKeyLastUsedAt(key.id)).resolves.toBeUndefined();
  });
});

describe.skipIf(!reachable)('request logs (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(requestLogs).where(inArray(requestLogs.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  it('records a request log entry and lists it back', async () => {
    const application = await createApplication('integration-test-request-log');
    createdApplicationIds.push(application.id);

    await recordRequestLog({
      applicationId: application.id,
      requestId: 'req-1',
      model: 'gpt-4o',
      provider: 'openai',
      status: 'success',
      httpStatus: 200,
      attempts: 1,
      latencyMs: 42,
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      estimatedCostUsd: 0.001234,
    });

    const logs = await listRequestLogs({ applicationId: application.id, limit: 10, offset: 0 });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.status).toBe('success');
    expect(logs[0]?.model).toBe('gpt-4o');
  });

  it('filters listed logs by status', async () => {
    const application = await createApplication('integration-test-request-log-filter');
    createdApplicationIds.push(application.id);

    await recordRequestLog({
      applicationId: application.id,
      requestId: 'req-ok',
      model: 'gpt-4o',
      provider: 'openai',
      status: 'success',
      httpStatus: 200,
      attempts: 1,
      latencyMs: 10,
    });
    await recordRequestLog({
      applicationId: application.id,
      requestId: 'req-fail',
      model: 'gpt-4o',
      status: 'error',
      httpStatus: 502,
      errorCode: 'provider_error',
      attempts: 1,
      latencyMs: 5,
    });

    const errors = await listRequestLogs({
      applicationId: application.id,
      status: 'error',
      limit: 10,
      offset: 0,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.requestId).toBe('req-fail');
  });

  it('summarizes usage by day', async () => {
    const application = await createApplication('integration-test-usage-summary');
    createdApplicationIds.push(application.id);

    await recordRequestLog({
      applicationId: application.id,
      requestId: 'req-summary',
      model: 'gpt-4o',
      provider: 'openai',
      status: 'success',
      httpStatus: 200,
      attempts: 1,
      latencyMs: 20,
      totalTokens: 100,
      estimatedCostUsd: 0.5,
    });

    const summary = await getUsageSummary(new Date(Date.now() - 86_400_000), application.id);
    expect(summary).toHaveLength(1);
    expect(summary[0]?.requests).toBe(1);
    expect(summary[0]?.totalTokens).toBe(100);
    expect(summary[0]?.estimatedCostUsd).toBeCloseTo(0.5);
  });

  it('summarizes usage across every application when no applicationId is given', async () => {
    const first = await createApplication('integration-test-usage-summary-global-a');
    createdApplicationIds.push(first.id);
    const second = await createApplication('integration-test-usage-summary-global-b');
    createdApplicationIds.push(second.id);

    await recordRequestLog({
      applicationId: first.id,
      requestId: 'req-global-a',
      model: 'gpt-4o',
      status: 'success',
      httpStatus: 200,
      attempts: 1,
      latencyMs: 10,
      totalTokens: 40,
      estimatedCostUsd: 0.1,
    });
    await recordRequestLog({
      applicationId: second.id,
      requestId: 'req-global-b',
      model: 'gpt-4o',
      status: 'success',
      httpStatus: 200,
      attempts: 1,
      latencyMs: 10,
      totalTokens: 60,
      estimatedCostUsd: 0.2,
    });

    const summary = await getUsageSummary(new Date(Date.now() - 86_400_000));
    expect(summary).toHaveLength(1);
    expect(summary[0]?.requests).toBe(2);
    expect(summary[0]?.totalTokens).toBe(100);
    expect(summary[0]?.estimatedCostUsd).toBeCloseTo(0.3);
  });
});
