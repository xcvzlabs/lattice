import type { Application } from './applications.ts';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { createLatticeError } from '../../utils/errors.ts';
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
    throw createLatticeError(500, 'internal_error', 'Insert into api_keys returned no row');
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

export async function listApiKeysForApplication(applicationId: string): Promise<ApiKey[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.applicationId, applicationId))
    .orderBy(desc(apiKeys.createdAt));
}

/** Idempotent: revoking an already-revoked key leaves its original `revokedAt` untouched. */
export async function revokeApiKey(id: string, applicationId: string): Promise<ApiKey | undefined> {
  const [apiKey] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(apiKeys.id, id), eq(apiKeys.applicationId, applicationId), isNull(apiKeys.revokedAt)),
    )
    .returning();
  return apiKey;
}
