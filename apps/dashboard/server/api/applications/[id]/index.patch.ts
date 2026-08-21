import type { Application, UpdateApplicationRequest } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { requireRouteParam } from '~~/server/utils/route-params.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = requireRouteParam(event, 'id');
  const body = await readBody<UpdateApplicationRequest>(event);
  return gatewayFetch<Application>(`/applications/${id}`, { method: 'PATCH', body });
});
