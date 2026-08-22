<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Management API', sectionOrder: 5, title: 'Providers & Models', order: 5 },
  });

  useSeoMeta({
    title: 'Providers & Models',
    description: 'Live provider health and the resolved model registry, as served to clients.',
  });

  const healthEndpoint = 'GET /management/v1/providers';

  const healthResponse = `{
  "data": [
    {
      "provider": "openai",
      "circuitState": "closed",
      "models": [{ "modelId": "gpt-4o", "averageLatencyMs": 812.4 }]
    },
    {
      "provider": "anthropic",
      "circuitState": "half-open",
      "models": [{ "modelId": "claude-sonnet", "averageLatencyMs": null }]
    }
  ]
}`;

  const registryEndpoint = 'GET /management/v1/models';

  const registryResponse = `{
  "data": [
    {
      "id": "gpt-4o",
      "provider": "openai",
      "providerModel": "gpt-4o",
      "fallbacks": ["claude-sonnet", "gemini-pro"],
      "aliases": [],
      "pricing": { "inputPerMillionUsd": 2.5, "outputPerMillionUsd": 10 }
    }
  ]
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="providers-models">Providers &amp; Models</ProseH1>

    <ProseH2 id="provider-health">Provider health</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      :code="healthEndpoint"
    />
    <CodeBlock
      language="json"
      filename="json"
      :code="healthResponse"
    />
    <p>
      <ProseCode>circuitState</ProseCode> is
      <ProseCode>'closed' | 'open' | 'half-open'</ProseCode> — read live from the
      <ProseA href="/architecture/failover-and-circuit-breaking">circuit breaker</ProseA>, synced
      across gateway instances every 5 seconds. <ProseCode>averageLatencyMs</ProseCode> is
      <ProseCode>null</ProseCode> until at least one successful request has been recorded for that
      model. This is the endpoint the
      <ProseA href="/dashboard/features">dashboard's provider health board</ProseA> polls.
    </p>

    <ProseH2 id="model-registry">Model registry</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      :code="registryEndpoint"
    />
    <CodeBlock
      language="json"
      filename="json"
      :code="registryResponse"
    />
    <p>
      This is the fully resolved, static registry from
      <ProseCode>apps/gateway/server/registry/models.config.ts</ProseCode>
      — read-only, and identical regardless of which application queries it (there's no
      per-application filtering here; allowlists are enforced at request time on
      <ProseA href="/api-reference/chat-completions">chat completions</ProseA>, not reflected in
      this listing). Changing the registry requires a code change and redeploy — see
      <ProseA href="/architecture/model-registry-and-routing">Model Registry &amp; Routing</ProseA>.
    </p>
  </DocPage>
</template>
