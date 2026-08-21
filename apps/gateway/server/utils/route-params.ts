import type { H3Event } from 'nitro';
import { createLatticeError } from './errors.ts';

/** Nitro's filesystem router guarantees a matched `[param]` segment is present at runtime; this
 * only throws if that invariant is ever violated, not as a real per-request condition. */
export function requireRouteParam(event: H3Event, name: string): string {
  const value = event.context.params?.[name];

  if (value === undefined) {
    throw createLatticeError(400, 'invalid_request', `Missing route parameter "${name}"`);
  }

  return value;
}
