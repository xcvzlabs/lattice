import type { RegistryModelListResponse } from '@lattice/api-contract';
import { defineHandler } from 'nitro';
import { dispatchDeps } from '../../../../routing/deps.ts';

export default defineHandler((): RegistryModelListResponse => {
  return {
    data: dispatchDeps.registry.models.map((model) => ({
      id: model.id,
      provider: model.provider,
      providerModel: model.providerModel,
      fallbacks: model.fallbacks ?? [],
      aliases: model.aliases ?? [],
      pricing: model.pricing ?? null,
    })),
  };
});
