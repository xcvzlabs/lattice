import type { Application } from '../database/repositories/applications.ts';
import { findActiveApiKeyByHash, touchLastUsedAt } from '../database/repositories/api-keys.ts';
import { env } from '../utils/env.ts';
import { hashApiKey } from './api-keys.ts';

export async function verifyApiKey(key: string): Promise<Application | null> {
  const keyHash = hashApiKey(key, env.apiKeyPepper);
  const lookup = await findActiveApiKeyByHash(keyHash);

  if (lookup === undefined || lookup.application.disabledAt !== null) {
    return null;
  }

  try {
    await touchLastUsedAt(lookup.apiKey.id);
  } catch (error) {
    console.error('Failed to update api_keys.last_used_at', { apiKeyId: lookup.apiKey.id, error });
  }

  return lookup.application;
}
