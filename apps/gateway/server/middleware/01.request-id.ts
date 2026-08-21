import { defineMiddleware } from 'nitro';
import { setRequestId } from '../utils/request-context.ts';

export default defineMiddleware((event) => {
  setRequestId(event.req, Bun.randomUUIDv7());
});
