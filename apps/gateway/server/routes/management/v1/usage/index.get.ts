import type { UsageSummaryResponse } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import { getUsageSummary } from '../../../../database/repositories/request-logs.ts';
import { resolveLookbackSince } from '../../../../utils/lookback.ts';

export default defineHandler(async (event: H3Event): Promise<UsageSummaryResponse> => {
  const since = resolveLookbackSince(event);
  const data = await getUsageSummary(since);

  return { data };
});
