<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Providers', sectionOrder: 3, title: 'OpenAI, Anthropic & Google', order: 2 },
  });

  useSeoMeta({
    title: 'OpenAI, Anthropic & Google',
    description:
      'Configuration and request/response mapping for the three cloud provider adapters.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="cloud-providers">Cloud Providers</ProseH1>

    <ProseH2 id="openai">OpenAI</ProseH2>
    <p>
      The simplest adapter: it's a thin wrapper over the shared
      <ProseCode>openai-compatible</ProseCode> factory (the same one Ollama and vLLM use), pointed
      at OpenAI's own endpoint — since OpenAI's API is definitionally OpenAI-shaped.
    </p>
    <ProseTable>
      <tbody>
        <ProseTr>
          <ProseTd>Endpoint</ProseTd>
          <ProseTd><ProseCode>https://api.openai.com/v1/chat/completions</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Auth</ProseTd>
          <ProseTd><ProseCode>authorization: Bearer &lt;OPENAI_API_KEY&gt;</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Env var</ProseTd>
          <ProseTd><ProseCode>OPENAI_API_KEY</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH2 id="anthropic">Anthropic</ProseH2>
    <p>A bespoke adapter, since the Messages API isn't OpenAI-shaped.</p>
    <ProseTable>
      <tbody>
        <ProseTr>
          <ProseTd>Endpoint</ProseTd>
          <ProseTd><ProseCode>https://api.anthropic.com/v1/messages</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Auth</ProseTd>
          <ProseTd>
            <ProseCode>x-api-key: &lt;ANTHROPIC_API_KEY&gt;</ProseCode>,
            <ProseCode>anthropic-version: 2023-06-01</ProseCode>
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Env var</ProseTd>
          <ProseTd><ProseCode>ANTHROPIC_API_KEY</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      <strong>Request mapping</strong>: Anthropic has no <ProseCode>system</ProseCode> role in its
      <ProseCode>messages</ProseCode> array — any <ProseCode>system</ProseCode> messages in the
      incoming request are pulled out and joined (<ProseCode>\n\n</ProseCode>) into a top-level
      <ProseCode>system</ProseCode> field instead. <ProseCode>max_tokens</ProseCode> defaults to
      <ProseCode>4096</ProseCode> if the client didn't set one (Anthropic requires it; OpenAI-shaped
      APIs don't). <ProseCode>stop</ProseCode> is normalized into Anthropic's
      <ProseCode>stop_sequences</ProseCode>.
    </p>
    <p>
      <strong>Response mapping</strong>: all <ProseCode>content</ProseCode> blocks of type
      <ProseCode>text</ProseCode> are concatenated into the single
      <ProseCode>message.content</ProseCode> string Lattice's response shape expects.
      <ProseCode>stop_reason: 'max_tokens'</ProseCode> maps to
      <ProseCode>finish_reason: 'length'</ProseCode>; everything else maps to
      <ProseCode>'stop'</ProseCode>.
    </p>
    <p>
      <strong>Streaming</strong>: Anthropic's stream is a sequence of named SSE events, not
      self-contained chunks, so the stream adapter is a small stateful reducer:
      <ProseCode>message_start</ProseCode> emits the initial
      <ProseCode>role: 'assistant'</ProseCode> chunk and captures
      <ProseCode>input_tokens</ProseCode> for later;
      <ProseCode>content_block_delta</ProseCode> (text deltas) emits content chunks;
      <ProseCode>message_delta</ProseCode> emits the terminal chunk carrying
      <ProseCode>finish_reason</ProseCode> and usage (using the
      <ProseCode>input_tokens</ProseCode> captured earlier, since Anthropic only reports
      output-token deltas incrementally);
      <ProseCode>content_block_start</ProseCode>/<ProseCode>stop</ProseCode>,
      <ProseCode>ping</ProseCode>, and <ProseCode>message_stop</ProseCode> produce no chunk.
    </p>

    <ProseH2 id="google-gemini">Google (Gemini)</ProseH2>
    <p>Also bespoke — the most structurally different of the three.</p>
    <ProseTable>
      <tbody>
        <ProseTr>
          <ProseTd>Endpoint</ProseTd>
          <ProseTd>
            <ProseCode>
              https://generativelanguage.googleapis.com/v1beta/models/{providerModel}:{generateContent|streamGenerateContent}?key=&lt;GOOGLE_API_KEY&gt;[&amp;alt=sse]
            </ProseCode>
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Auth</ProseTd>
          <ProseTd>API key as a <strong>query parameter</strong>, not a header</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Env var</ProseTd>
          <ProseTd><ProseCode>GOOGLE_API_KEY</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      Unlike the other two, the model name is a URL path segment, not a body field —
      <ProseCode>providerModel</ProseCode> gets interpolated directly into the endpoint URL, and the
      method name itself (<ProseCode>generateContent</ProseCode> vs.
      <ProseCode>streamGenerateContent</ProseCode>) changes based on whether the request is
      streaming.
    </p>
    <p>
      <strong>Request mapping</strong>: <ProseCode>assistant</ProseCode> role maps to Gemini's
      <ProseCode>model</ProseCode> role. System messages are joined into
      <ProseCode>systemInstruction.parts[0].text</ProseCode>. <ProseCode>temperature</ProseCode>,
      <ProseCode>top_p</ProseCode>, <ProseCode>max_tokens</ProseCode>, and
      <ProseCode>stop</ProseCode> map into
      <ProseCode>generationConfig.{temperature, topP, maxOutputTokens, stopSequences}</ProseCode>.
    </p>
    <p>
      <strong>Response mapping</strong>: <ProseCode>finishReason: 'MAX_TOKENS'</ProseCode> →
      <ProseCode>'length'</ProseCode>; <ProseCode>finishReason: 'SAFETY'</ProseCode> →
      <ProseCode>'content_filter'</ProseCode>; everything else → <ProseCode>'stop'</ProseCode>.
      Gemini responses carry no response <ProseCode>id</ProseCode>, so one is synthesized:
      <ProseCode>`gemini-${Bun.randomUUIDv7()}`</ProseCode>.
    </p>
    <p>
      <strong>Streaming</strong>: unlike Anthropic, each Gemini stream chunk is self-contained (the
      full shape, not an incremental delta against prior state), so the stream mapper is a stateless
      per-chunk transform rather than a reducer. <ProseCode>usageMetadata</ProseCode> only appears
      on the terminal chunk.
    </p>

    <ProseH2 id="at-a-glance">At a glance</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh>OpenAI</ProseTh>
          <ProseTh>Anthropic</ProseTh>
          <ProseTh>Google</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Adapter kind</ProseTd>
          <ProseTd><ProseCode>openai-compatible</ProseCode> factory</ProseTd>
          <ProseTd>Bespoke</ProseTd>
          <ProseTd>Bespoke</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Auth transport</ProseTd>
          <ProseTd>Header</ProseTd>
          <ProseTd>Header (<ProseCode>x-api-key</ProseCode>)</ProseTd>
          <ProseTd>Query param</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>System role</ProseTd>
          <ProseTd>Native</ProseTd>
          <ProseTd>Merged into <ProseCode>system</ProseCode></ProseTd>
          <ProseTd>Merged into <ProseCode>systemInstruction</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Stream shape</ProseTd>
          <ProseTd>Deltas</ProseTd>
          <ProseTd>Named events, stateful reduce</ProseTd>
          <ProseTd>Self-contained chunks, stateless map</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Synthesized <ProseCode>id</ProseCode></ProseTd>
          <ProseTd>No (upstream provides one)</ProseTd>
          <ProseTd>No</ProseTd>
          <ProseTd>Yes</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
  </DocPage>
</template>
