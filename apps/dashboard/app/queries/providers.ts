import type { ProviderHealthResponse } from '@lattice/api-contract';
import { defineQueryOptions } from '@pinia/colada';

export const PROVIDER_QUERY_KEYS = {
  root: ['providers'] as const,
};

export const providersQuery = defineQueryOptions({
  key: PROVIDER_QUERY_KEYS.root,
  query: () => useRequestFetch()<ProviderHealthResponse>('/api/providers'),
});
