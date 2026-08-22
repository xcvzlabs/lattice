<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Dashboard', sectionOrder: 6, title: 'Features', order: 3 },
  });

  useSeoMeta({
    title: 'Features',
    description: 'A page-by-page tour of the dashboard.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="features">Features</ProseH1>

    <ProseH2 id="overview">Overview (<ProseCode>/</ProseCode>)</ProseH2>
    <p>
      30-day totals — requests, tokens, estimated spend — computed from the
      <ProseA href="/management-api/usage-and-requests#usage-summary">usage summary endpoint</ProseA
      >, plus provider health badges (green/<ProseCode>closed</ProseCode>,
      amber/<ProseCode>half-open</ProseCode>, red/<ProseCode>open</ProseCode>) from the
      <ProseA href="/management-api/providers-and-models#provider-health">providers endpoint</ProseA
      >.
    </p>

    <ProseH2 id="applications">Applications (<ProseCode>/applications</ProseCode>)</ProseH2>
    <p>
      A table of every application: name, status (derived from <ProseCode>disabledAt</ProseCode>),
      monthly quota, routing strategy. A "New application" modal creates one with just a name — see
      <ProseA href="/management-api/applications">Applications</ProseA> for what happens next.
    </p>

    <ProseH3 id="application-detail"
      >Application detail (<ProseCode>/applications/{id}</ProseCode>)</ProseH3
    >
    <p>Three tabs:</p>
    <ProseUl>
      <ProseLi>
        <strong>Settings</strong> — monthly quota, rate limit, an allowed-models multi-select
        (populated from the
        <ProseA href="/management-api/providers-and-models#model-registry">live registry</ProseA>),
        routing strategy, and a disable switch. Saves via
        <ProseCode>PATCH /management/v1/applications/{id}</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>API keys</strong> — create issues a new key and reveals the raw secret exactly once
        in an alert banner (it cannot be shown again — see
        <ProseA href="/management-api/api-keys#create-issue-a-key">API Keys</ProseA>); the table
        lists existing keys by prefix with a revoke action per row.
      </ProseLi>
      <ProseLi><strong>Usage</strong> — a 30-day usage table scoped to this application.</ProseLi>
    </ProseUl>

    <ProseH2 id="providers">Providers (<ProseCode>/providers</ProseCode>)</ProseH2>
    <p>
      One card per provider: circuit state badge and a per-model average latency list. Read-only —
      this is
      <ProseA href="/management-api/providers-and-models#provider-health">Provider Health</ProseA>
      rendered, not a control surface (there's no "manually open/close a circuit" action).
    </p>

    <ProseH2 id="requests">Requests (<ProseCode>/requests</ProseCode>)</ProseH2>
    <p>
      A table of recent request log entries across every application, filterable by status (all /
      success / error). Status cells show either the HTTP status or the
      <ProseCode>error_code</ProseCode>. Backed by
      <ProseA href="/management-api/usage-and-requests#request-log">the request log endpoint</ProseA
      >.
    </p>

    <ProseH2 id="how-data-loading-works">How data loading works</ProseH2>
    <p>
      Every page reads through
      <ProseA href="https://pinia-colada.esm.dev">Pinia Colada</ProseA> queries
      (<ProseCode>app/queries/*.ts</ProseCode>) keyed hierarchically (e.g.
      <ProseCode>['applications', id, 'usage', { days }]</ProseCode>), which call the dashboard's
      own <ProseCode>server/api/*</ProseCode> routes — thin proxies that attach the management key
      server-side and forward to the gateway (<ProseCode>gatewayFetch</ProseCode>). Writes go
      through matching mutations (<ProseCode>app/mutations/*.ts</ProseCode>) that invalidate the
      affected query keys on completion, so, for example, revoking a key immediately refreshes that
      application's key list without a manual page reload.
    </p>
  </DocPage>
</template>
