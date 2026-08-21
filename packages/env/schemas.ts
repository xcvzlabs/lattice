import * as v from 'valibot';

/**
 * Parses an environment variable string as a boolean. Every raw env value is a string, and
 * valibot's own `v.toBoolean()` does a plain `Boolean(value)` coercion — since any non-empty
 * string (including the literal text `"false"`) is truthy in JS, that action can never actually
 * produce `false` for a set env var. This only accepts the literal strings `"true"`/`"false"`.
 */
export const booleanEnvSchema = v.pipe(
  v.picklist(['true', 'false']),
  v.transform((value) => value === 'true'),
);
