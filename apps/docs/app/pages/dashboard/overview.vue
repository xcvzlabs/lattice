<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Dashboard', sectionOrder: 6, title: 'Overview', order: 1 },
  });

  useSeoMeta({
    title: 'Overview',
    description: "What the dashboard is, and how it relates to the gateway's management API.",
  });

  const diagram = `flowchart LR
    admin["Admin (browser)"]
    dash["Dashboard server (Nuxt)"]
    gw["Gateway /management/v1"]
    dashdb[("Dashboard Postgres\\nusers/sessions")]

    admin -- "session cookie" --> dash
    dash -- "gatewayFetch\\nBearer management key" --> gw
    dash <-.-> dashdb`;
</script>

<template>
  <DocPage>
    <ProseH1 id="dashboard">Dashboard</ProseH1>
    <p>
      The dashboard (<ProseCode>apps/dashboard</ProseCode>, Nuxt 4 + Nuxt UI) is a thin admin client
      over the gateway's own <ProseA href="/management-api/overview">management API</ProseA>: an
      overview of request volume, token spend, and provider health; application and API key
      management; a provider health board; a request log browser. It has no privileged access the
      management API doesn't already grant — every page's data comes from the same endpoints
      documented in that section.
    </p>

    <MermaidDiagram :code="diagram" />

    <ProseH2 id="three-distinct-credentials">Three distinct credentials</ProseH2>
    <p>It's easy to conflate these — they're deliberately separate:</p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Credential</ProseTh>
          <ProseTh>Held by</ProseTh>
          <ProseTh>Authenticates against</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Dashboard user session</ProseTd>
          <ProseTd>An admin's browser (cookie)</ProseTd>
          <ProseTd>The dashboard's own server routes</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Management API key</ProseTd>
          <ProseTd>The dashboard's server only</ProseTd>
          <ProseTd>The gateway's <ProseCode>/management/v1</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Application API key</ProseTd>
          <ProseTd>A company application</ProseTd>
          <ProseTd>The gateway's <ProseCode>/v1</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      An admin signing into the dashboard never sees, and cannot retrieve, the management API key —
      it's read from the dashboard's own server-side environment and attached to every gateway call
      by
      <ProseCode>gatewayFetch</ProseCode>. See
      <ProseA href="/dashboard/setup-and-auth">Setup &amp; Auth</ProseA>.
    </p>

    <ProseH2 id="next">Next</ProseH2>
    <ProseUl>
      <ProseLi>
        <ProseA href="/dashboard/setup-and-auth">Setup &amp; Auth</ProseA> — environment, session
        model, and the "flat single-tenant trust" security property.
      </ProseLi>
      <ProseLi><ProseA href="/dashboard/features">Features</ProseA> — a page-by-page tour.</ProseLi>
    </ProseUl>
  </DocPage>
</template>
