import type { Model, ModelListResponse } from '@lattice/api-contract';
import type { ModelRegistryEntry } from '../../../registry/index.ts';
import { defineHandler } from 'nitro';
import { modelRegistry } from '../../../registry/index.ts';

function toModelEntries(model: ModelRegistryEntry, createdAt: number): Model[] {
  const entries: Model[] = [
    {
      id: model.id,
      object: 'model',
      created: createdAt,
      owned_by: model.provider,
    },
  ];

  for (const alias of model.aliases ?? []) {
    entries.push({
      id: alias,
      object: 'model',
      created: createdAt,
      owned_by: model.provider,
    });
  }

  return entries;
}

export default defineHandler((): ModelListResponse => {
  const createdAt = Math.floor(Date.now() / 1000);

  return {
    object: 'list',
    data: modelRegistry.models.flatMap((model) => toModelEntries(model, createdAt)),
  };
});
