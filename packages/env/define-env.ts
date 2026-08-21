import * as v from 'valibot';
import { EnvValidationError, type EnvIssue } from './errors.ts';

export type EnvSource = Readonly<Record<string, string | undefined>>;

export type DefineEnvOptions<TSchema extends v.GenericSchema> = {
  /** A Valibot object schema. Nested `v.object()` groups map to `_`-joined env var names, so `db.host` reads `DB_HOST`. */
  readonly schema: TSchema;
  /** Where raw values are read from. Defaults to `Bun.env`, which Bun already populates from `.env` files. */
  readonly source?: EnvSource;
};

type RawEnvValue = string | undefined | { readonly [key: string]: RawEnvValue };

function toEnvVarName(path: readonly string[]): string {
  return path
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase())
    .join('_');
}

function isObjectSchema(
  schema: v.GenericSchema,
): schema is v.ObjectSchema<v.ObjectEntries, v.ErrorMessage<v.ObjectIssue> | undefined> {
  return schema.type === 'object';
}

function buildRawInput(
  schema: v.GenericSchema,
  source: EnvSource,
  path: readonly string[],
): RawEnvValue {
  if (!isObjectSchema(schema)) return source[toEnvVarName(path)];

  const entries: Record<string, RawEnvValue> = {};
  for (const [key, entrySchema] of Object.entries(schema.entries)) {
    entries[key] = buildRawInput(entrySchema, source, [...path, key]);
  }
  return entries;
}

function toEnvIssue(issue: v.BaseIssue<unknown>): EnvIssue {
  const path = v.getDotPath(issue);
  return {
    envVar: path === null ? '(root)' : toEnvVarName(path.split('.')),
    path: path ?? '(root)',
    message: issue.message,
  };
}

/** Bun.env when running under Bun; falls back to process.env for tools (e.g. drizzle-kit) that load config in a plain Node subprocess. */
function defaultSource(): EnvSource {
  return 'Bun' in globalThis ? Bun.env : process.env;
}

/**
 * Reads and validates environment variables against a Valibot schema.
 *
 * Nested `v.object()` groups derive their env var name from the key path, so
 * `v.object({ db: v.object({ host: v.string() }) })` reads `DB_HOST`. Coercion
 * (`v.toNumber()`, `v.toBoolean()`, …) belongs in the schema itself, since every
 * raw value is a string.
 */
export function defineEnv<TSchema extends v.GenericSchema>(
  options: DefineEnvOptions<TSchema>,
): v.InferOutput<TSchema> {
  const source = options.source ?? defaultSource();
  const raw = buildRawInput(options.schema, source, []);
  const result = v.safeParse(options.schema, raw);

  if (!result.success) {
    throw new EnvValidationError(result.issues.map(toEnvIssue));
  }

  return result.output;
}
