import { inArray, sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { generateApiKey, hashApiKey } from '~/apps/gateway/server/auth/api-keys.ts';
import { db } from '~/apps/gateway/server/database/client.ts';
import { createApiKey } from '~/apps/gateway/server/database/repositories/api-keys.ts';
import { createApplication } from '~/apps/gateway/server/database/repositories/applications.ts';
import { apiKeys, applications } from '~/apps/gateway/server/database/schema.ts';
import authMiddleware from '~/apps/gateway/server/middleware/02.auth.ts';
import { env } from '~/apps/gateway/server/utils/env.ts';
import { getApplication } from '~/apps/gateway/server/utils/request-context.ts';
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

describe.skipIf(!reachable)('auth middleware (integration)', () => {
  const createdApplicationIds: string[] = [];

  afterEach(async () => {
    if (createdApplicationIds.length === 0) return;
    await db.delete(apiKeys).where(inArray(apiKeys.applicationId, createdApplicationIds));
    await db.delete(applications).where(inArray(applications.id, createdApplicationIds));
    createdApplicationIds.length = 0;
  });

  async function seedActiveKey(name: string) {
    const application = await createApplication(name);
    createdApplicationIds.push(application.id);
    const { key } = generateApiKey();
    await createApiKey({
      applicationId: application.id,
      keyHash: hashApiKey(key, env.apiKeyPepper),
      keyPrefix: key.slice(0, 20),
    });
    return { application, key };
  }

  it('ignores requests outside /v1/*', async () => {
    const event = mockEvent('http://localhost/management/v1/applications');

    await expect(authMiddleware(event, noopNext)).resolves.toBeUndefined();
    expect(getApplication(event.req)).toBeUndefined();
  });

  it('rejects a request with no Authorization header', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions');

    await expect(authMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'missing_api_key' },
    });
  });

  it('rejects a non-Bearer Authorization header', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions', {
      headers: { authorization: 'Basic dGVzdA==' },
    });

    await expect(authMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'missing_api_key' },
    });
  });

  it('rejects an unknown key', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions', {
      headers: { authorization: 'Bearer lattice_sk_does-not-exist' },
    });

    await expect(authMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'invalid_api_key' },
    });
  });

  it('rejects a key belonging to a disabled application', async () => {
    const { application, key } = await seedActiveKey('integration-test-auth-mw-disabled');
    await db
      .update(applications)
      .set({ disabledAt: new Date() })
      .where(sql`${applications.id} = ${application.id}`);

    const event = mockEvent('http://localhost/v1/chat/completions', {
      headers: { authorization: `Bearer ${key}` },
    });

    await expect(authMiddleware(event, noopNext)).rejects.toMatchObject({
      status: 401,
      data: { code: 'invalid_api_key' },
    });
  });

  it('accepts a valid key and attaches the application to the request', async () => {
    const { application, key } = await seedActiveKey('integration-test-auth-mw-valid');
    const event = mockEvent('http://localhost/v1/chat/completions', {
      headers: { authorization: `Bearer ${key}` },
    });

    await expect(authMiddleware(event, noopNext)).resolves.toBeUndefined();
    expect(getApplication(event.req)?.id).toBe(application.id);
  });
});
