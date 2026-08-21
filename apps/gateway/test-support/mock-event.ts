// Re-exported from a location inside apps/gateway (rather than imported directly from
// tests/) so module resolution reaches `nitro`, which is only installed under this
// workspace package, not hoisted to the repo root.
export { mockEvent } from 'nitro/h3';

/** This gateway's middleware never call `next`, they just return or throw, but h3's
 * `Middleware` type still requires it — tests calling one directly need a stand-in. */
export function noopNext(): undefined {
  return undefined;
}
