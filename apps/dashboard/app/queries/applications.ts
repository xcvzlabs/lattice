import type {
  ApiKeyListResponse,
  Application,
  ApplicationListResponse,
  UsageSummaryResponse,
} from '@lattice/api-contract';
import { defineQueryOptions } from '@pinia/colada';

export type ApplicationUsageParams = {
  id: string;
  days: number;
};

export const APPLICATION_QUERY_KEYS = {
  root: ['applications'] as const,
  detail: (id: string) => [...APPLICATION_QUERY_KEYS.root, id] as const,
  apiKeys: (id: string) => [...APPLICATION_QUERY_KEYS.detail(id), 'api-keys'] as const,
  usage: (id: string, days: number) =>
    [...APPLICATION_QUERY_KEYS.detail(id), 'usage', { days }] as const,
};

export const applicationsListQuery = defineQueryOptions({
  key: APPLICATION_QUERY_KEYS.root,
  query: () => useRequestFetch()<ApplicationListResponse>('/api/applications'),
});

export const applicationByIdQuery = defineQueryOptions((id: string) => ({
  key: APPLICATION_QUERY_KEYS.detail(id),
  query: () => useRequestFetch()<Application>(`/api/applications/${id}`),
}));

export const applicationApiKeysQuery = defineQueryOptions((id: string) => ({
  key: APPLICATION_QUERY_KEYS.apiKeys(id),
  query: () => useRequestFetch()<ApiKeyListResponse>(`/api/applications/${id}/api-keys`),
}));

export const applicationUsageQuery = defineQueryOptions((params: ApplicationUsageParams) => ({
  key: APPLICATION_QUERY_KEYS.usage(params.id, params.days),
  query: () => {
    return useRequestFetch()<UsageSummaryResponse>(`/api/applications/${params.id}/usage`, {
      query: { days: params.days },
    });
  },
}));
