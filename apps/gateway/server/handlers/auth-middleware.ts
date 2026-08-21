import { defineMiddleware } from 'nitro';
import { verifyApiKey } from '../auth/verify-api-key.ts';
import { createLatticeError } from '../utils/errors.ts';
import { setApplication } from '../utils/request-context.ts';

const BEARER_PREFIX = 'Bearer ';

// Registered scoped to /v1/** via nitro.config.ts's `handlers` config, deliberately NOT placed
// under server/middleware/. Files there are auto-registered globally (matching /**) by
// filesystem convention, which would also apply this to unauthenticated routes like /health.
export default defineMiddleware(async (event) => {
  const header = event.req.headers.get('authorization');

  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    throw createLatticeError(401, 'missing_api_key', 'Missing API key');
  }

  const key = header.slice(BEARER_PREFIX.length).trim();
  const application = await verifyApiKey(key);

  if (application === null) {
    throw createLatticeError(401, 'invalid_api_key', 'Invalid API key');
  }

  setApplication(event.req, application);
});
