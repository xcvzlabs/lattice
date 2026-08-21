import { eq, inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~/apps/gateway/server/database/client.ts';
import {
  createApiKey,
  findActiveApiKeyByHash,
  touchLastUsedAt,
} from '~/apps/gateway/server/database/repositories/api-keys.ts';
import { createApplication } from '~/apps/gateway/server/database/repositories/applications.ts';
import { apiKeys, applications } from '~/apps/gateway/server/database/schema.ts';

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
