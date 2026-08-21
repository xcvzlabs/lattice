import { inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey } from '~/apps/gateway/server/auth/api-keys.ts';
import { db } from '~/apps/gateway/server/database/client.ts';
import { createManagementApiKey } from '~/apps/gateway/server/database/repositories/management-api-keys.ts';
import { managementApiKeys } from '~/apps/gateway/server/database/schema.ts';
import managementAuthMiddleware from '~/apps/gateway/server/middleware/04.management-auth.ts';
import { env } from '~/apps/gateway/server/utils/env.ts';
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

describe.skipIf(!reachable)('management-auth middleware (integration)', () => {
  const createdManagementApiKeyIds: string[] = [];

  afterEach(async () => {
    if (createdManagementApiKeyIds.length === 0) return;
    await db
      .delete(managementApiKeys)
      .where(inArray(managementApiKeys.id, createdManagementApiKeyIds));
    createdManagementApiKeyIds.length = 0;
  });

  async function seedActiveKey(name: string) {
    const { key } = generateApiKey();
    const managementApiKey = await createManagementApiKey({
      name,
      keyHash: hashApiKey(key, env.apiKeyPepper),
      keyPrefix: key.slice(0, 20),
    });
    createdManagementApiKeyIds.push(managementApiKey.id);
    return { managementApiKey, key };
  }

  it('ignores requests outside /management/v1/*', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions');

    await expect(managementAuthMiddleware(event, noopNext)).resolves.toBeUndefined();
  });

  it('rejects a request with no Authorization header', async () => {
    const event = mockEvent('http://localhost/management/v1/applications');

    await expect(managementAuthMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'missing_api_key' },
    });
  });

  it('rejects an unknown key', async () => {
    const event = mockEvent('http://localhost/management/v1/applications', {
      headers: { authorization: 'Bearer lattice_sk_does-not-exist' },
    });

    await expect(managementAuthMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'invalid_api_key' },
    });
  });

  it('rejects a revoked key', async () => {
    const { managementApiKey, key } = await seedActiveKey(
      'integration-test-management-auth-mw-revoked',
    );
    await db
      .update(managementApiKeys)
      .set({ revokedAt: new Date() })
      .where(sql`${managementApiKeys.id} = ${managementApiKey.id}`);

    const event = mockEvent('http://localhost/management/v1/applications', {
      headers: { authorization: `Bearer ${key}` },
    });

    await expect(managementAuthMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'invalid_api_key' },
    });
  });

  it('accepts a valid key', async () => {
    const { key } = await seedActiveKey('integration-test-management-auth-mw-valid');
    const event = mockEvent('http://localhost/management/v1/applications', {
      headers: { authorization: `Bearer ${key}` },
    });

    await expect(managementAuthMiddleware(event, noopNext)).resolves.toBeUndefined();
  });
});
