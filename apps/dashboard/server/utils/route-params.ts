import type { H3Event } from 'h3';

/** Nuxt's filesystem router guarantees a matched `[param]` segment is present at runtime; this
 * only throws if that invariant is ever violated, not as a real per-request condition. */
export function requireRouteParam(event: H3Event, name: string): string {
  const value = getRouterParam(event, name);

  if (value === undefined) {
    throw createError({ status: 400, statusMessage: `Missing route parameter "${name}"` });
  }

  return value;
}
