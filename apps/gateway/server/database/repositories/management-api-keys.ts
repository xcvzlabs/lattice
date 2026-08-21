import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../client.ts';
import { managementApiKeys } from '../schema.ts';

export type ManagementApiKey = typeof managementApiKeys.$inferSelect;

export type CreateManagementApiKeyInput = {
  name: string;
  keyHash: string;
  keyPrefix: string;
};

export async function createManagementApiKey(
  input: CreateManagementApiKeyInput,
): Promise<ManagementApiKey> {
  const [key] = await db.insert(managementApiKeys).values(input).returning();
  if (key === undefined) {
    throw new Error('Insert into management_api_keys returned no row');
  }
  return key;
}

export async function findActiveManagementApiKeyByHash(
  keyHash: string,
): Promise<ManagementApiKey | undefined> {
  const [key] = await db
    .select()
    .from(managementApiKeys)
    .where(and(eq(managementApiKeys.keyHash, keyHash), isNull(managementApiKeys.revokedAt)))
    .limit(1);
  return key;
}

export async function touchManagementApiKeyLastUsedAt(id: string): Promise<void> {
  await db
    .update(managementApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(managementApiKeys.id, id));
}
