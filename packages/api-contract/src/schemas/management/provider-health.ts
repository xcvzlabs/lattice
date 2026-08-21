import * as v from 'valibot';

export const circuitStateSchema = v.picklist(['closed', 'open', 'half-open']);
export type CircuitState = v.InferOutput<typeof circuitStateSchema>;

export const providerHealthSchema = v.object({
  provider: v.string(),
  circuitState: circuitStateSchema,
  models: v.array(
    v.object({
      modelId: v.string(),
      averageLatencyMs: v.nullable(v.number()),
    }),
  ),
});
export type ProviderHealth = v.InferOutput<typeof providerHealthSchema>;

export const providerHealthResponseSchema = v.object({
  data: v.array(providerHealthSchema),
});
export type ProviderHealthResponse = v.InferOutput<typeof providerHealthResponseSchema>;
