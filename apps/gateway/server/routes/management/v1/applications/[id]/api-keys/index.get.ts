import type { ApiKeyListResponse } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { listApiKeysForApplication } from '../../../../../../database/repositories/api-keys.ts';
import { getApplicationById } from '../../../../../../database/repositories/applications.ts';
import { toApiKeyDto } from '../../../../../../management/serializers.ts';
import { createLatticeError } from '../../../../../../utils/errors.ts';
import { requireRouteParam } from '../../../../../../utils/route-params.ts';

export default defineHandler(async (event: H3Event): Promise<ApiKeyListResponse> => {
  const applicationId = requireRouteParam(event, 'id');
  const application = await getApplicationById(applicationId);

  if (application === undefined) {
    throw createLatticeError(404, 'not_found', `Application "${applicationId}" not found`);
  }

  const apiKeys = await listApiKeysForApplication(applicationId);
  return { data: apiKeys.map(toApiKeyDto) };
});
