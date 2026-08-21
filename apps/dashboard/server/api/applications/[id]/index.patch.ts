import type { Application } from '@lattice/api-contract';
import { updateApplicationRequestSchema } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { requireRouteParam } from '~~/server/utils/route-params.ts';
import { readValibotBody } from '~~/server/utils/validate-body.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const id = requireRouteParam(event, 'id');
  const body = await readValibotBody(event, updateApplicationRequestSchema);
  return gatewayFetch<Application>(`/applications/${id}`, { method: 'PATCH', body });
});
