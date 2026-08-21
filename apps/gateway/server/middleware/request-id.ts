import { defineMiddleware } from 'nitro';
import { setRequestId } from '../utils/request-context.ts';

// Placed under server/middleware/ deliberately so filesystem auto-registration applies it
// globally (unlike the /v1/**-scoped auth handler, every route should get a correlation id).
export default defineMiddleware((event) => {
  setRequestId(event.req, Bun.randomUUIDv7());
});
