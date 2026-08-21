import { defineMiddleware } from 'nitro';
import { verifyManagementApiKey } from '../auth/verify-management-api-key.ts';
import { createLatticeError } from '../utils/errors.ts';

const BEARER_PREFIX = 'Bearer ';

export default defineMiddleware(async (event) => {
  if (!event.url.pathname.startsWith('/management/v1/')) return;

  const header = event.req.headers.get('authorization');

  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    throw createLatticeError(401, 'missing_api_key', 'Missing management API key');
  }

  const key = header.slice(BEARER_PREFIX.length).trim();
  const isValid = await verifyManagementApiKey(key);

  if (!isValid) {
    throw createLatticeError(401, 'invalid_api_key', 'Invalid management API key');
  }
});
