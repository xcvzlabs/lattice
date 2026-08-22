<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Management API', sectionOrder: 5, title: 'Overview', order: 1 },
  });

  useSeoMeta({
    title: 'Overview',
    description: 'Authentication and resource model for /management/v1.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="management-api">Management API</ProseH1>
    <p>
      Everything under <ProseCode>/management/v1/**</ProseCode> is authenticated with a
      <strong>management API key</strong>, distinct from the per-application keys
      <ProseCode>/v1/**</ProseCode> accepts, and not scoped to any one application — it administers
      the gateway itself.
    </p>
    <CodeBlock
      language="http"
      filename="http"
      code="Authorization: Bearer <management key>"
    />
    <p>Minted with:</p>
    <CodeBlock
      language="bash"
      filename="bash"
      code="cd apps/gateway
bun run seed-management-key <name>"
    />
    <p>
      See
      <ProseA href="/api-reference/authentication#management-api-authentication"
        >Authentication</ProseA
      >
      and <ProseA href="/architecture/security">Security</ProseA> for how that key is generated,
      hashed, and verified — the mechanics are identical to application keys, just against a
      separate table with no per-key identity beyond "valid or not."
    </p>

    <ProseH2 id="resources">Resources</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Resource</ProseTh>
          <ProseTh>Endpoints</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseA href="/management-api/applications">Applications</ProseA></ProseTd>
          <ProseTd>list, create, get, update, per-application usage</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseA href="/management-api/api-keys">API keys</ProseA></ProseTd>
          <ProseTd>list, create, revoke — scoped to an application</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd
            ><ProseA href="/management-api/usage-and-requests">Usage & requests</ProseA></ProseTd
          >
          <ProseTd>aggregate usage summary, paginated request log</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd
            ><ProseA href="/management-api/providers-and-models"
              >Providers & models</ProseA
            ></ProseTd
          >
          <ProseTd>live circuit state per provider, the resolved model registry</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH2 id="who-calls-this-api">Who calls this API</ProseH2>
    <p>
      In practice, exactly one client: the <ProseA href="/dashboard/overview">dashboard</ProseA>'s
      server, via
      <ProseCode>gatewayFetch</ProseCode>
      (<ProseCode>apps/dashboard/server/utils/gateway-client.ts</ProseCode>), which holds the
      management key server-side and never lets it reach the browser. Nothing stops a script or CI
      job from calling <ProseCode>/management/v1</ProseCode> directly with its own management key —
      it's a plain bearer-authenticated JSON API, not dashboard-specific.
    </p>

    <ProseH2 id="response-envelope">Response envelope</ProseH2>
    <p>
      List endpoints return <ProseCode>{ "data": [...] }</ProseCode>, and paginated ones
      (<ProseCode>/requests</ProseCode>) additionally echo back
      <ProseCode>limit</ProseCode>/<ProseCode>offset</ProseCode>. Single-resource endpoints return
      the resource object directly, not wrapped. Errors use the same envelope as
      <ProseCode>/v1</ProseCode> — see <ProseA href="/api-reference/errors">Errors</ProseA>.
    </p>

    <ProseH2 id="base-url">Base URL</ProseH2>
    <p>
      The gateway's <ProseCode>PORT</ProseCode> defaults to <ProseCode>3001</ProseCode> in
      development. In the dashboard's own configuration this is
      <ProseCode>LATTICE_GATEWAY_URL</ProseCode> — see
      <ProseA href="/deployment/configuration-reference">Configuration Reference</ProseA>.
    </p>
  </DocPage>
</template>
