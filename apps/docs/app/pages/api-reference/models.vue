<script setup lang="ts">
  definePageMeta({
    docs: { section: 'API Reference', sectionOrder: 4, title: 'Models', order: 3 },
  });

  useSeoMeta({
    title: 'Models',
    description: 'Reference for GET /v1/models.',
  });

  const endpoint = 'GET /v1/models';

  const response = `{
  "object": "list",
  "data": [
    { "id": "gpt-4o", "object": "model", "created": 1755878400, "owned_by": "openai" },
    { "id": "claude-sonnet", "object": "model", "created": 1755878400, "owned_by": "anthropic" },
    { "id": "gemini-pro", "object": "model", "created": 1755878400, "owned_by": "google" }
  ]
}`;

  const aliasExample = `{ "id": "gpt-4o", "object": "model", "created": 1755878400, "owned_by": "openai" },
{ "id": "company/smart", "object": "model", "created": 1755878400, "owned_by": "openai" }`;
</script>

<template>
  <DocPage>
    <ProseH1 id="models">Models</ProseH1>
    <CodeBlock
      language="http"
      filename="http"
      :code="endpoint"
    />
    <p>
      Requires an <ProseA href="/api-reference/authentication">application API key</ProseA>. Not
      filtered by the application's model allowlist — this always lists the full registry; the
      allowlist is enforced at request time on
      <ProseA href="/api-reference/chat-completions">chat completions</ProseA>, not here.
    </p>

    <ProseH2 id="response">Response</ProseH2>
    <CodeBlock
      language="json"
      filename="json"
      :code="response"
    />
    <p>
      <ProseCode>created</ProseCode> is the gateway process's boot time (unix seconds), identical
      across every entry in a given response — it's not a per-model release date.
    </p>

    <ProseH2 id="aliases-appear-as-separate-entries">Aliases appear as separate entries</ProseH2>
    <p>
      If a registry model declares <ProseCode>aliases</ProseCode>, each alias produces its own row
      in <ProseCode>data</ProseCode> with the same <ProseCode>owned_by</ProseCode>, sharing the
      underlying model:
    </p>
    <CodeBlock
      language="json"
      filename="json"
      :code="aliasExample"
    />
    <p>
      Both <ProseCode>gpt-4o</ProseCode> and <ProseCode>company/smart</ProseCode> resolve to the
      exact same registry entry when used as <ProseCode>model</ProseCode> in a chat completion
      request. See
      <ProseA href="/architecture/model-registry-and-routing#the-registry"
        >Model Registry &amp; Routing</ProseA
      >.
    </p>
  </DocPage>
</template>
