import type { ProviderHealthResponse } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  return gatewayFetch<ProviderHealthResponse>('/providers');
});
