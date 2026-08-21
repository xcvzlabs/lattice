import type { UsageSummaryResponse } from '@lattice/api-contract';
import { defineQueryOptions } from '@pinia/colada';

export const USAGE_QUERY_KEYS = {
  root: ['usage'] as const,
  summary: (days: number) => [...USAGE_QUERY_KEYS.root, { days }] as const,
};

export const usageSummaryQuery = defineQueryOptions((days: number) => ({
  key: USAGE_QUERY_KEYS.summary(days),
  query: () => useRequestFetch()<UsageSummaryResponse>('/api/usage', { query: { days } }),
}));
