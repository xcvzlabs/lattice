# AGENTS.md

## Project Overview

- **Name**: lattice — Centralized AI infrastructure for connecting applications to cloud and self-hosted models
- **Runtime**: Bun v1.4.0 (requires Node ^26.0.0)
- **Package Manager**: Bun (frozen lockfile)
- **Type**: Module (ESM)

## Commands

| Command                | Purpose                            |
| ---------------------- | ---------------------------------- |
| `bun install`          | Install dependencies               |
| `bun run index.ts`     | Run the application                |
| `bun run fmt`          | Format code with oxfmt             |
| `bun run fmt:check`    | Check formatting                   |
| `bun run lint`         | Lint with oxlint (type-aware)      |
| `bun run check`        | Format + lint (run before commits) |
| `bun run test`         | Run tests with vitest              |
| `bun run test:watch`   | Watch mode                         |
| `bun run test:verbose` | Verbose test output                |

## CI Order (enforced in GitHub Actions)

1. `lint` → 2. `format` → 3. `test` (parallel, then aggregated)

## Pre-commit / Pre-push

- **Pre-commit**: `bun run stage` (lint-staged: formats + lints staged files)
- **Pre-push**: `bun run test` (typecheck commented out)

## Code Style

- **Formatter**: oxfmt (single quotes, sorted imports, Tailwind class sorting)
- **Linter**: oxlint with TypeScript, Vue, Unicorn, Import, OXC plugins
- **Type-aware linting**: Enabled (`typeAware: true`, `typeCheck: true`)
- **Strict TS**: `strict: true`, `verbatimModuleSyntax: true`, `noUncheckedIndexedAccess: true`

## Testing

- **Framework**: vitest
- **Test files**: `tests/**/*.test.ts`
- **Environment**: Node
- **Alias**: `~` maps to project root

## Project Structure

- Tests in `tests/`
- Config files at root

## Key Config Files

- `tsconfig.json` — TypeScript config (bundler mode, ESNext)
- `oxlint.config.ts` — Lint rules (strict, type-aware)
- `oxfmt.config.ts` — Format rules
- `vitest.config.ts` — Test config
- `lint-staged.config.ts` — Pre-commit file filters

## Gotchas

- Uses Bun-specific types (`@types/bun` from catalog)
- No typecheck script defined (pre-push has it commented out)
- `bun run check` runs fmt + fmt:check + lint — use this before pushing
- oxlint ignores `**/.*/**` and `*.d.ts`
- oxfmt ignores `CHANGELOG.md`

## Bun

- Since this is using Bun, use native Bun APIs as much as possible

## Code conventions

- **`verbatimModuleSyntax`** — use `import type` for type-only imports
- **Explicit `.ts` extensions** in import paths
- **Single quotes**, no semicolons
- **`no-console`** only allows `console.error`
- **`no-non-null-assertion`** and **`no-unsafe-type-assertion`** are errors — no `!` or `as` casts
- Pre-commit: husky + lint-staged runs oxfmt and oxlint on staged files

## Editing Guidance

- Make the smallest correct change.
- Do not polish unrelated code.
- Do not remove correct comments or documentation.
- Do not rename broad parts of the codebase unless required.
- Do not expand a change into a repo-wide refactor unless necessary.
- Prefer leaving correct existing code in place.
- When touching production-sensitive code, prioritize reliability over clever abstractions.

## Formatting And Style

- Match the surrounding file's formatting instead of hand-styling custom layouts.
- Prefer `function name()` for named functions and helpers.
- Do not prefer `const fn = () => {}` for normal top-level helpers.
- Exception: callbacks should stay as arrows, for example `items.map((item) => item.id)`.
- If only one or two properties is needed from iterated item and will not conflict other variables, prefer destructuring.
- Prefer functions over classes.
- Existing classes that are already correct can stay; do not rewrite them for style only.
- Keep diffs small and focused.

## Types And Naming

- Prefer `type` over `interface`.
- Avoid `any`; prefer `unknown` and narrow it explicitly but avoid creating isRecord function.
- Add explicit return types to exported functions and non-trivial helpers.
- Use string literal unions for small state enums like `'ok' | 'error'`.
- Keep generics minimal and purposeful.
- Reuse existing helper types before inventing new ones.
- Use descriptive names.
- Do not abbreviate iterable items; prefer `item`, `entry`, `record`, `status`.
- Avoid one-letter names except for conventional indexes.

## Validation, Errors, And Responses

- Use Valibot for environment parsing, form validation, and request validation.
- Prefer `camelCaseSchema` over `PascalCaseSchema` in generating schemas.
- Prefer composable `v.pipe()` schemas with built-in actions and reusable transform helpers instead of manual parsing or ad-hoc validation logic.
- Validate once at the boundary, not repeatedly in inner layers.
- Never throw raw strings.
- Catch infrastructure errors where graceful degradation is expected.
- Clean up temporary resources in `finally` blocks.
- Include stable error codes in config validation and app-level failures.

## Agents

- Disable co-author and never commit nor push.
- Do not preserve backward compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- If you need a paragraph-long comment to justify why the workaround is OK, the code is wrong — fix the code.
- Always use the unslop skill when generating texts as well as in adding jsdocs/tsdocs or just comments

<!-- Nitro Rules Start -->

This project is based on [Nitro v3](https://nitro.build), [h3](https://h3.dev/), and [Rolldown](https://rolldown.rs/).

Refer to `node_modules/nitro/dist/docs/README.md` when working on server (your knowledge about Nitro v3 is likely outdated!).

## Project Structure

`server/` contains server-side code with supported subdirs (create as needed): `api/` (/api prefixed handlers), `routes/` (non-prefixed route handlers), `middleware/`, `plugins/`, `utils/`, `assets/`, and `tasks/`. `public/` holds static assets (copied, not bundled). Config files: `nitro.config.ts` (serverDir, routeRules, preset, etc.), `tsconfig.json`.

## Conventions

- Path alias `~/*` (tsconfig), use explicit `.ts` extensions

## LLM References

- Nitro V3 <https://nitro.build/llms.txt>
- H3 V2 <https://h3.dev/llms.txt>

<!-- Nitro Rules End -->
