<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Testing', order: 3 },
  });

  useSeoMeta({
    title: 'Testing',
    description: 'How the test suite is organized and how to run it.',
  });

  const vitestConfig = `export default defineConfig({
  resolve: { alias: { '~': /* repo root */ } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    restoreMocks: true,
  },
})`;

  const mirroredLayout = `apps/gateway/server/routing/dispatch.ts
tests/apps/gateway/server/routing/dispatch.test.ts

packages/env/define-env.ts
tests/packages/env/define-env.test.ts`;

  const runCommands = `bun run test            # vitest run, repo-wide
bun run test:watch      # watch mode
bun run test:verbose    # verbose reporter`;

  const subsetCommand = 'bunx --bun vitest run tests/apps/gateway/server/routing';
</script>

<template>
  <DocPage>
    <ProseH1 id="testing">Testing</ProseH1>

    <ProseH2 id="framework">Framework</ProseH2>
    <p>
      <ProseA href="https://vitest.dev">Vitest</ProseA>, configured at the repo root
      (<ProseCode>vitest.config.ts</ProseCode>) — one test runner for every workspace, not per-app
      config duplication.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="vitestConfig"
    />

    <ProseH2 id="mirrored-layout-not-colocated-tests">Mirrored layout, not colocated tests</ProseH2>
    <p>
      Every test lives under <ProseCode>tests/</ProseCode>, at the same relative path as the source
      file it covers — not next to the source:
    </p>
    <CodeBlock
      language="text"
      filename="text"
      :code="mirroredLayout"
    />
    <p>
      This keeps <ProseCode>server/</ProseCode> and <ProseCode>app/</ProseCode> directories free of
      test-file noise, and makes "does this file have a test" a pure path transformation — no
      searching for a colocated <ProseCode>*.test.ts</ProseCode> sibling.
    </p>

    <ProseH2 id="running-tests">Running tests</ProseH2>
    <CodeBlock
      language="bash"
      filename="bash"
      :code="runCommands"
    />
    <p>To run a subset, pass a path filter straight to Vitest:</p>
    <CodeBlock
      language="bash"
      filename="bash"
      :code="subsetCommand"
    />

    <ProseH2 id="integration-tests-and-the-gateways-env"
      >Integration tests and the gateway's <ProseCode>.env</ProseCode></ProseH2
    >
    <p>
      <ProseCode>vitest.config.ts</ProseCode> explicitly loads
      <ProseCode>apps/gateway/.env</ProseCode> before the suite runs (guarded with
      <ProseCode>existsSync</ProseCode>, since CI injects real environment variables directly rather
      than checking in a <ProseCode>.env</ProseCode> file). This is required for integration tests
      that hit a real Postgres instance —
      <ProseCode>middleware/auth.integration.test.ts</ProseCode>,
      <ProseCode>middleware/rate-limit.integration.test.ts</ProseCode>,
      <ProseCode>middleware/management-auth.integration.test.ts</ProseCode>,
      <ProseCode>database/repositories.integration.test.ts</ProseCode>, and
      <ProseCode>routing/state-sync.integration.test.ts</ProseCode> — so they need a running,
      migrated database matching your <ProseCode>apps/gateway/.env</ProseCode>, not just installed
      dependencies.
    </p>

    <ProseH2 id="whats-covered">What's covered</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Area</ProseTh>
          <ProseTh>Test files</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr
          ><ProseTd>Auth</ProseTd
          ><ProseTd
            ><ProseCode>auth/api-keys.test.ts</ProseCode>,
            <ProseCode>middleware/auth.integration.test.ts</ProseCode>,
            <ProseCode>middleware/management-auth.integration.test.ts</ProseCode></ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd>Rate limiting</ProseTd
          ><ProseTd
            ><ProseCode>middleware/rate-limit.integration.test.ts</ProseCode>,
            <ProseCode>middleware/request-id.test.ts</ProseCode></ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd>Providers</ProseTd
          ><ProseTd
            >One
            <ProseCode>adapter</ProseCode
            >/<ProseCode>request</ProseCode>/<ProseCode>response</ProseCode>/<ProseCode
              >stream</ProseCode
            >
            test file per provider under <ProseCode>providers/&lt;name&gt;/</ProseCode></ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd>Registry</ProseTd
          ><ProseTd><ProseCode>registry/models.test.ts</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd>Routing</ProseTd
          ><ProseTd
            ><ProseCode>routing/circuit-breaker.test.ts</ProseCode>,
            <ProseCode>routing/dispatch.test.ts</ProseCode>,
            <ProseCode>routing/latency-tracker.test.ts</ProseCode>,
            <ProseCode>routing/scoring.test.ts</ProseCode>,
            <ProseCode>routing/state-sync.integration.test.ts</ProseCode></ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd>Database</ProseTd
          ><ProseTd
            ><ProseCode>database/repositories.integration.test.ts</ProseCode></ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd>Shared packages</ProseTd
          ><ProseTd
            ><ProseCode>packages/api-contract/schemas/*.test.ts</ProseCode>,
            <ProseCode>packages/env/*.test.ts</ProseCode></ProseTd
          ></ProseTr
        >
      </tbody>
    </ProseTable>

    <ProseH2 id="mocking-conventions">Mocking conventions</ProseH2>
    <p>
      The anti-slop lint plugin's <ProseCode>no-module-mocking</ProseCode> rule (see
      <ProseA href="/development/coding-standards#anti-slop-lint-plugin">Coding Standards</ProseA>)
      steers away from mocking whole modules. Provider adapters accept an injectable
      <ProseCode>deps: { fetchImpl?: FetchLike }</ProseCode> specifically so tests can substitute a
      fake <ProseCode>fetch</ProseCode> at the function-parameter level instead of mocking
      <ProseCode>node:fetch</ProseCode>/global fetch wholesale — see any
      <ProseCode>providers/&lt;name&gt;/adapter.test.ts</ProseCode> for the pattern.
    </p>

    <ProseH2 id="writing-a-new-test">Writing a new test</ProseH2>
    <p>
      Match the mirrored path, and follow the nearest existing test file in the same directory for
      setup/teardown conventions — integration tests generally clean up the rows they write, unit
      tests generally don't touch the database at all.
    </p>
  </DocPage>
</template>
