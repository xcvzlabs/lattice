<script setup lang="ts">
  definePageMeta({
    docs: { section: 'API Reference', sectionOrder: 4, title: 'Errors', order: 4 },
  });

  useSeoMeta({
    title: 'Errors',
    description: 'The error envelope shape and every stable error code the gateway can return.',
  });

  const envelope = `{
  "error": {
    "message": "Invalid API key",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}`;

  const handlingExample = `const response = await fetch('https://gateway.internal/v1/chat/completions', {/* ... */})

if (!response.ok) {
  const { error } = await response.json()
  switch (error.code) {
    case 'rate_limit_exceeded':
    case 'quota_exceeded':
      // back off / surface to the caller — not retryable by retrying immediately
      break
    case 'invalid_api_key':
    case 'missing_api_key':
      // configuration problem, not transient — don't retry
      break
    default:
      if (response.status >= 500) {
        // transient — safe to retry with backoff
      }
  }
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="errors">Errors</ProseH1>
    <p>
      Every error response — from both <ProseCode>/v1</ProseCode> and
      <ProseCode>/management/v1</ProseCode> — uses the same envelope, deliberately shaped like
      OpenAI's error format for client compatibility:
    </p>
    <CodeBlock
      language="json"
      filename="json"
      :code="envelope"
    />

    <FieldGroup>
      <Field
        name="message"
        type="string"
      >
        Human-readable. For unhandled/unexpected exceptions this is always replaced with the generic
        <ProseCode>"Internal server error"</ProseCode> — internal error text and stack traces never
        reach the client. See
        <ProseA href="/architecture/security#error-responses-never-leak-internals">Security</ProseA
        >.
      </Field>
      <Field
        name="type"
        type="string"
      >
        A coarse OpenAI-style category, derived purely from the HTTP status — not a stable
        identifier on its own, prefer <ProseCode>code</ProseCode> for programmatic handling.
      </Field>
      <Field
        name="code"
        type="string | null"
      >
        A stable <ProseCode>LatticeErrorCode</ProseCode>. <ProseCode>null</ProseCode> only for
        errors the gateway didn't classify (unexpected exceptions).
      </Field>
    </FieldGroup>

    <ProseH2 id="type-derivation"><ProseCode>type</ProseCode> derivation</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>HTTP status</ProseTh>
          <ProseTh><ProseCode>type</ProseCode></ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr
          ><ProseTd><ProseCode>401</ProseCode></ProseTd
          ><ProseTd><ProseCode>authentication_error</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>403</ProseCode></ProseTd
          ><ProseTd><ProseCode>permission_error</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>404</ProseCode></ProseTd
          ><ProseTd><ProseCode>not_found_error</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>429</ProseCode></ProseTd
          ><ProseTd><ProseCode>rate_limit_error</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>&gt;= 500</ProseCode></ProseTd
          ><ProseTd><ProseCode>upstream_error</ProseCode></ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd>anything else</ProseTd
          ><ProseTd><ProseCode>invalid_request_error</ProseCode></ProseTd></ProseTr
        >
      </tbody>
    </ProseTable>

    <ProseH2 id="every-error-code">Every error code</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh><ProseCode>code</ProseCode></ProseTh>
          <ProseTh>Status</ProseTh>
          <ProseTh>Meaning</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr
          ><ProseTd><ProseCode>missing_api_key</ProseCode></ProseTd
          ><ProseTd>401</ProseTd
          ><ProseTd
            >No <ProseCode>Authorization</ProseCode> header, or it isn't
            <ProseCode>Bearer &lt;token&gt;</ProseCode>.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>invalid_api_key</ProseCode></ProseTd
          ><ProseTd>401</ProseTd
          ><ProseTd
            >The key doesn't match any active key, or (for application keys) the owning application
            is disabled.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>revoked_api_key</ProseCode></ProseTd
          ><ProseTd>401</ProseTd
          ><ProseTd>Reserved for explicit revocation-specific messaging.</ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>model_not_found</ProseCode></ProseTd
          ><ProseTd>404</ProseTd
          ><ProseTd
            ><ProseCode>model</ProseCode> matches no registry <ProseCode>id</ProseCode> or
            <ProseCode>alias</ProseCode>.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>model_not_permitted</ProseCode></ProseTd
          ><ProseTd>403</ProseTd
          ><ProseTd
            >The application's <ProseCode>allowedModels</ProseCode> list doesn't include the
            requested model.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>unsupported_parameter</ProseCode></ProseTd
          ><ProseTd>400</ProseTd
          ><ProseTd>Reserved for parameter-specific rejection messaging.</ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>invalid_request</ProseCode></ProseTd
          ><ProseTd>400</ProseTd
          ><ProseTd
            >Body failed JSON parsing or schema validation (strict — unknown fields included), or a
            query parameter (e.g. <ProseCode>days</ProseCode>, <ProseCode>limit</ProseCode>,
            <ProseCode>offset</ProseCode>, <ProseCode>status</ProseCode>) was out of range.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>quota_exceeded</ProseCode></ProseTd
          ><ProseTd>429</ProseTd
          ><ProseTd
            >The application's <ProseCode>monthlyTokenQuota</ProseCode> is exhausted.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>rate_limit_exceeded</ProseCode></ProseTd
          ><ProseTd>429</ProseTd
          ><ProseTd
            >The application's <ProseCode>rateLimitPerMinute</ProseCode> is exceeded for the current
            60-second window.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>provider_error</ProseCode></ProseTd
          ><ProseTd>502</ProseTd
          ><ProseTd
            >A single-candidate dispatch failed, or an adapter was invoked with no resolvable
            credentials (should be unreachable given registry validation).</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>all_providers_failed</ProseCode></ProseTd
          ><ProseTd>502</ProseTd
          ><ProseTd>Every candidate in the resolved provider chain failed.</ProseTd></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>model_registry_invalid</ProseCode></ProseTd
          ><ProseTd>—</ProseTd
          ><ProseTd
            >Boot-time only — the process refuses to start with an invalid
            <ProseCode>models.config.ts</ProseCode>. Never returned to a client.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>invalid_env</ProseCode></ProseTd
          ><ProseTd>—</ProseTd
          ><ProseTd
            >Boot-time only — the process refuses to start with invalid/missing environment
            variables. Never returned to a client.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>not_found</ProseCode></ProseTd
          ><ProseTd>404</ProseTd
          ><ProseTd
            >A management API resource (application, API key) doesn't exist.</ProseTd
          ></ProseTr
        >
        <ProseTr
          ><ProseTd><ProseCode>internal_error</ProseCode></ProseTd
          ><ProseTd>500</ProseTd
          ><ProseTd>Reserved for explicitly classified internal failures.</ProseTd></ProseTr
        >
      </tbody>
    </ProseTable>

    <Note>
      Any exception that isn't explicitly thrown as one of the codes above still gets a response —
      status
      <ProseCode>500</ProseCode>, <ProseCode>type: "upstream_error"</ProseCode> is not guaranteed,
      <ProseCode>code: null</ProseCode>, <ProseCode>message: "Internal server error"</ProseCode>.
      Treat <ProseCode>code: null</ProseCode> as "unclassified failure, safe to retry with backoff,"
      the same way you'd treat an unexpected 500 from any other API.
    </Note>

    <ProseH2 id="handling-errors-as-a-client">Handling errors as a client</ProseH2>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="handlingExample"
    />
  </DocPage>
</template>
