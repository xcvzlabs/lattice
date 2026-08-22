<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Architecture', sectionOrder: 2, title: 'Overview', order: 1 },
  });

  useSeoMeta({
    title: 'Overview',
    description: 'The two-app monorepo, request flow, and how trust boundaries are drawn.',
  });

  const diagram = `flowchart TB
    subgraph clients["Company applications"]
        direction LR
        appA["App A"]
        appB["App B"]
        appC["App C"]
    end

    subgraph gateway["Lattice Gateway (Nitro + h3)"]
        direction TB
        v1["/v1\\nOpenAI-compatible API"]
        mgmt["/management/v1\\nAdmin API"]
        authmw["Auth · quota · rate limit"]
        router["Router\\nregistry + strategy + circuit breaker"]

        v1 --> authmw --> router
    end

    subgraph providers["Providers"]
        direction LR
        openai["OpenAI"]
        anthropic["Anthropic"]
        google["Google"]
        ollama["Ollama\\n(self-hosted)"]
        vllm["vLLM\\n(self-hosted)"]
    end

    gatewaydb[("Postgres\\napplications · keys · usage · logs")]
    dashboard["Dashboard (Nuxt)"]
    dashdb[("Postgres\\ndashboard sessions")]

    appA & appB & appC -- "Bearer lattice_sk_…" --> v1
    router --> openai & anthropic & google & ollama & vllm
    authmw <-.-> gatewaydb
    router -.-> gatewaydb
    dashboard -- "Bearer management key" --> mgmt
    mgmt <-.-> gatewaydb
    dashboard <-.-> dashdb`;
</script>

<template>
  <DocPage>
    <ProseH1 id="architecture-overview">Architecture Overview</ProseH1>
    <p>
      Lattice is a two-app monorepo: the <strong>gateway</strong> is the thing applications and
      providers actually talk to, and the <strong>dashboard</strong> is an admin surface built
      entirely on top of the gateway's own management API.
    </p>

    <MermaidDiagram :code="diagram" />

    <ProseH2 id="two-trust-boundaries-two-apis">Two trust boundaries, two APIs</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh><ProseCode>/v1/**</ProseCode></ProseTh>
          <ProseTh><ProseCode>/management/v1/**</ProseCode></ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Who calls it</ProseTd>
          <ProseTd>Company applications</ProseTd>
          <ProseTd>The dashboard (or any admin script)</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Auth</ProseTd>
          <ProseTd>Per-application <ProseCode>lattice_sk_…</ProseCode> key</ProseTd>
          <ProseTd>A separate management API key</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Scope</ProseTd>
          <ProseTd
            >Chat completions, model listing — scoped to the calling application's policy</ProseTd
          >
          <ProseTd>Provisioning and observability across every application</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Middleware</ProseTd>
          <ProseTd
            ><ProseCode>02.auth.ts</ProseCode> → <ProseCode>03.rate-limit.ts</ProseCode></ProseTd
          >
          <ProseTd><ProseCode>04.management-auth.ts</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      Provider credentials (<ProseCode>OPENAI_API_KEY</ProseCode>, etc.) live only in the gateway's
      environment. Neither an application nor the dashboard can ever see them — the dashboard
      reaches the gateway the same way an application would, over the network, with a bearer key,
      just against <ProseCode>/management/v1</ProseCode> instead of <ProseCode>/v1</ProseCode>.
    </p>

    <ProseH2 id="runtime-stack">Runtime stack</ProseH2>
    <ProseUl>
      <ProseLi>
        <strong>Gateway</strong>: <ProseA href="https://nitro.build">Nitro v3</ProseA> +
        <ProseA href="https://h3.dev">h3</ProseA>, running on Bun's
        <ProseCode>bun</ProseCode> preset. Postgres via
        <ProseA href="https://orm.drizzle.team">Drizzle ORM</ProseA>
        (<ProseCode>drizzle-orm/bun-sql</ProseCode>).
      </ProseLi>
      <ProseLi>
        <strong>Dashboard</strong>: <ProseA href="https://nuxt.com">Nuxt 4</ProseA> +
        <ProseA href="https://ui.nuxt.com">Nuxt UI</ProseA>, session auth via
        <ProseA href="https://www.better-auth.com">better-auth</ProseA>, data fetching/caching via
        <ProseA href="https://pinia-colada.esm.dev">Pinia Colada</ProseA>.
      </ProseLi>
      <ProseLi>
        <strong>Shared</strong>: <ProseA href="https://valibot.dev">Valibot</ProseA> for every
        schema (requests, responses, environment variables) in both apps and in
        <ProseCode>packages/api-contract</ProseCode>.
      </ProseLi>
    </ProseUl>

    <ProseH2 id="why-two-separate-databases">Why two separate databases</ProseH2>
    <p>
      The gateway's Postgres database owns applications, API keys, usage counters, rate-limit
      counters, request logs, and provider health state — the operational data of the gateway
      itself. The dashboard's Postgres database owns exactly one thing: better-auth's
      session/user/account tables for the humans who sign into the dashboard. They can be the same
      physical Postgres server (different logical databases) or entirely separate servers; nothing
      in either app assumes otherwise. This keeps "who can sign into the admin UI" architecturally
      separate from "what the gateway is doing," so rotating or restoring one never touches the
      other.
    </p>

    <ProseH2 id="where-to-go-next">Where to go next</ProseH2>
    <ProseUl>
      <ProseLi>
        <ProseA href="/architecture/request-lifecycle">Request Lifecycle</ProseA> — what happens
        between a client's request and its response.
      </ProseLi>
      <ProseLi>
        <ProseA href="/architecture/model-registry-and-routing"
          >Model Registry &amp; Routing</ProseA
        >
        — how a model name resolves to a provider call.
      </ProseLi>
      <ProseLi>
        <ProseA href="/architecture/failover-and-circuit-breaking"
          >Failover &amp; Circuit Breaking</ProseA
        >
        — what happens when a provider is down.
      </ProseLi>
      <ProseLi
        ><ProseA href="/architecture/data-model">Data Model</ProseA> — every table, every
        column.</ProseLi
      >
      <ProseLi>
        <ProseA href="/architecture/security">Security</ProseA> — key hashing, the pepper, and the
        two trust tiers.
      </ProseLi>
    </ProseUl>
  </DocPage>
</template>
