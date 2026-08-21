import type { ProviderCredentials } from '~/apps/gateway/server/registry/credentials.ts';
import { describe, expect, it } from 'vitest';
import {
  loadModelRegistry,
  lookupModel,
  ModelRegistryError,
  type ModelRegistryConfig,
} from '~/apps/gateway/server/registry/models.ts';

const providerCredentials: ProviderCredentials = {
  openai: { apiKey: 'sk-test' },
  anthropic: { apiKey: 'sk-test' },
  google: { apiKey: 'sk-test' },
};

function baseConfig(): ModelRegistryConfig {
  return {
    version: 1,
    models: [
      { id: 'gpt-4o', provider: 'openai', providerModel: 'gpt-4o', fallbacks: ['claude-sonnet'] },
      { id: 'claude-sonnet', provider: 'anthropic', providerModel: 'claude-sonnet-4-5' },
    ],
  };
}

describe('loadModelRegistry', () => {
  it('accepts a valid registry', () => {
    const registry = loadModelRegistry(baseConfig(), providerCredentials);
    expect(registry.models).toHaveLength(2);
  });

  it('rejects a duplicate model id', () => {
    const config = baseConfig();
    config.models.push({ id: 'gpt-4o', provider: 'openai', providerModel: 'gpt-4o-mini' });

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('rejects a fallback referencing an unknown model', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.fallbacks = ['does-not-exist'];

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('rejects a model that falls back to itself', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.fallbacks = [first.id];

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('rejects a fallback chain listing the same model twice', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    config.models.push({ id: 'gemini-pro', provider: 'google', providerModel: 'gemini-2.5-pro' });
    first.fallbacks = ['claude-sonnet', 'claude-sonnet'];

    expect(() =>
      loadModelRegistry(config, { ...providerCredentials, google: { apiKey: 'sk-test' } }),
    ).toThrow(ModelRegistryError);
  });

  it('accepts a multi-hop fallback chain', () => {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    config.models.push({ id: 'gemini-pro', provider: 'google', providerModel: 'gemini-2.5-pro' });
    first.fallbacks = ['claude-sonnet', 'gemini-pro'];

    const registry = loadModelRegistry(config, {
      ...providerCredentials,
      google: { apiKey: 'sk-test' },
    });
    expect(registry.models).toHaveLength(3);
  });

  it('rejects a model whose provider is not configured', () => {
    const config = baseConfig();

    expect(() => loadModelRegistry(config, { anthropic: { apiKey: 'sk-test' } })).toThrow(
      ModelRegistryError,
    );
  });

  it('accepts a self-hosted provider with a base URL but no api key', () => {
    const config: ModelRegistryConfig = {
      version: 1,
      models: [{ id: 'llama3', provider: 'ollama', providerModel: 'llama3' }],
    };

    const registry = loadModelRegistry(config, { ollama: { baseUrl: 'http://localhost:11434' } });
    expect(registry.models).toHaveLength(1);
  });

  it('rejects a structurally invalid config', () => {
    expect(() =>
      loadModelRegistry(
        // @ts-expect-error intentionally malformed to exercise structural validation
        { version: 1, models: [{ id: '', provider: 'openai' }] },
        providerCredentials,
      ),
    ).toThrow();
  });
});

describe('aliases', () => {
  function configWithAlias(): ModelRegistryConfig {
    const config = baseConfig();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.aliases = ['company/smart'];
    return config;
  }

  it('rejects an alias that collides with an existing model id', () => {
    const config = configWithAlias();
    const [first] = config.models;
    if (first === undefined) throw new Error('expected a first model in the base config');
    first.aliases = ['claude-sonnet'];

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('rejects a duplicate alias across models', () => {
    const config = configWithAlias();
    const [, second] = config.models;
    if (second === undefined) throw new Error('expected a second model in the base config');
    second.aliases = ['company/smart'];

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('rejects a fallback that targets an alias instead of a canonical id', () => {
    const config = configWithAlias();
    const [, second] = config.models;
    if (second === undefined) throw new Error('expected a second model in the base config');
    second.fallbacks = ['company/smart'];

    expect(() => loadModelRegistry(config, providerCredentials)).toThrow(ModelRegistryError);
  });

  it('resolves a model by its alias', () => {
    const registry = loadModelRegistry(configWithAlias(), providerCredentials);
    expect(lookupModel(registry, 'company/smart')?.id).toBe('gpt-4o');
  });
});

describe('lookupModel', () => {
  it('finds a model by id', () => {
    const registry = loadModelRegistry(baseConfig(), providerCredentials);
    expect(lookupModel(registry, 'gpt-4o')?.provider).toBe('openai');
  });

  it('returns undefined for an unknown id', () => {
    const registry = loadModelRegistry(baseConfig(), providerCredentials);
    expect(lookupModel(registry, 'unknown-model')).toBeUndefined();
  });
});
