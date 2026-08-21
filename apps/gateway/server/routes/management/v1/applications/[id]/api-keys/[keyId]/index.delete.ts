import type { ApiKey } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { revokeApiKey } from '../../../../../../../database/repositories/api-keys.ts';
import { toApiKeyDto } from '../../../../../../../management/serializers.ts';
import { createLatticeError } from '../../../../../../../utils/errors.ts';
import { requireRouteParam } from '../../../../../../../utils/route-params.ts';

export default defineHandler(async (event: H3Event): Promise<ApiKey> => {
  const applicationId = requireRouteParam(event, 'id');
  const keyId = requireRouteParam(event, 'keyId');

  const apiKey = await revokeApiKey(keyId, applicationId);

  if (apiKey === undefined) {
    throw createLatticeError(
      404,
      'not_found',
      `No active API key "${keyId}" found for application "${applicationId}"`,
    );
  }

  return toApiKeyDto(apiKey);
});
