import type { ApiKeyListResponse } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { requireRouteParam } from '~~/server/utils/route-params.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = requireRouteParam(event, 'id');
  return gatewayFetch<ApiKeyListResponse>(`/applications/${id}/api-keys`);
});
