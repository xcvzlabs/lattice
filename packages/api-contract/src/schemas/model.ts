import * as v from 'valibot';

export const modelSchema = v.object({
  id: v.string(),
  object: v.literal('model'),
  created: v.number(),
  owned_by: v.string(),
});
export type Model = v.InferOutput<typeof modelSchema>;

export const modelListResponseSchema = v.object({
  object: v.literal('list'),
  data: v.array(modelSchema),
});
export type ModelListResponse = v.InferOutput<typeof modelListResponseSchema>;
