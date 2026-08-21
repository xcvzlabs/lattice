import type { Application } from '../database/repositories/applications.ts';
import { createLatticeError } from './errors.ts';

/** No-op when the application has no configured allowlist (`allowedModels === null`). Checked
 * against the raw `model` field the client sent, before alias resolution. */
export function assertModelPermitted(application: Application, requestedModel: string): void {
  if (application.allowedModels === null) return;

  if (!application.allowedModels.includes(requestedModel)) {
    throw createLatticeError(
      403,
      'model_not_permitted',
      `This application is not permitted to use model "${requestedModel}"`,
    );
  }
}
