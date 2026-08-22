<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Providers', sectionOrder: 3, title: 'Ollama & vLLM', order: 3 },
  });

  useSeoMeta({
    title: 'Ollama & vLLM',
    description: 'Configuring self-hosted providers that already speak an OpenAI-compatible API.',
  });

  const adapterExample = `// conceptually
createOpenAiCompatibleAdapter({
  id: 'ollama',
  label: 'Ollama',
  endpointUrl: \`\${baseUrl}/v1/chat/completions\`,
});`;

  const registryExample = `// apps/gateway/server/registry/models.config.ts
{
  id: 'llama-3-70b',
  provider: 'ollama',
  providerModel: 'llama3:70b', // the name Ollama itself knows this model by
  fallbacks: ['gpt-4o'],
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="self-hosted-ollama-vllm">Self-Hosted: Ollama & vLLM</ProseH1>
    <p>
      Ollama and vLLM are both thin configurations of the same
      <ProseCode>openai-compatible</ProseCode> adapter factory pointed at a different
      <ProseCode>baseUrl</ProseCode>, since both already speak an OpenAI-shaped
      <ProseCode>/v1/chat/completions</ProseCode>. Neither has a bespoke adapter file beyond a few
      lines wiring up <ProseCode>endpointUrl</ProseCode>.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="adapterExample"
    />

    <ProseH2 id="configuration">Configuration</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh>Ollama</ProseTh>
          <ProseTh>vLLM</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Base URL env var</ProseTd>
          <ProseTd><ProseCode>OLLAMA_BASE_URL</ProseCode></ProseTd>
          <ProseTd><ProseCode>VLLM_BASE_URL</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>API key env var</ProseTd>
          <ProseTd><ProseCode>OLLAMA_API_KEY</ProseCode> (optional)</ProseTd>
          <ProseTd><ProseCode>VLLM_API_KEY</ProseCode> (optional)</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Endpoint called</ProseTd>
          <ProseTd><ProseCode>${OLLAMA_BASE_URL}/v1/chat/completions</ProseCode></ProseTd>
          <ProseTd><ProseCode>${VLLM_BASE_URL}/v1/chat/completions</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      A self-hosted provider is "configured" — and therefore eligible to be referenced by a
      <ProseCode>registry.models[].provider</ProseCode> entry — the moment its
      <ProseCode>baseUrl</ProseCode> env var is set. The <ProseCode>authorization</ProseCode> header
      is only added to outgoing requests when an API key is present, since these deployments
      commonly run with no auth in front of them at all.
    </p>
    <Warning>
      If a self-hosted endpoint sits on a network reachable beyond your own infrastructure, set an
      API key. Lattice will happily call it without one, but that's a statement about the adapter's
      flexibility, not a recommendation to run it open.
    </Warning>

    <ProseH2 id="wiring-one-into-the-registry">Wiring one into the registry</ProseH2>
    <CodeBlock
      language="ts"
      filename="models.config.ts"
      :code="registryExample"
    />
    <p>
      <ProseCode>providerModel</ProseCode> is whatever name your Ollama or vLLM instance serves that
      model under locally — it doesn't need to match the registry <ProseCode>id</ProseCode> a client
      requests.
    </p>

    <ProseH2 id="streaming-and-stop-reasons">Streaming and stop reasons</ProseH2>
    <p>
      Because both ride the shared <ProseCode>openai-compatible</ProseCode> request/response/stream
      mapping, they behave exactly like the OpenAI adapter:
      <ProseCode>stream_options: { include_usage: true }</ProseCode> is set on streaming requests so
      usage is reported on the terminal chunk, and <ProseCode>finish_reason</ProseCode> is passed
      through mostly as-is (<ProseCode>length</ProseCode>/<ProseCode>content_filter</ProseCode> are
      special-cased, everything else normalizes to <ProseCode>stop</ProseCode>).
    </p>
    <p>
      See <ProseA href="/providers/adding-a-provider">Adding a Provider</ProseA> if your self-hosted
      stack doesn't speak an OpenAI-compatible API and needs a bespoke adapter instead.
    </p>
  </DocPage>
</template>
