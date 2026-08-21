import type { Application } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { getApplicationById } from '../../../../../database/repositories/applications.ts';
import { toApplicationDto } from '../../../../../management/serializers.ts';
import { createLatticeError } from '../../../../../utils/errors.ts';
import { requireRouteParam } from '../../../../../utils/route-params.ts';

export default defineHandler(async (event: H3Event): Promise<Application> => {
  const id = requireRouteParam(event, 'id');
  const application = await getApplicationById(id);

  if (application === undefined) {
    throw createLatticeError(404, 'not_found', `Application "${id}" not found`);
  }

  return toApplicationDto(application);
});
