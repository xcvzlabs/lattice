import {
  findActiveManagementApiKeyByHash,
  touchManagementApiKeyLastUsedAt,
} from '../database/repositories/management-api-keys.ts';
import { env } from '../utils/env.ts';
import { hashApiKey } from './api-keys.ts';

/** Returns `true` once a valid, unrevoked management key is presented — there's no per-key
 * identity to hand back to callers yet, only a single admin trust tier. */
export async function verifyManagementApiKey(key: string): Promise<boolean> {
  const keyHash = hashApiKey(key, env.apiKeyPepper);
  const managementApiKey = await findActiveManagementApiKeyByHash(keyHash);

  if (managementApiKey === undefined) {
    return false;
  }

  try {
    await touchManagementApiKeyLastUsedAt(managementApiKey.id);
  } catch (error) {
    console.error('Failed to update management_api_keys.last_used_at', {
      managementApiKeyId: managementApiKey.id,
      error,
    });
  }

  return true;
}
