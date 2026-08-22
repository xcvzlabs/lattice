<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Management API', sectionOrder: 5, title: 'Applications', order: 2 },
  });

  useSeoMeta({
    title: 'Applications',
    description: 'Creating and configuring the applications that call the gateway.',
  });

  const listResponse = `{
  "data": [
    {
      "id": "...",
      "name": "...",
      "createdAt": "...",
      "monthlyTokenQuota": null,
      "rateLimitPerMinute": null,
      "disabledAt": null,
      "allowedModels": null,
      "routingStrategy": null
    }
  ]
}`;

  const updateBody = `{
  "monthlyTokenQuota": 5000000,
  "rateLimitPerMinute": 120,
  "allowedModels": ["gpt-4o", "claude-sonnet"],
  "routingStrategy": "balanced",
  "disabled": true
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="applications">Applications</ProseH1>
    <p>
      An application is the unit of tenancy — one row in <ProseCode>applications</ProseCode>, one
      policy, any number of <ProseA href="/management-api/api-keys">API keys</ProseA> issued against
      it. See <ProseA href="/architecture/data-model#applications">Data Model</ProseA> for the
      underlying schema.
    </p>

    <ProseH2 id="list-applications">List applications</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/applications"
    />
    <CodeBlock
      language="json"
      filename="json"
      :code="listResponse"
    />

    <ProseH2 id="create-an-application">Create an application</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="POST /management/v1/applications"
    />
    <CodeBlock
      language="json"
      filename="json"
      code='{ "name": "Support Bot" }'
    />
    <p>
      <ProseCode>name</ProseCode> must be at least 1 character. Returns the created
      <ProseCode>Application</ProseCode> (200). A new application starts with every policy field
      unset — unlimited quota, unlimited rate, unrestricted models, registry-declared routing order,
      enabled. It has <strong>no API keys yet</strong> — see
      <ProseA href="/management-api/api-keys">API Keys</ProseA> to issue one.
    </p>

    <ProseH2 id="get-an-application">Get an application</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/applications/{id}"
    />
    <p>Returns the <ProseCode>Application</ProseCode>, or <ProseCode>404 not_found</ProseCode>.</p>

    <ProseH2 id="update-an-application">Update an application</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="PATCH /management/v1/applications/{id}"
    />
    <p>
      Every field is optional — send only what you're changing. All fields accept
      <ProseCode>null</ProseCode> to explicitly clear a policy back to "unrestricted."
    </p>
    <CodeBlock
      language="json"
      filename="json"
      :code="updateBody"
    />

    <FieldGroup>
      <Field
        name="name"
        type="string, min 1"
      />
      <Field
        name="monthlyTokenQuota"
        type="integer >= 0 | null"
      >
        <ProseCode>null</ProseCode> = unlimited.
      </Field>
      <Field
        name="rateLimitPerMinute"
        type="integer >= 0 | null"
      >
        <ProseCode>null</ProseCode> = unlimited.
      </Field>
      <Field
        name="allowedModels"
        type="string[] | null"
      >
        Each entry min length 1. <ProseCode>null</ProseCode> = unrestricted. Checked against the raw
        requested <ProseCode>model</ProseCode> string, before alias resolution — see
        <ProseA href="/architecture/model-registry-and-routing">Model Registry & Routing</ProseA>.
      </Field>
      <Field
        name="routingStrategy"
        type="'cost' | 'latency' | 'balanced' | null"
      >
        <ProseCode>null</ProseCode> = use the registry's declared
        <ProseCode>[primary, ...fallbacks]</ProseCode>
        order.
      </Field>
      <Field
        name="disabled"
        type="boolean"
      >
        <ProseCode>true</ProseCode> sets <ProseCode>disabledAt</ProseCode> to now;
        <ProseCode>false</ProseCode> clears it. Disabling an application immediately invalidates
        every one of its API keys, without revoking them individually — see
        <ProseA href="/architecture/security#summary-of-the-two-trust-tiers">Security</ProseA>.
      </Field>
    </FieldGroup>

    <p>
      Returns the updated <ProseCode>Application</ProseCode> (re-fetched after the write), or
      <ProseCode>404 not_found</ProseCode> if the id doesn't exist, or
      <ProseCode>400 invalid_request</ProseCode> if the body fails validation.
    </p>

    <ProseH2 id="per-application-usage">Per-application usage</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/applications/{id}/usage?days=30"
    />
    <p>
      See
      <ProseA href="/management-api/usage-and-requests#usage-summary">Usage & Requests</ProseA> —
      identical shape to the gateway-wide usage endpoint, scoped to one application.
    </p>

    <ProseH2 id="typical-provisioning-flow">Typical provisioning flow</ProseH2>
    <Steps>
      <ProseH4>Create the application</ProseH4>
      <p>
        <ProseCode>POST /management/v1/applications</ProseCode> with just a
        <ProseCode>name</ProseCode>.
      </p>

      <ProseH4>Set its policy</ProseH4>
      <p>
        <ProseCode>PATCH /management/v1/applications/{id}</ProseCode> with quota, rate limit,
        allowlist, and/or routing strategy — or leave it unrestricted for an internal/trusted
        application.
      </p>

      <ProseH4>Issue an API key</ProseH4>
      <p>
        <ProseCode>POST /management/v1/applications/{id}/api-keys</ProseCode> — see
        <ProseA href="/management-api/api-keys">API Keys</ProseA>. The raw key is returned exactly
        once; hand it to whoever owns that application's backend.
      </p>
    </Steps>
  </DocPage>
</template>
