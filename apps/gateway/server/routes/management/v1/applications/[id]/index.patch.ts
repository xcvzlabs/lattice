import type { Application } from '@lattice/api-contract';
import { updateApplicationRequestSchema } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import * as v from 'valibot';
import {
  disableApplication,
  enableApplication,
  getApplicationById,
  updateApplication,
} from '../../../../../database/repositories/applications.ts';
import { toApplicationDto } from '../../../../../management/serializers.ts';
import { createLatticeError } from '../../../../../utils/errors.ts';
import { requireRouteParam } from '../../../../../utils/route-params.ts';

function notFound(id: string): never {
  throw createLatticeError(404, 'not_found', `Application "${id}" not found`);
}

export default defineHandler(async (event: H3Event): Promise<Application> => {
  const id = requireRouteParam(event, 'id');

  let rawBody: unknown;

  try {
    rawBody = await event.req.json();
  } catch {
    throw createLatticeError(400, 'invalid_request', 'Request body must be valid JSON');
  }

  const parsedBody = v.safeParse(updateApplicationRequestSchema, rawBody);

  if (!parsedBody.success) {
    throw createLatticeError(400, 'invalid_request', 'Invalid update-application request body');
  }

  const existing = await getApplicationById(id);
  if (existing === undefined) notFound(id);

  const { disabled, ...fields } = parsedBody.output;

  if (Object.keys(fields).length > 0) {
    await updateApplication(id, fields);
  }

  // `disabled` toggles disabledAt via its own repository call — updateApplication never
  // touches that column, so an update and a disable/enable in the same request compose cleanly.
  if (disabled !== undefined) {
    await (disabled ? disableApplication(id) : enableApplication(id));
  }

  const application = await getApplicationById(id);
  if (application === undefined) notFound(id);

  return toApplicationDto(application);
});
