import { defineMiddleware } from 'nitro';
import { verifyApiKey } from '../auth/verify-api-key.ts';
import { createLatticeError } from '../utils/errors.ts';
import { setApplication } from '../utils/request-context.ts';

const BEARER_PREFIX = 'Bearer ';

export default defineMiddleware(async (event) => {
  if (!event.url.pathname.startsWith('/v1/')) return;

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
