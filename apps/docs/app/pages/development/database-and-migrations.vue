<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Database & Migrations', order: 5 },
  });

  useSeoMeta({
    title: 'Database & Migrations',
    description: 'The Drizzle Kit workflow shared by the gateway and the dashboard.',
  });

  const commands = `bun run db:generate   # diff schema.ts against the last migration, write a new one
bun run db:migrate    # apply pending migrations
bun run db:push       # push schema.ts directly, skipping migration files (dev/prototyping only)
bun run db:pull       # introspect an existing database back into a schema
bun run db:studio     # Drizzle Studio, a local DB browser/editor
bun run db:check      # verify migration history consistency`;

  const drizzleConfig = `// apps/gateway/drizzle.config.ts
export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: env.db,
  introspect: { casing: 'camel' },
  out: './server/database/migrations',
  schema: './server/database/schema.ts',
})`;

  const generateCommand = 'bun run db:generate';
  const migrateCommand = 'bun run db:migrate';
</script>

<template>
  <DocPage>
    <ProseH1 id="database-migrations">Database &amp; Migrations</ProseH1>
    <p>
      Both <ProseCode>apps/gateway</ProseCode> and <ProseCode>apps/dashboard</ProseCode> own an
      independent Postgres schema, each managed by
      <ProseA href="https://orm.drizzle.team">Drizzle ORM</ProseA> +
      <ProseA href="https://orm.drizzle.team/kit-docs/overview">Drizzle Kit</ProseA>, with identical
      tooling and commands — just pointed at different schema files and, typically, different
      databases.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh>Gateway</ProseTh>
          <ProseTh>Dashboard</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Schema file</ProseTd>
          <ProseTd><ProseCode>apps/gateway/server/database/schema.ts</ProseCode></ProseTd>
          <ProseTd><ProseCode>apps/dashboard/server/database/schema.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Migrations dir</ProseTd>
          <ProseTd><ProseCode>apps/gateway/server/database/migrations/</ProseCode></ProseTd>
          <ProseTd><ProseCode>apps/dashboard/server/database/migrations/</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>What it owns</ProseTd>
          <ProseTd
            >Applications, API keys, usage, rate limits, request logs, provider circuit/latency
            state — see <ProseA href="/architecture/data-model">Data Model</ProseA></ProseTd
          >
          <ProseTd
            >better-auth's
            <ProseCode>user</ProseCode
            >/<ProseCode>session</ProseCode>/<ProseCode>account</ProseCode>/<ProseCode
              >verification</ProseCode
            >
            tables only</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd>Driver</ProseTd>
          <ProseTd><ProseCode>drizzle-orm/bun-sql</ProseCode></ProseTd>
          <ProseTd><ProseCode>drizzle-orm/bun-sql</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH2 id="commands-identical-in-both-apps">Commands (identical in both apps)</ProseH2>
    <CodeBlock
      language="bash"
      filename="bash"
      :code="commands"
    />
    <p>
      Run these from inside the app directory (<ProseCode>apps/gateway</ProseCode> or
      <ProseCode>apps/dashboard</ProseCode>), or via
      <ProseCode>bun --filter gateway db:migrate</ProseCode> /
      <ProseCode>bun --filter dashboard db:migrate</ProseCode> from the repo root.
    </p>

    <ProseH2 id="configuration">Configuration</ProseH2>
    <p>
      <ProseCode>drizzle.config.ts</ProseCode> in each app reads its own validated
      <ProseCode>env.db</ProseCode> object (from
      <ProseA href="/development/shared-packages#lattice-env">@lattice/env</ProseA>) rather than
      duplicating connection-string parsing:
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="drizzleConfig"
    />
    <p>
      Because that <ProseCode>env</ProseCode> import goes through <ProseCode>defineEnv</ProseCode>,
      running any <ProseCode>db:*</ProseCode> command with a missing or invalid
      <ProseCode>DB_*</ProseCode> variable fails immediately with a clear validation error, not a
      cryptic connection failure.
    </p>

    <ProseH2 id="making-a-schema-change">Making a schema change</ProseH2>
    <Steps>
      <ProseH3>Edit the schema</ProseH3>
      <p>
        Change <ProseCode>server/database/schema.ts</ProseCode> — add/remove a column, table, index,
        or enum value.
      </p>

      <ProseH3>Generate a migration</ProseH3>
      <CodeBlock
        language="bash"
        filename="bash"
        :code="generateCommand"
      />
      <p>
        Writes a new timestamped folder under
        <ProseCode>server/database/migrations/</ProseCode> containing a
        <ProseCode>migration.sql</ProseCode> and a <ProseCode>snapshot.json</ProseCode>. Review the
        generated SQL — Drizzle infers <em>a</em> correct migration, not necessarily the safest one
        for a table with existing rows (e.g. adding a <ProseCode>NOT NULL</ProseCode> column without
        a default).
      </p>

      <ProseH3>Apply it locally</ProseH3>
      <CodeBlock
        language="bash"
        filename="bash"
        :code="migrateCommand"
      />

      <ProseH3>Commit the migration folder</ProseH3>
      <p>
        Migration folders are checked into version control and applied in order — they're the
        durable record of schema history, not just a local dev convenience.
      </p>
    </Steps>

    <ProseH2 id="repositories-not-raw-queries-in-handlers"
      >Repositories, not raw queries in handlers</ProseH2
    >
    <p>
      Route handlers never issue Drizzle queries directly — every table has a corresponding file
      under
      <ProseCode>server/database/repositories/</ProseCode> (<ProseCode>applications.ts</ProseCode>,
      <ProseCode>api-keys.ts</ProseCode>, <ProseCode>usage.ts</ProseCode>,
      <ProseCode>rate-limits.ts</ProseCode>, <ProseCode>request-logs.ts</ProseCode>,
      <ProseCode>circuit-state.ts</ProseCode>, <ProseCode>latency-state.ts</ProseCode>,
      <ProseCode>management-api-keys.ts</ProseCode> on the gateway side) exposing narrow,
      purpose-built functions — e.g. <ProseCode>findActiveApiKeyByHash</ProseCode>,
      <ProseCode>reserveUsageTokens</ProseCode>, <ProseCode>incrementAndCheckRateLimit</ProseCode>.
      This keeps quota/rate-limit races (see
      <ProseA href="/api-reference/rate-limits-and-quotas">Rate Limits &amp; Quotas</ProseA>)
      contained to a single atomic query inside the repository, rather than reimplemented ad hoc
      wherever a handler needs one.
    </p>
  </DocPage>
</template>
