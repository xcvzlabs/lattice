import { describe, expect, it } from 'vitest';
import {
  loadModelRegistry,
  lookupModel,
  ModelRegistryError,
  type ModelRegistryConfig,
  type ProviderApiKeys,
} from '~/apps/gateway/server/registry/models.ts';

const providerApiKeys: ProviderApiKeys = {
  openai: 'sk-test',
  anthropic: 'sk-test',
  google: 'sk-test',
};

function baseConfig(): ModelRegistryConfig {
  return {
    version: 1,
    models: [
      { id: 'gpt-4o', provider: 'openai', providerModel: 'gpt-4o', fallback: 'claude-sonnet' },
      { id: 'claude-sonnet', provider: 'anthropic', providerModel: 'claude-sonnet-4-5' },
    ],
  };
}

describe('loadModelRegistry', () => {
  it('accepts a valid registry', () => {
    const registry = loadModelRegistry(baseConfig(), providerApiKeys);
    expect(registry.models).toHaveLength(2);
  });

  it('rejects a duplicate model id', () => {
    const config = baseConfig();
    config.models.push({ id: 'gpt-4o', provider: 'openai', providerModel: 'gpt-4o-mini' });

    expect(() => loadModelRegistry(config, providerApiKeys)).toThrow(ModelRegistryError);
  });

  it('rejects a fallback referencing an unknown model', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.fallback = 'does-not-exist';

    expect(() => loadModelRegistry(config, providerApiKeys)).toThrow(ModelRegistryError);
  });

  it('rejects a model that falls back to itself', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.fallback = first.id;

    expect(() => loadModelRegistry(config, providerApiKeys)).toThrow(ModelRegistryError);
  });

  it('rejects a model whose provider has no api key configured', () => {
    const config = baseConfig();

    expect(() => loadModelRegistry(config, { anthropic: 'sk-test' })).toThrow(ModelRegistryError);
  });

  it('rejects a structurally invalid config', () => {
    expect(() =>
      loadModelRegistry(
        // @ts-expect-error intentionally malformed to exercise structural validation
        { version: 1, models: [{ id: '', provider: 'openai' }] },
        providerApiKeys,
      ),
    ).toThrow();
  });
});

describe('lookupModel', () => {
  it('finds a model by id', () => {
    const registry = loadModelRegistry(baseConfig(), providerApiKeys);
    expect(lookupModel(registry, 'gpt-4o')?.provider).toBe('openai');
  });

  it('returns undefined for an unknown id', () => {
    const registry = loadModelRegistry(baseConfig(), providerApiKeys);
    expect(lookupModel(registry, 'unknown-model')).toBeUndefined();
  });
});
