<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Getting Started', sectionOrder: 1, title: 'Project Structure', order: 4 },
  });

  useSeoMeta({
    title: 'Project Structure',
    description: 'How the repository is organized, app by app and package by package.',
  });

  const tree = `lattice/
├── apps/
│   ├── gateway/                    Nitro + h3, the AI gateway itself
│   │   ├── scripts/                 generate-pepper, seed-application, seed-management-key
│   │   └── server/
│   │       ├── routes/v1/            OpenAI-compatible API (chat completions, models)
│   │       ├── routes/management/    admin API (applications, api-keys, usage, requests…)
│   │       ├── providers/            per-provider adapters (openai, anthropic, google, …)
│   │       ├── registry/             model registry + provider credential resolution
│   │       ├── routing/              dispatch, scoring, circuit breaker, latency tracker
│   │       ├── auth/                 API key hashing + verification
│   │       ├── middleware/           request-id, auth, rate-limit, management-auth
│   │       ├── management/           DB row → API response serializers
│   │       ├── database/             Drizzle schema, migrations, repositories
│   │       ├── plugins/              evlog, shutdown, state-sync (Nitro lifecycle hooks)
│   │       └── utils/                errors, quota, policy, cost, env, request-context…
│   │
│   ├── dashboard/                  Nuxt 4 + Nuxt UI, admin dashboard
│   │   ├── app/
│   │   │   ├── pages/                 route components
│   │   │   ├── queries/               Pinia Colada read queries
│   │   │   ├── mutations/             Pinia Colada write mutations
│   │   │   └── layouts/               shared dashboard shell
│   │   └── server/
│   │       ├── api/                   proxies to the gateway's management API
│   │       ├── database/              Drizzle schema for better-auth's own tables
│   │       └── utils/                 gatewayFetch, env, validation helpers
│   │
│   └── docs/                       this documentation site
│
├── packages/
│   ├── api-contract/               shared Valibot schemas + inferred types
│   └── env/                        typed, validated environment parsing (\`defineEnv\`)
│
├── tests/                          mirrors apps/ and packages/ by path
│   ├── apps/gateway/server/...
│   └── packages/...
│
└── tools/oxlint/                   custom oxlint plugin configuration`;
</script>

<template>
  <DocPage>
    <ProseH1 id="project-structure">Project Structure</ProseH1>
    <CodeBlock
      language="text"
      filename="text"
      :code="tree"
    />

    <ProseH2 id="design-principle-mirrored-test-tree">Design principle: mirrored test tree</ProseH2>
    <p>
      Every source file's tests live at the same relative path under <ProseCode>tests/</ProseCode>,
      not next to the source. <ProseCode>apps/gateway/server/routing/dispatch.ts</ProseCode> is
      tested by <ProseCode>tests/apps/gateway/server/routing/dispatch.test.ts</ProseCode>. This
      keeps <ProseCode>server/</ProseCode> and <ProseCode>app/</ProseCode> free of
      <ProseCode>*.test.ts</ProseCode> noise and makes "does this file have a test" a single path
      transformation.
    </p>

    <ProseH2 id="design-principle-server-subdirectories-are-nitro-conventions">
      Design principle: <ProseCode>server/</ProseCode> subdirectories are Nitro conventions
    </ProseH2>
    <p>
      Both <ProseCode>apps/gateway</ProseCode> and <ProseCode>apps/dashboard</ProseCode> follow
      <ProseA href="https://nitro.build">Nitro v3</ProseA>'s server directory layout:
      <ProseCode>routes/</ProseCode> for <ProseCode>/</ProseCode>-rooted handlers,
      <ProseCode>api/</ProseCode> for <ProseCode>/api</ProseCode>-prefixed handlers (dashboard only
      — the gateway prefixes explicitly via its own <ProseCode>routes/v1</ProseCode> and
      <ProseCode>routes/management</ProseCode> folders instead), <ProseCode>middleware/</ProseCode>,
      <ProseCode>plugins/</ProseCode>, and <ProseCode>utils/</ProseCode>. File-based routing means
      the path
      <ProseCode>server/routes/management/v1/applications/[id]/index.get.ts</ProseCode> maps
      directly to <ProseCode>GET /management/v1/applications/:id</ProseCode>.
    </p>

    <ProseH2 id="design-principle-shared-packages-not-duplicated-types">
      Design principle: shared packages, not duplicated types
    </ProseH2>
    <p>
      <ProseCode>packages/api-contract</ProseCode> and <ProseCode>packages/env</ProseCode> exist
      because the gateway, the dashboard, and (indirectly) any future client all need the same
      request/response shapes and the same environment-parsing discipline. Rather than each app
      declaring its own <ProseCode>ChatCompletionRequest</ProseCode> type or its own ad-hoc
      <ProseCode>process.env.FOO</ProseCode> reads, both import from these two workspace packages —
      see <ProseA href="/development/shared-packages">Shared Packages</ProseA>.
    </p>

    <ProseH2 id="where-things-are-configured">Where things are configured</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Concern</ProseTh>
          <ProseTh>File</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Gateway server directory, preset, error handler</ProseTd>
          <ProseTd><ProseCode>apps/gateway/nitro.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Gateway environment schema</ProseTd>
          <ProseTd><ProseCode>apps/gateway/server/utils/env.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Model registry (what models exist, fallbacks, pricing)</ProseTd>
          <ProseTd><ProseCode>apps/gateway/server/registry/models.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Gateway database schema</ProseTd>
          <ProseTd><ProseCode>apps/gateway/server/database/schema.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Dashboard Nuxt modules, app metadata</ProseTd>
          <ProseTd><ProseCode>apps/dashboard/nuxt.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Dashboard auth (better-auth)</ProseTd>
          <ProseTd><ProseCode>apps/dashboard/server/auth.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Dashboard environment schema</ProseTd>
          <ProseTd><ProseCode>apps/dashboard/server/utils/env.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Dashboard database schema (better-auth tables only)</ProseTd>
          <ProseTd><ProseCode>apps/dashboard/server/database/schema.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Lint rules</ProseTd>
          <ProseTd><ProseCode>oxlint.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Format rules</ProseTd>
          <ProseTd><ProseCode>oxfmt.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Test runner</ProseTd>
          <ProseTd><ProseCode>vitest.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Pre-commit file filters</ProseTd>
          <ProseTd><ProseCode>lint-staged.config.ts</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
  </DocPage>
</template>
