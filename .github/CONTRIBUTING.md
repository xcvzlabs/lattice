# Contributing to Lattice

Thanks for taking the time to contribute. This document covers how to set up the project, the standards we hold changes to, and how a pull request gets from open to merged.

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to Contribute

- **Bug reports** — open an [issue](https://github.com/xcvzlabs/lattice/issues/new/choose) using the bug report template.
- **Feature requests** — open an issue using the feature request template, or start a [discussion](https://github.com/xcvzlabs/lattice/discussions) if the idea isn't concrete yet.
- **Security vulnerabilities** — do not open a public issue. Follow [`SECURITY.md`](./SECURITY.md) instead.
- **Code and documentation** — pull requests are welcome. For anything larger than a small fix, open an issue first so we can align on direction before you invest the time.

## Development Setup

Lattice requires Bun 1.4+ and Node ^26 (see `devEngines`/`engines` in `package.json`).

```bash
bun install
```

The `gateway` and `dashboard` apps each need their own `.env` (copy `apps/gateway/.env.example` and `apps/dashboard/.env.example`) and a Postgres database. See the [README](../README.md#development) for the full setup, including generating an `API_KEY_PEPPER` and seeding a management API key.

Read the [README](../README.md) for how the system fits together (routing, failover, the model registry, the management API) before making a structural change — it'll save you from re-deriving decisions that are already documented.

## Coding Standards

The full set of conventions this project enforces lives in [`AGENTS.md`](../AGENTS.md) (symlinked as `CLAUDE.md`). The short version:

- TypeScript strict mode, `verbatimModuleSyntax`, explicit `.ts` extensions in imports, no `any`, no non-null assertions (`!`), no unsafe `as` casts.
- Prefer `function name()` over `const name = () => {}` for top-level helpers; arrow functions stay for callbacks.
- Prefer `type` over `interface`, and Valibot (`v.pipe()`) for parsing and validation at the boundary rather than ad-hoc checks.
- Make the smallest correct change. Don't refactor unrelated code, don't add speculative abstractions, and don't leave a change half-finished.

Formatting and linting are automated, not a matter of taste:

```bash
bun run check   # fmt + fmt:check + lint
```

A pre-commit hook (husky + lint-staged) runs this against staged files automatically.

## Testing

```bash
bun run test          # vitest, once
bun run test:watch    # vitest, watch mode
bun run typecheck     # typecheck every workspace
```

Add or update tests for any behavior change. `tests/` mirrors `apps/` and `packages/` by path, so a change to `apps/gateway/server/routing/dispatch.ts` should have a corresponding test under `tests/apps/gateway/server/routing/`.

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add project switcher
fix: handle empty test results
chore(ci): bump action versions
docs: update deployment guide
```

This applies to your PR title in particular. Individual commits within a PR don't need to be squeaky clean, since we squash on merge, but the PR title becomes the commit message that ships to `main`.

## Pull Request Process

1. Fork the repository (or branch directly, if you have write access) and make your change.
2. Run `bun run check` and `bun run test` locally. Both must pass before CI will pass.
3. Open a pull request against `main`. The template will prompt you for a description, related issues, and a testing summary.
4. CI runs lint, format check, typecheck, and the test suite in parallel; all four must pass.
5. A maintainer will review your PR. Expect requests for changes on anything touching auth, provider credentials, routing, or the management API — those paths get closer scrutiny by design.
6. Once approved and green, a maintainer merges. We use squash merges, so keep your PR title accurate: it becomes the commit message.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](../LICENSE).
