import type { UsageSummaryResponse } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { getApplicationById } from '../../../../../database/repositories/applications.ts';
import { getUsageSummary } from '../../../../../database/repositories/request-logs.ts';
import { createLatticeError } from '../../../../../utils/errors.ts';
import { resolveLookbackSince } from '../../../../../utils/lookback.ts';
import { requireRouteParam } from '../../../../../utils/route-params.ts';

export default defineHandler(async (event: H3Event): Promise<UsageSummaryResponse> => {
  const applicationId = requireRouteParam(event, 'id');
  const application = await getApplicationById(applicationId);

  if (application === undefined) {
    throw createLatticeError(404, 'not_found', `Application "${applicationId}" not found`);
  }

  const since = resolveLookbackSince(event);
  const data = await getUsageSummary(since, applicationId);

  return { data };
});
