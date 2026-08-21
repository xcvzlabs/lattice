import type { ProviderCredentials } from './credentials.ts';
import * as v from 'valibot';

/** Thrown for boot-time model registry misconfiguration; not an HTTP request error. */
export class ModelRegistryError extends Error {
  readonly code = 'model_registry_invalid';

  constructor(message: string) {
    super(message);
    this.name = 'ModelRegistryError';
  }
}

export const providerIdSchema = v.picklist(['openai', 'anthropic', 'google', 'ollama', 'vllm']);
export type ProviderId = v.InferOutput<typeof providerIdSchema>;

const modelRegistryEntrySchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  provider: providerIdSchema,
  providerModel: v.pipe(v.string(), v.minLength(1)),
  fallback: v.optional(v.string()),
  /** Alternate names a client may use in the `model` field. Must resolve to this `id`, never to `fallback`. */
  aliases: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
});
export type ModelRegistryEntry = v.InferOutput<typeof modelRegistryEntrySchema>;

const modelRegistryConfigSchema = v.object({
  version: v.number(),
  models: v.array(modelRegistryEntrySchema),
});
export type ModelRegistryConfig = v.InferOutput<typeof modelRegistryConfigSchema>;

function validateReferences(
  registry: ModelRegistryConfig,
  providerCredentials: ProviderCredentials,
): void {
  const ids = new Set<string>();
  const aliases = new Set<string>();

  for (const model of registry.models) {
    if (ids.has(model.id)) {
      throw new ModelRegistryError(`Duplicate model id "${model.id}" in the model registry`);
    }

    ids.add(model.id);
  }

  for (const model of registry.models) {
    for (const alias of model.aliases ?? []) {
      if (ids.has(alias)) {
        throw new ModelRegistryError(`Alias "${alias}" collides with an existing model id`);
      }

      if (aliases.has(alias)) {
        throw new ModelRegistryError(`Duplicate alias "${alias}" in the model registry`);
      }

      aliases.add(alias);
    }
  }

  for (const model of registry.models) {
    if (model.fallback === model.id) {
      throw new ModelRegistryError(`Model "${model.id}" cannot fall back to itself`);
    }

    if (model.fallback !== undefined && !ids.has(model.fallback)) {
      throw new ModelRegistryError(
        `Model "${model.id}" has a fallback "${model.fallback}" that is not a known model id (aliases are not valid fallback targets)`,
      );
    }

    if (providerCredentials[model.provider] === undefined) {
      throw new ModelRegistryError(
        `Model "${model.id}" references provider "${model.provider}" but it is not configured`,
      );
    }
  }
}

export function loadModelRegistry(
  config: ModelRegistryConfig,
  providerCredentials: ProviderCredentials,
): ModelRegistryConfig {
  const registry = v.parse(modelRegistryConfigSchema, config);
  validateReferences(registry, providerCredentials);
  return registry;
}

export function lookupModel(
  registry: ModelRegistryConfig,
  id: string,
): ModelRegistryEntry | undefined {
  return registry.models.find((model) => model.id === id || model.aliases?.includes(id) === true);
}
