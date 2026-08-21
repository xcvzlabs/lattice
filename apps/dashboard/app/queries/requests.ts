import type { RequestLogListResponse } from '@lattice/api-contract';
import { defineQueryOptions } from '@pinia/colada';

export type RequestLogStatusFilter = 'all' | 'success' | 'error';

export const REQUEST_LOG_QUERY_KEYS = {
  root: ['requests'] as const,
  list: (status: RequestLogStatusFilter) => [...REQUEST_LOG_QUERY_KEYS.root, { status }] as const,
};

export const requestLogsQuery = defineQueryOptions((status: RequestLogStatusFilter) => ({
  key: REQUEST_LOG_QUERY_KEYS.list(status),
  query: () => {
    return useRequestFetch()<RequestLogListResponse>('/api/requests', {
      query: status === 'all' ? {} : { status },
    });
  },
}));
