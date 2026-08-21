import type { ModelListResponse } from '@lattice/api-contract';
import { defineHandler } from 'nitro';
import { modelRegistry } from '../../../registry/index.ts';

export default defineHandler((): ModelListResponse => {
  const createdAt = Math.floor(Date.now() / 1000);

  return {
    object: 'list',
    data: modelRegistry.models.map((model) => ({
      id: model.id,
      object: 'model',
      created: createdAt,
      owned_by: model.provider,
    })),
  };
});
