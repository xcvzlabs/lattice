import * as v from 'valibot';

/** Public projection of an api_keys row — never includes the hash. */
export const apiKeySchema = v.object({
  id: v.string(),
  applicationId: v.string(),
  keyPrefix: v.string(),
  createdAt: v.string(),
  revokedAt: v.nullable(v.string()),
  lastUsedAt: v.nullable(v.string()),
});
export type ApiKey = v.InferOutput<typeof apiKeySchema>;

export const apiKeyListResponseSchema = v.object({
  data: v.array(apiKeySchema),
});
export type ApiKeyListResponse = v.InferOutput<typeof apiKeyListResponseSchema>;

/** `key` is the raw secret, present only in the response of the creating call — it is never
 * retrievable again afterward. */
export const createApiKeyResponseSchema = v.object({
  apiKey: apiKeySchema,
  key: v.string(),
});
export type CreateApiKeyResponse = v.InferOutput<typeof createApiKeyResponseSchema>;
