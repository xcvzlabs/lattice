<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Getting Started', sectionOrder: 1, title: 'Introduction', order: 1 },
  });

  useSeoMeta({
    title: 'Introduction',
    description: "What Lattice is, who it's for, and how the pieces fit together.",
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
    <ProseH1 id="introduction">Introduction</ProseH1>
    <p>
      Lattice is centralized AI infrastructure: an internal gateway that sits between company
      applications and the model providers (OpenAI, Anthropic, Google, Ollama, vLLM) they'd
      otherwise integrate with one by one. Instead of every application shipping its own provider
      SDKs, API keys, retry logic, and cost tracking, applications talk to Lattice once, and Lattice
      talks to the providers.
    </p>

    <ProseH2 id="the-problem-it-solves">The problem it solves</ProseH2>
    <p>
      Without a gateway, every application that wants to call an LLM ends up re-solving the same
      problems: where do provider credentials live, what happens when a provider has an outage, how
      do you know which model an "smart" alias should resolve to this month, and who is spending how
      many tokens. Lattice centralizes all of that in one place that's operated once and consumed
      many times.
    </p>
    <Note>
      Provider credentials live <strong>only</strong> in the gateway's environment. Applications
      never see an OpenAI, Anthropic, or Google API key — they only ever hold a Lattice-issued key.
    </Note>

    <ProseH2 id="two-applications-one-repository">Two applications, one repository</ProseH2>
    <p>Lattice is a two-app monorepo:</p>
    <ProseUl>
      <ProseLi>
        <strong><ProseCode>apps/gateway</ProseCode></strong>
        — a <ProseA href="https://nitro.build">Nitro</ProseA> +
        <ProseA href="https://h3.dev">h3</ProseA> server. This is the thing applications and
        providers actually talk to: the OpenAI-compatible <ProseCode>/v1</ProseCode> API, the
        <ProseCode>/management/v1</ProseCode> admin API, authentication, quota/rate-limit
        enforcement, routing, and request logging.
      </ProseLi>
      <ProseLi>
        <strong><ProseCode>apps/dashboard</ProseCode></strong>
        — a <ProseA href="https://nuxt.com">Nuxt 4</ProseA> + Nuxt UI admin surface, built entirely
        on top of the gateway's own management API. It has no privileged access the management API
        doesn't already grant; it just makes that API usable by a human.
      </ProseLi>
    </ProseUl>

    <MermaidDiagram :code="diagram" />

    <ProseH2 id="who-this-documentation-is-for">Who this documentation is for</ProseH2>
    <Tabs>
      <TabsItem label="Application developers">
        <p>
          You're calling <ProseCode>/v1/chat/completions</ProseCode> from a company application.
          Start with <ProseA href="/api-reference/authentication">Authentication</ProseA> and
          <ProseA href="/api-reference/chat-completions">Chat Completions</ProseA>.
        </p>
      </TabsItem>
      <TabsItem label="Platform admins">
        <p>
          You provision applications, issue API keys, and watch provider health — either through the
          <ProseA href="/dashboard/overview">Dashboard</ProseA> or the
          <ProseA href="/management-api/overview">Management API</ProseA> directly.
        </p>
      </TabsItem>
      <TabsItem label="Contributors">
        <p>
          You're changing gateway or dashboard code. Read
          <ProseA href="/architecture/overview">Architecture</ProseA>,
          <ProseA href="/development/coding-standards">Coding Standards</ProseA>, and
          <ProseA href="/development/local-development">Local Development</ProseA>.
        </p>
      </TabsItem>
    </Tabs>

    <ProseH2 id="next-steps">Next steps</ProseH2>
    <p>
      Continue to <ProseA href="/getting-started/installation">Installation</ProseA> to set up the
      repository, or jump straight to
      <ProseA href="/getting-started/quick-start">Quick Start</ProseA> if you already have Bun and
      Postgres ready.
    </p>
  </DocPage>
</template>
