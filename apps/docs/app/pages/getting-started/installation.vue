<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Getting Started', sectionOrder: 1, title: 'Installation', order: 2 },
  });

  useSeoMeta({
    title: 'Installation',
    description: 'Prerequisites, cloning, and installing dependencies for the Lattice monorepo.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="installation">Installation</ProseH1>

    <ProseH2 id="prerequisites">Prerequisites</ProseH2>
    <FieldGroup>
      <Field
        name="Bun"
        type="1.4.0+"
      >
        Lattice's package manager and the gateway's runtime (<ProseCode>preset: 'bun'</ProseCode> in
        <ProseCode>nitro.config.ts</ProseCode>). Installed lockfile is frozen
        (<ProseCode>bun.lock</ProseCode>).
      </Field>
      <Field
        name="Node"
        type="^26.0.0"
      >
        Declared in <ProseCode>engines</ProseCode>. Some tooling (TypeScript, drizzle-kit) runs
        under Node semantics even though Bun executes most scripts.
      </Field>
      <Field
        name="Postgres"
        type="any recent version"
      >
        Both the gateway and the dashboard need a database. They can be the same Postgres server
        (different databases) or entirely separate servers.
      </Field>
    </FieldGroup>

    <p>Install Bun if you don't already have it:</p>
    <CodeBlock
      language="bash"
      filename="bash"
      code="curl -fsSL https://bun.sh/install | bash"
    />

    <ProseH2 id="clone-and-install">Clone and install</ProseH2>
    <CodeBlock
      language="bash"
      filename="bash"
      code="git clone <repository-url> lattice
cd lattice
bun install"
    />
    <p>
      <ProseCode>bun install</ProseCode> resolves the whole workspace in one pass:
      <ProseCode>apps/gateway</ProseCode>, <ProseCode>apps/dashboard</ProseCode>,
      <ProseCode>apps/docs</ProseCode>, <ProseCode>packages/api-contract</ProseCode>, and
      <ProseCode>packages/env</ProseCode>. Dependency versions for shared libraries (Nuxt, Vue,
      Drizzle, Nitro, Valibot, <ProseCode>@types/bun</ProseCode>, TypeScript) are pinned once in the
      root <ProseCode>package.json</ProseCode> under <ProseCode>workspaces.catalog</ProseCode>/
      <ProseCode>catalogs</ProseCode>, so every workspace package references
      <ProseCode>catalog:</ProseCode> or <ProseCode>catalog:client</ProseCode>/<ProseCode
        >catalog:server</ProseCode
      >
      instead of a hardcoded version.
    </p>
    <p>
      <ProseCode>bun install</ProseCode> also runs the repo's <ProseCode>prepare</ProseCode> script
      (<ProseCode>husky</ProseCode>), which installs the Git hooks used for
      <ProseA href="/development/coding-standards">pre-commit and pre-push checks</ProseA>.
    </p>

    <ProseH2 id="environment-files">Environment files</ProseH2>
    <p>
      Each app that talks to Postgres needs its own <ProseCode>.env</ProseCode>. Copy the examples
      and fill them in — the next page walks through exactly which values to generate:
    </p>
    <CodeBlock
      language="bash"
      filename="bash"
      code="cp apps/gateway/.env.example apps/gateway/.env
cp apps/dashboard/.env.example apps/dashboard/.env"
    />
    <Warning>
      Never commit a real <ProseCode>.env</ProseCode> file. <ProseCode>.gitignore</ProseCode> in
      both apps excludes <ProseCode>.env*</ProseCode> except <ProseCode>.env.example</ProseCode>.
    </Warning>

    <ProseH2 id="workspace-layout-at-a-glance">Workspace layout at a glance</ProseH2>
    <CodeBlock
      language="text"
      filename="text"
      code="lattice/
├── apps/
│   ├── gateway/     Nitro + h3 — the AI gateway
│   ├── dashboard/   Nuxt 4 + Nuxt UI — admin dashboard
│   └── docs/         this documentation site
├── packages/
│   ├── api-contract/ shared Valibot schemas + inferred types
│   └── env/          typed, validated environment parsing
└── tests/            mirrors apps/ and packages/ by path"
    />
    <p>
      See <ProseA href="/getting-started/project-structure">Project Structure</ProseA> for the full
      breakdown, or continue to <ProseA href="/getting-started/quick-start">Quick Start</ProseA> to
      get the gateway and dashboard running.
    </p>
  </DocPage>
</template>
