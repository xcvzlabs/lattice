import type { Application } from './applications.ts';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../client.ts';
import { apiKeys, applications } from '../schema.ts';

export type ApiKey = typeof apiKeys.$inferSelect;

export type CreateApiKeyInput = {
  applicationId: string;
  keyHash: string;
  keyPrefix: string;
};

export type ActiveApiKeyLookup = {
  apiKey: ApiKey;
  application: Application;
};

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  const [apiKey] = await db.insert(apiKeys).values(input).returning();
  if (apiKey === undefined) {
    throw new Error('Insert into api_keys returned no row');
  }
  return apiKey;
}

export async function findActiveApiKeyByHash(
  keyHash: string,
): Promise<ActiveApiKeyLookup | undefined> {
  const [row] = await db
    .select({ apiKey: apiKeys, application: applications })
    .from(apiKeys)
    .innerJoin(applications, eq(apiKeys.applicationId, applications.id))
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  return row;
}

export async function touchLastUsedAt(id: string): Promise<void> {
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}
