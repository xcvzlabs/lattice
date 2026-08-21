import type { ModelRegistryConfig } from './models.ts';

/**
 * Starter model registry for Phase 1. Which exact provider models are exposed, and how
 * they fall back to one another, is a deploy-time product decision. Adjust this list
 * before shipping to a real environment rather than treating it as a fixed catalog.
 */
export const modelRegistryConfig: ModelRegistryConfig = {
  version: 1,
  models: [
    {
      id: 'gpt-4o',
      provider: 'openai',
      providerModel: 'gpt-4o',
      fallback: 'claude-sonnet',
    },
    {
      id: 'claude-sonnet',
      provider: 'anthropic',
      providerModel: 'claude-sonnet-4-5',
      fallback: 'gemini-pro',
    },
    {
      id: 'gemini-pro',
      provider: 'google',
      providerModel: 'gemini-2.5-pro',
    },
  ],
};
