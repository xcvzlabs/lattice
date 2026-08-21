import type { RegistryModelListResponse } from '@lattice/api-contract';
import { defineQueryOptions } from '@pinia/colada';

export const MODEL_QUERY_KEYS = {
  root: ['models'] as const,
};

export const registryModelsQuery = defineQueryOptions({
  key: MODEL_QUERY_KEYS.root,
  query: () => useRequestFetch()<RegistryModelListResponse>('/api/models'),
});
