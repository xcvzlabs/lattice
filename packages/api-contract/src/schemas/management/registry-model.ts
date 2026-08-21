import * as v from 'valibot';

/** The management API's read-only surface over the gateway's static model registry — richer
 * than the OpenAI-compatible `/v1/models` listing (see `../model.ts`), for the dashboard's
 * policy editor. The registry itself stays static TS config; this is a read view, not a CRUD
 * resource. */
export const registryModelSchema = v.object({
  id: v.string(),
  provider: v.string(),
  providerModel: v.string(),
  fallbacks: v.array(v.string()),
  aliases: v.array(v.string()),
  pricing: v.nullable(
    v.object({
      inputPerMillionUsd: v.number(),
      outputPerMillionUsd: v.number(),
    }),
  ),
});
export type RegistryModel = v.InferOutput<typeof registryModelSchema>;

export const registryModelListResponseSchema = v.object({
  data: v.array(registryModelSchema),
});
export type RegistryModelListResponse = v.InferOutput<typeof registryModelListResponseSchema>;
