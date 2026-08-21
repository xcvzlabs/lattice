import type { RequestLogListResponse } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { toQueryString, type QueryParams } from '~~/server/utils/query-string.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const query = toQueryString(getQuery<QueryParams>(event));
  return gatewayFetch<RequestLogListResponse>(`/requests${query}`);
});
