<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Providers', sectionOrder: 3, title: 'Overview', order: 1 },
  });

  useSeoMeta({
    title: 'Overview',
    description: 'The provider adapter interface and how the five shipped adapters relate.',
  });

  const tree = `server/providers/
├── openai/               cloud, OpenAI's native API
├── anthropic/            cloud, Anthropic's native API
├── google/               cloud, Gemini's native API
└── openai-compatible/    shared adapter (request/response/SSE translation)
    ├── ollama/           self-hosted, talks OpenAI-compatible endpoints
    └── vllm/             self-hosted, talks OpenAI-compatible endpoints`;

  const adapterType = `type ProviderAdapter = {
  id: ProviderId;
  createChatCompletion(
    request: ChatCompletionRequest,
    ctx: ProviderRequestContext,
  ): Promise<ChatCompletionResponse>;
  streamChatCompletion(
    request: ChatCompletionRequest,
    ctx: ProviderRequestContext,
  ): AsyncGenerator<ChatCompletionChunk, void, void>;
};

type ProviderRequestContext = {
  apiKey?: string;
  providerModel: string;
  signal: AbortSignal;
};`;
</script>

<template>
  <DocPage>
    <ProseH1 id="providers">Providers</ProseH1>
    <CodeBlock
      language="text"
      filename="text"
      :code="tree"
    />

    <p>
      Every provider implements the same interface
      (<ProseCode>server/providers/types.ts</ProseCode>), so the
      <ProseA href="/architecture/request-lifecycle">dispatch loop</ProseA> never needs to know
      which provider it's calling:
    </p>
    <CodeBlock
      language="ts"
      filename="types.ts"
      :code="adapterType"
    />

    <p>Two shared helpers keep every adapter's error handling consistent:</p>
    <ProseUl>
      <ProseLi>
        <ProseCode>requireApiKey(ctx, provider)</ProseCode> — throws a
        <ProseCode>500 provider_error</ProseCode> if a cloud adapter is invoked with no
        <ProseCode>apiKey</ProseCode>. This should be unreachable in practice, since
        <ProseA href="/architecture/model-registry-and-routing#boot-time-validation"
          >registry validation</ProseA
        >
        already refuses to boot with a model pointing at an unconfigured provider.
      </ProseLi>
      <ProseLi>
        <ProseCode>assertProviderOk(response, provider, label)</ProseCode> — throws a
        <ProseCode>ProviderRequestError(provider, status, message)</ProseCode> on any non-2xx
        upstream response, which is what the
        <ProseA
          href="/architecture/failover-and-circuit-breaking#what-counts-as-a-retryable-failure"
          >circuit breaker's retry logic</ProseA
        >
        inspects.
      </ProseLi>
    </ProseUl>

    <ProseH2 id="cloud-vs-self-hosted">Cloud vs. self-hosted</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh
            >Cloud (<ProseCode>openai</ProseCode>, <ProseCode>anthropic</ProseCode>,
            <ProseCode>google</ProseCode>)</ProseTh
          >
          <ProseTh
            >Self-hosted (<ProseCode>ollama</ProseCode>, <ProseCode>vllm</ProseCode>)</ProseTh
          >
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Credential</ProseTd>
          <ProseTd>API key <strong>required</strong></ProseTd>
          <ProseTd>API key <strong>optional</strong></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Endpoint</ProseTd>
          <ProseTd>Provider's fixed public URL</ProseTd>
          <ProseTd>Your own <ProseCode>baseUrl</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>"Configured" means</ProseTd>
          <ProseTd>The provider's API key env var is set</ProseTd>
          <ProseTd>The provider's <ProseCode>baseUrl</ProseCode> env var is set</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      A self-hosted provider counts as configured the moment it has a
      <ProseCode>baseUrl</ProseCode> — Ollama and vLLM both already speak an OpenAI-shaped
      <ProseCode>/v1/chat/completions</ProseCode>, and typically run with no auth in front of them
      at all, so requiring a key would just be friction with no security benefit in the common case.
    </p>

    <ProseH2 id="streaming-transport">Streaming transport</ProseH2>
    <p>
      Every streaming adapter parses Server-Sent Events through one of two shared parsers in
      <ProseCode>server/providers/sse.ts</ProseCode>:
    </p>
    <ProseUl>
      <ProseLi>
        <ProseCode>parseDataOnlySseStream</ProseCode> — OpenAI- and Gemini-shaped
        <ProseCode>data: {json}</ProseCode> lines, terminated by a literal
        <ProseCode>data: [DONE]</ProseCode>.
      </ProseLi>
      <ProseLi>
        <ProseCode>parseNamedEventSseStream</ProseCode> — Anthropic-shaped
        <ProseCode>event: &lt;name&gt;</ProseCode> / <ProseCode>data: {json}</ProseCode> blocks.
      </ProseLi>
    </ProseUl>

    <ProseH2 id="pages-in-this-section">Pages in this section</ProseH2>
    <ProseUl>
      <ProseLi>
        <ProseA href="/providers/cloud-providers">OpenAI, Anthropic &amp; Google</ProseA> — the
        three bespoke cloud adapters and what's distinctive about each one's request/response
        mapping.
      </ProseLi>
      <ProseLi>
        <ProseA href="/providers/self-hosted">Ollama &amp; vLLM</ProseA> — the shared
        <ProseCode>openai-compatible</ProseCode> adapter and how to point it at a self-hosted
        endpoint.
      </ProseLi>
      <ProseLi>
        <ProseA href="/providers/adding-a-provider">Adding a Provider</ProseA> — implementing
        <ProseCode>ProviderAdapter</ProseCode> for a provider not shipped today.
      </ProseLi>
    </ProseUl>
  </DocPage>
</template>
