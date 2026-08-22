<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Providers', sectionOrder: 3, title: 'Adding a Provider', order: 4 },
  });

  useSeoMeta({
    title: 'Adding a Provider',
    description:
      "Implementing the ProviderAdapter interface for a provider that isn't shipped today.",
  });

  const adapterExample = `export const myProviderAdapter: ProviderAdapter = {
  id: 'my-provider',
  async createChatCompletion(request, ctx) {
    requireApiKey(ctx, 'my-provider'); // only if credentials are mandatory
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {/* ... */},
      body: JSON.stringify(toUpstreamRequest(request, ctx)),
      signal: ctx.signal,
    });
    await assertProviderOk(response, 'my-provider', 'chat completion');
    return toChatCompletionResponse(await response.json());
  },
  async *streamChatCompletion(request, ctx) {
    // open the request with stream: true, yield mapped chunks
  },
};`;
</script>

<template>
  <DocPage>
    <ProseH1 id="adding-a-provider">Adding a Provider</ProseH1>
    <p>Two paths, depending on what the upstream API looks like.</p>

    <ProseH2 id="it-already-speaks-openais-v1chatcompletions-shape">
      It already speaks OpenAI's <ProseCode>/v1/chat/completions</ProseCode> shape
    </ProseH2>
    <p>
      This covers most self-hosted inference servers (Ollama, vLLM, and many others built on the
      same convention). No new adapter code is needed — configure it exactly like
      <ProseA href="/providers/self-hosted">Ollama &amp; vLLM</ProseA>: point a
      <ProseCode>baseUrl</ProseCode> env var at it and reference it from the registry. If it needs a
      fixed, non-configurable base URL (rather than reading one from the environment), add a
      one-line wrapper around <ProseCode>createOpenAiCompatibleAdapter</ProseCode> following
      <ProseCode>providers/ollama/adapter.ts</ProseCode>
      as a template.
    </p>

    <ProseH2 id="it-needs-bespoke-requestresponse-mapping"
      >It needs bespoke request/response mapping</ProseH2
    >
    <p>
      Follow the shape of <ProseCode>providers/anthropic/</ProseCode> or
      <ProseCode>providers/google/</ProseCode>:
    </p>

    <Steps>
      <ProseH3>Define the adapter's request/response/stream mapping</ProseH3>
      <p>
        Create <ProseCode>server/providers/&lt;name&gt;/{request,response,stream}.ts</ProseCode>:
      </p>
      <ProseUl>
        <ProseLi>
          <ProseCode>request.ts</ProseCode> — maps
          <ProseCode>ChatCompletionRequest</ProseCode> (Lattice's shape) into whatever body the
          upstream API expects. Handle anything the upstream API doesn't support natively the way
          Anthropic's adapter handles <ProseCode>system</ProseCode> messages: transform, don't drop
          silently.
        </ProseLi>
        <ProseLi>
          <ProseCode>response.ts</ProseCode> — maps the upstream's non-streaming response back into
          <ProseCode>ChatCompletionResponse</ProseCode>, including a
          <ProseCode>finish_reason</ProseCode> normalized to
          <ProseCode>'stop' | 'length' | 'content_filter'</ProseCode>.
        </ProseLi>
        <ProseLi>
          <ProseCode>stream.ts</ProseCode> — maps the upstream's SSE stream into
          <ProseCode>AsyncGenerator&lt;ChatCompletionChunk&gt;</ProseCode>. Reuse
          <ProseCode>parseDataOnlySseStream</ProseCode> or
          <ProseCode>parseNamedEventSseStream</ProseCode> from
          <ProseCode>providers/sse.ts</ProseCode> depending on whether the upstream sends
          self-contained JSON payloads or named events. If the upstream's stream reports
          usage/finish incrementally rather than as one final self-contained message, model it as a
          stateful reducer the way <ProseCode>anthropic/stream.ts</ProseCode>
          does.
        </ProseLi>
      </ProseUl>

      <ProseH3>Implement the adapter</ProseH3>
      <p>
        Create <ProseCode>server/providers/&lt;name&gt;/adapter.ts</ProseCode> exporting a
        <ProseCode>ProviderAdapter</ProseCode>:
      </p>
      <CodeBlock
        language="ts"
        filename="adapter.ts"
        :code="adapterExample"
      />
      <p>
        Always forward <ProseCode>ctx.signal</ProseCode> to <ProseCode>fetch</ProseCode> — dispatch
        relies on aborting the in-flight request when a non-streaming attempt times out or a
        streaming client disconnects. Always call <ProseCode>assertProviderOk</ProseCode> before
        parsing a response body, so upstream errors surface as
        <ProseCode>ProviderRequestError</ProseCode> and participate correctly in
        <ProseA
          href="/architecture/failover-and-circuit-breaking#what-counts-as-a-retryable-failure"
          >circuit breaker retry logic</ProseA
        >.
      </p>

      <ProseH3>Add the provider id and credential resolution</ProseH3>
      <p>
        Extend the <ProseCode>ProviderId</ProseCode> union in
        <ProseCode>providers/types.ts</ProseCode>, and add a branch in
        <ProseCode>registry/credentials.ts</ProseCode>'s
        <ProseCode>buildProviderCredentials</ProseCode>
        describing what env var(s) make this provider "configured" — an API key for a cloud-style
        provider, a base URL for a self-hosted one.
      </p>

      <ProseH3>Register the adapter and reference it from the registry</ProseH3>
      <p>
        Add the adapter to the <ProseCode>adapters</ProseCode> map in
        <ProseCode>routing/deps.ts</ProseCode>, then add a model entry in
        <ProseCode>registry/models.config.ts</ProseCode> with
        <ProseCode>provider: 'my-provider'</ProseCode>.
      </p>

      <ProseH3>Write tests</ProseH3>
      <p>
        Mirror the existing provider test layout under
        <ProseCode>tests/apps/gateway/server/providers/&lt;name&gt;/</ProseCode>: one test file per
        mapping concern (<ProseCode>adapter</ProseCode>, <ProseCode>request</ProseCode>,
        <ProseCode>response</ProseCode>, <ProseCode>stream</ProseCode>), following the pattern in
        <ProseCode>tests/apps/gateway/server/providers/anthropic/*</ProseCode>.
      </p>
    </Steps>

    <ProseH2 id="checklist">Checklist</ProseH2>
    <FieldGroup>
      <Field
        name="ProviderAdapter"
        type="implemented"
      >
        <ProseCode>id</ProseCode>, <ProseCode>createChatCompletion</ProseCode>,
        <ProseCode>streamChatCompletion</ProseCode> — all forwarding
        <ProseCode>ctx.signal</ProseCode>.
      </Field>
      <Field
        name="Errors"
        type="normalized"
      >
        Non-2xx responses raised via <ProseCode>assertProviderOk</ProseCode> so failures are
        retryable/circuit-tracked correctly.
      </Field>
      <Field
        name="finish_reason"
        type="normalized"
      >
        Every upstream stop/finish value maps to
        <ProseCode>'stop' | 'length' | 'content_filter'</ProseCode>.
      </Field>
      <Field
        name="Credentials"
        type="resolved"
      >
        <ProseCode>credentials.ts</ProseCode> knows what env var(s) make this provider count as
        configured, so
        <ProseA href="/architecture/model-registry-and-routing#boot-time-validation"
          >registry boot validation</ProseA
        >
        can enforce it.
      </Field>
      <Field
        name="Tests"
        type="added"
      >
        Adapter, request, response, and (if streaming) stream mapping each covered.
      </Field>
    </FieldGroup>
  </DocPage>
</template>
