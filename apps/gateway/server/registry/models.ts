import * as v from 'valibot';

/** Thrown for boot-time model registry misconfiguration; not an HTTP request error. */
export class ModelRegistryError extends Error {
  readonly code = 'model_registry_invalid';

  constructor(message: string) {
    super(message);
    this.name = 'ModelRegistryError';
  }
}

export const providerIdSchema = v.picklist(['openai', 'anthropic', 'google']);
export type ProviderId = v.InferOutput<typeof providerIdSchema>;

export type ProviderApiKeys = Partial<Record<ProviderId, string>>;

const modelRegistryEntrySchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  provider: providerIdSchema,
  providerModel: v.pipe(v.string(), v.minLength(1)),
  fallback: v.optional(v.string()),
});
export type ModelRegistryEntry = v.InferOutput<typeof modelRegistryEntrySchema>;

const modelRegistryConfigSchema = v.object({
  version: v.number(),
  models: v.array(modelRegistryEntrySchema),
});
export type ModelRegistryConfig = v.InferOutput<typeof modelRegistryConfigSchema>;

function validateReferences(registry: ModelRegistryConfig, providerApiKeys: ProviderApiKeys): void {
  const ids = new Set<string>();

  for (const model of registry.models) {
    if (ids.has(model.id)) {
      throw new ModelRegistryError(`Duplicate model id "${model.id}" in the model registry`);
    }

    ids.add(model.id);
  }

  for (const model of registry.models) {
    if (model.fallback === model.id) {
      throw new ModelRegistryError(`Model "${model.id}" cannot fall back to itself`);
    }

    if (model.fallback !== undefined && !ids.has(model.fallback)) {
      throw new ModelRegistryError(
        `Model "${model.id}" has an unknown fallback "${model.fallback}"`,
      );
    }

    if (providerApiKeys[model.provider] === undefined) {
      throw new ModelRegistryError(
        `Model "${model.id}" references provider "${model.provider}" but its API key is not set`,
      );
    }
  }
}

export function loadModelRegistry(
  config: ModelRegistryConfig,
  providerApiKeys: ProviderApiKeys,
): ModelRegistryConfig {
  const registry = v.parse(modelRegistryConfigSchema, config);
  validateReferences(registry, providerApiKeys);
  return registry;
}

export function lookupModel(
  registry: ModelRegistryConfig,
  id: string,
): ModelRegistryEntry | undefined {
  return registry.models.find((model) => model.id === id);
}
