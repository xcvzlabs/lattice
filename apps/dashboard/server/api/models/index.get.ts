import type { RegistryModelListResponse } from '@lattice/api-contract';
import { gatewayFetch } from '~~/server/utils/gateway-client.ts';

export default defineEventHandler(async (event) => {
  await requireUserSession(event);
  return gatewayFetch<RegistryModelListResponse>('/models');
});
