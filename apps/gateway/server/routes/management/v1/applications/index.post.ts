import type { Application } from '@lattice/api-contract';
import { createApplicationRequestSchema } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import * as v from 'valibot';
import { createApplication } from '../../../../database/repositories/applications.ts';
import { toApplicationDto } from '../../../../management/serializers.ts';
import { createLatticeError } from '../../../../utils/errors.ts';

export default defineHandler(async (event: H3Event): Promise<Application> => {
  let rawBody: unknown;

  try {
    rawBody = await event.req.json();
  } catch {
    throw createLatticeError(400, 'invalid_request', 'Request body must be valid JSON');
  }

  const parsedBody = v.safeParse(createApplicationRequestSchema, rawBody);

  if (!parsedBody.success) {
    throw createLatticeError(400, 'invalid_request', 'Invalid create-application request body');
  }

  const application = await createApplication(parsedBody.output.name);
  return toApplicationDto(application);
});
