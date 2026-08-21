import type { CreateApiKeyResponse } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { generateApiKey, hashApiKey } from '../../../../../../auth/api-keys.ts';
import { createApiKey } from '../../../../../../database/repositories/api-keys.ts';
import { getApplicationById } from '../../../../../../database/repositories/applications.ts';
import { toApiKeyDto } from '../../../../../../management/serializers.ts';
import { env } from '../../../../../../utils/env.ts';
import { createLatticeError } from '../../../../../../utils/errors.ts';
import { requireRouteParam } from '../../../../../../utils/route-params.ts';

export default defineHandler(async (event: H3Event): Promise<CreateApiKeyResponse> => {
  const applicationId = requireRouteParam(event, 'id');
  const application = await getApplicationById(applicationId);

  if (application === undefined) {
    throw createLatticeError(404, 'not_found', `Application "${applicationId}" not found`);
  }

  const generated = generateApiKey();
  const keyHash = hashApiKey(generated.key, env.apiKeyPepper);

  const apiKey = await createApiKey({
    applicationId,
    keyHash,
    keyPrefix: generated.prefix,
  });

  return { apiKey: toApiKeyDto(apiKey), key: generated.key };
});
