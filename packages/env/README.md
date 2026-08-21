# @lattice/env

Schema-driven environment variable parsing for Lattice apps, built on [Valibot](https://valibot.dev).

Unlike a "default value tells us the type" approach, the schema is the source of truth: you write the exact Valibot shape you want, and `defineEnv` reads and coerces `Bun.env` (or any source you pass in) to match it. Coercion, defaults, and refinements all live in the schema, using Valibot's own actions.

## Usage

```ts
import * as v from 'valibot';
import { defineEnv } from '@lattice/env';

export const env = defineEnv({
  schema: v.object({
    port: v.pipe(v.string(), v.toNumber()),
    db: v.object({
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      ssl: v.pipe(v.string(), v.toBoolean()),
    }),
  }),
});

// env.port: number
// env.db.host: string
// env.db.ssl: boolean
```

## Env var naming

Each schema key contributes a segment of the env var name. Nested `v.object()` groups join their parent's path with `_`, and camelCase keys split at case boundaries. Given the schema above, `defineEnv` reads `PORT`, `DB_HOST`, `DB_PORT`, and `DB_SSL`.

| Schema path     | Env var           |
| --------------- | ----------------- |
| `port`          | `PORT`            |
| `db.host`       | `DB_HOST`         |
| `db.apiBaseUrl` | `DB_API_BASE_URL` |

Only `v.object()` is treated as a grouping node. Every other schema type, including `v.pipe()`, `v.optional()`, and `v.array()`, is a leaf: `defineEnv` reads one env var for it and hands the raw string to the schema to validate and coerce.

## Where values come from

`defineEnv` reads from `Bun.env` by default. Bun already loads `.env`, `.env.local`, and `.env.$NODE_ENV` files before your code runs, so there's no bundled dotenv parser here. Pass `source` to read from somewhere else, such as in a test:

```ts
defineEnv({ schema, source: { PORT: '3000' } });
```

## Errors

A failing schema throws `EnvValidationError` (`error.code === 'ENV_VALIDATION_ERROR'`) with every failing var listed on `error.issues`, not just the first:

```
Invalid environment variables:
  - DB_HOST: Invalid type: Expected string but received undefined
  - DB_PORT: Invalid type: Expected string but received undefined
```

Each entry in `error.issues` has `envVar` (the derived name), `path` (the dot path into the schema), and `message` (Valibot's own message for that issue).
