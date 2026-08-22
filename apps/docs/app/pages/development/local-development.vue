<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Local Development', order: 1 },
  });

  useSeoMeta({
    title: 'Local Development',
    description: 'Day-to-day commands for working across the monorepo.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="local-development">Local Development</ProseH1>

    <ProseH2 id="workspace-wide-commands">Workspace-wide commands</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Command</ProseTh>
          <ProseTh>Purpose</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>bun install</ProseCode></ProseTd>
          <ProseTd>Install every workspace's dependencies.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run check</ProseCode></ProseTd>
          <ProseTd>Format + format-check + lint. Run before pushing.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run test</ProseCode></ProseTd>
          <ProseTd><ProseCode>vitest run</ProseCode>, repo-wide.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run typecheck</ProseCode></ProseTd>
          <ProseTd>
            Typecheck every workspace (<ProseCode>packages/env</ProseCode>,
            <ProseCode>packages/api-contract</ProseCode>, <ProseCode>apps/gateway</ProseCode>, then
            <ProseCode>apps/dashboard</ProseCode>'s own <ProseCode>nuxt typecheck</ProseCode>).
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd
            ><ProseCode>bun run fmt</ProseCode> / <ProseCode>bun run fmt:check</ProseCode></ProseTd
          >
          <ProseTd>oxfmt, write or check-only.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run lint</ProseCode></ProseTd>
          <ProseTd>oxlint, type-aware.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH2 id="per-app-filtering">Per-app filtering</ProseH2>
    <CodeBlock
      language="bash"
      filename="bash"
      code="bun --filter gateway <script>    # or: bun run gateway <script>
bun --filter dashboard <script>  # or: bun run dashboard <script>
bun run docs <script>"
    />
    <p>
      Root <ProseCode>package.json</ProseCode> defines <ProseCode>gateway</ProseCode>,
      <ProseCode>dashboard</ProseCode>, and <ProseCode>docs</ProseCode> as shorthands for the
      respective <ProseCode>bun --filter</ProseCode>.
    </p>

    <ProseH3 id="gateway-apps-gateway">Gateway (<ProseCode>apps/gateway</ProseCode>)</ProseH3>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Command</ProseTh>
          <ProseTh>Purpose</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>bun run dev</ProseCode></ProseTd>
          <ProseTd><ProseCode>nitro dev</ProseCode>, default <ProseCode>:3001</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run build</ProseCode> / <ProseCode>preview</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>nitro build</ProseCode> / <ProseCode>nitro preview</ProseCode>.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run db:migrate</ProseCode></ProseTd>
          <ProseTd>Apply pending Drizzle migrations.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run db:generate</ProseCode></ProseTd>
          <ProseTd>Generate a new migration from schema changes.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run db:studio</ProseCode></ProseTd>
          <ProseTd>Drizzle Studio against the gateway's DB.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run generate-pepper</ProseCode></ProseTd>
          <ProseTd>Print a fresh <ProseCode>API_KEY_PEPPER</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run seed &lt;name&gt;</ProseCode></ProseTd>
          <ProseTd>Create an application + its first API key.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run seed-management-key &lt;name&gt;</ProseCode></ProseTd>
          <ProseTd>Mint a management API key.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="dashboard-apps-dashboard"
      >Dashboard (<ProseCode>apps/dashboard</ProseCode>)</ProseH3
    >
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Command</ProseTh>
          <ProseTh>Purpose</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>bun run dev</ProseCode></ProseTd>
          <ProseTd><ProseCode>nuxt dev</ProseCode>, default <ProseCode>:3000</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run build</ProseCode> / <ProseCode>preview</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>nuxt build</ProseCode> / <ProseCode>nuxt preview</ProseCode>.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run typecheck</ProseCode></ProseTd>
          <ProseTd><ProseCode>nuxt typecheck</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run db:migrate</ProseCode></ProseTd>
          <ProseTd>Apply better-auth's schema migrations against the dashboard's own DB.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>bun run db:studio</ProseCode></ProseTd>
          <ProseTd>Drizzle Studio against the dashboard's DB.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH2 id="running-one-app-against-a-real-gateway"
      >Running one app against a real gateway</ProseH2
    >
    <p>
      The dashboard and gateway are independently runnable — you don't need both if you're only
      changing one. To iterate on the dashboard alone, point
      <ProseCode>LATTICE_GATEWAY_URL</ProseCode> at any running gateway (local or shared) and skip
      standing up a second Postgres database for gateway data.
    </p>

    <ProseH2 id="ci-order">CI order</ProseH2>
    <CodeBlock
      language="text"
      filename="text"
      code="lint → format → test (parallel, then aggregated)"
    />
    <p>
      Mirrors what <ProseCode>bun run check</ProseCode> plus <ProseCode>bun run test</ProseCode> do
      locally — running both before pushing catches everything CI will.
    </p>

    <ProseH2 id="git-hooks">Git hooks (husky)</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Hook</ProseTh>
          <ProseTh>Runs</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Pre-commit</ProseTd>
          <ProseTd>
            <ProseCode>bun run stage</ProseCode> → <ProseCode>lint-staged</ProseCode>: oxfmt +
            oxlint on staged <ProseCode>*.{ts,vue,md,yml,json,css,html}</ProseCode> files only.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Pre-push</ProseTd>
          <ProseTd>
            <ProseCode>bun run test</ProseCode> (typecheck is intentionally commented out here — see
            <ProseA href="/development/coding-standards">Coding Standards</ProseA>).
          </ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      Hooks are installed automatically by the <ProseCode>prepare</ProseCode> script the first time
      you run <ProseCode>bun install</ProseCode>.
    </p>

    <ProseH2 id="testing">Testing</ProseH2>
    <p>
      See <ProseA href="/development/testing">Testing</ProseA> for the full layout and how to run a
      subset.
    </p>

    <ProseH2 id="database-work">Database work</ProseH2>
    <p>
      See <ProseA href="/development/database-and-migrations">Database &amp; Migrations</ProseA> for
      the Drizzle Kit workflow shared by both apps.
    </p>
  </DocPage>
</template>
