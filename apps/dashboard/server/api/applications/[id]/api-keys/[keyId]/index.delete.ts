import type { ApiKey } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { requireRouteParam } from '~~/server/utils/route-params.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = requireRouteParam(event, 'id');
  const keyId = requireRouteParam(event, 'keyId');
  return gatewayFetch<ApiKey>(`/applications/${id}/api-keys/${keyId}`, { method: 'DELETE' });
});
