<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Deployment', sectionOrder: 8, title: 'Configuration Reference', order: 1 },
  });

  useSeoMeta({
    title: 'Configuration Reference',
    description: 'Every environment variable, across both apps.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="configuration-reference">Configuration Reference</ProseH1>
    <p>
      Both apps validate their environment eagerly at boot via
      <ProseA href="/development/shared-packages#lattice-env">@lattice/env</ProseA> — a missing or
      malformed variable crashes startup with a clear error rather than failing later at request
      time.
    </p>

    <ProseH2 id="gateway-appsgatewayenv"
      >Gateway (<ProseCode>apps/gateway/.env</ProseCode>)</ProseH2
    >
    <FieldGroup>
      <Field
        name="PORT"
        type="number, default 3001"
        >Read natively by Nitro's <ProseCode>bun</ProseCode> preset — not part of the
        <ProseCode>@lattice/env</ProseCode> schema.</Field
      >
      <Field
        name="API_KEY_PEPPER"
        type="string, required, min 32 chars"
      >
        Generate with <ProseCode>bun run generate-pepper</ProseCode>. Losing it invalidates every
        issued key at once — see
        <ProseA href="/architecture/security#storage-hash-not-the-key">Security</ProseA>.
      </Field>
      <Field
        name="OPENAI_API_KEY"
        type="string, optional"
        >Required only if the registry references <ProseCode>provider: 'openai'</ProseCode>.</Field
      >
      <Field
        name="ANTHROPIC_API_KEY"
        type="string, optional"
        >Required only if the registry references
        <ProseCode>provider: 'anthropic'</ProseCode>.</Field
      >
      <Field
        name="GOOGLE_API_KEY"
        type="string, optional"
        >Required only if the registry references <ProseCode>provider: 'google'</ProseCode>.</Field
      >
      <Field
        name="OLLAMA_BASE_URL / OLLAMA_API_KEY"
        type="string, optional"
      >
        A provider is "configured" once <ProseCode>OLLAMA_BASE_URL</ProseCode> is set; the API key
        is optional even then. See <ProseA href="/providers/self-hosted">Ollama &amp; vLLM</ProseA>.
      </Field>
      <Field
        name="VLLM_BASE_URL / VLLM_API_KEY"
        type="string, optional"
        >Same pattern as Ollama.</Field
      >
      <Field
        name="DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_SSL / DB_DATABASE"
        type="strings, required"
      >
        The gateway's Postgres connection. <ProseCode>DB_SSL</ProseCode> accepts only the literal
        strings <ProseCode>"true"</ProseCode>/<ProseCode>"false"</ProseCode> (see
        <ProseA href="/development/shared-packages#lattice-env">booleanEnvSchema</ProseA>).
      </Field>
    </FieldGroup>

    <ProseH2 id="dashboard-appsdashboardenv"
      >Dashboard (<ProseCode>apps/dashboard/.env</ProseCode>)</ProseH2
    >
    <FieldGroup>
      <Field
        name="NUXT_BETTER_AUTH_SECRET"
        type="string, required"
        >Generate with <ProseCode>openssl rand -base64 32</ProseCode>. Signs/encrypts better-auth
        sessions.</Field
      >
      <Field
        name="LATTICE_GATEWAY_URL"
        type="string (URL), required"
        >The gateway's base URL. <ProseCode>/management/v1</ProseCode> is appended automatically by
        <ProseCode>gatewayFetch</ProseCode>.</Field
      >
      <Field
        name="LATTICE_MANAGEMENT_API_KEY"
        type="string, required"
      >
        Minted with <ProseCode>bun run gateway seed-management-key &lt;name&gt;</ProseCode>.
        Server-side only — never sent to the browser. See
        <ProseA href="/dashboard/setup-and-auth">Dashboard Setup &amp; Auth</ProseA>.
      </Field>
      <Field
        name="DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_SSL / DB_DATABASE"
        type="strings, required"
      >
        The dashboard's <strong>own</strong> Postgres connection — better-auth tables only,
        independent of the gateway's database.
      </Field>
    </FieldGroup>

    <ProseH2 id="what-changing-the-model-registry-requires"
      >What changing the model registry requires</ProseH2
    >
    <p>
      The registry (<ProseCode>apps/gateway/server/registry/models.config.ts</ProseCode>) is code,
      not environment configuration — adding, removing, or repricing a model requires a code change
      and redeploy of the gateway, not an env var change. See
      <ProseA href="/architecture/model-registry-and-routing">Model Registry &amp; Routing</ProseA>.
    </p>
  </DocPage>
</template>
