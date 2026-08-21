import type { Application, CreateApplicationRequest } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  const body = await readBody<CreateApplicationRequest>(event);
  return gatewayFetch<Application>('/applications', { method: 'POST', body });
});
