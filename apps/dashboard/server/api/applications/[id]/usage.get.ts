import type { UsageSummaryResponse } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { toQueryString, type QueryParams } from '~~/server/utils/query-string.ts';
import { requireRouteParam } from '~~/server/utils/route-params.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = requireRouteParam(event, 'id');
  const query = toQueryString(getQuery<QueryParams>(event));
  return gatewayFetch<UsageSummaryResponse>(`/applications/${id}/usage${query}`);
});
