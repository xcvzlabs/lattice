import type { ApplicationListResponse } from '@lattice/api-contract';
import { defineHandler } from 'nitro';
import { listApplications } from '../../../../database/repositories/applications.ts';
import { toApplicationDto } from '../../../../management/serializers.ts';

export default defineHandler(async (): Promise<ApplicationListResponse> => {
  const applications = await listApplications();
  return { data: applications.map(toApplicationDto) };
});
