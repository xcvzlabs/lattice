import type { Application } from '@lattice/api-contract';
import { createApplicationRequestSchema } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';
import { readValibotBody } from '~~/server/utils/validate-body.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const body = await readValibotBody(event, createApplicationRequestSchema);
  return gatewayFetch<Application>('/applications', { method: 'POST', body });
});
