<script setup lang="ts">
  definePageMeta({
    docs: { section: 'API Reference', sectionOrder: 4, title: 'Chat Completions', order: 2 },
  });

  useSeoMeta({
    title: 'Chat Completions',
    description:
      'Full reference for POST /v1/chat/completions — request fields, response shape, and streaming.',
  });

  const requestExample = `{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a concise assistant." },
    { "role": "user", "content": "Summarize the attached ticket in one sentence." }
  ],
  "temperature": 0.3,
  "max_tokens": 300
}`;

  const responseExample = `{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1755878400,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 118,
    "total_tokens": 160
  }
}`;

  const streamExample = `data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1755878400,"model":"gpt-4o","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1755878400,"model":"gpt-4o","choices":[{"index":0,"delta":{"content":"Sure"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":1755878400,"model":"gpt-4o","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":42,"completion_tokens":118,"total_tokens":160}}

data: [DONE]`;

  const chunkType = `type ChatCompletionChunk = {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: [
    {
      index: number;
      delta: { role?: 'assistant'; content?: string };
      finish_reason: 'stop' | 'length' | 'content_filter' | null;
    },
  ];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
};`;

  const streamTsExample = `const response = await fetch('https://gateway.internal/v1/chat/completions', {
  method: 'POST',
  headers: {
    authorization: \`Bearer \${process.env.LATTICE_API_KEY}\`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Write a haiku about gateways.' }],
    stream: true,
  }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  for (const line of decoder.decode(value).split('\\n')) {
    if (!line.startsWith('data: ')) continue;
    const payload = line.slice(6);
    if (payload === '[DONE]') continue;
    process.stdout.write(JSON.parse(payload).choices[0].delta.content ?? '');
  }
}`;

  const streamPythonExample = `import json
import requests

response = requests.post(
    "https://gateway.internal/v1/chat/completions",
    headers={"authorization": f"Bearer {LATTICE_API_KEY}"},
    json={"model": "gpt-4o", "messages": [{"role": "user", "content": "Write a haiku about gateways."}], "stream": True},
    stream=True,
)

for line in response.iter_lines(decode_unicode=True):
    if not line or not line.startswith("data: "):
        continue
    payload = line[6:]
    if payload == "[DONE]":
        break
    delta = json.loads(payload)["choices"][0]["delta"]
    print(delta.get("content", ""), end="")`;
</script>

<template>
  <DocPage>
    <ProseH1 id="chat-completions">Chat Completions</ProseH1>
    <CodeBlock
      language="http"
      filename="http"
      code="POST /v1/chat/completions"
    />
    <p>
      Requires an <ProseA href="/api-reference/authentication">application API key</ProseA>. Subject
      to that application's
      <ProseA href="/architecture/data-model#applications">model allowlist</ProseA>,
      <ProseA href="/api-reference/rate-limits-and-quotas">monthly quota</ProseA>, and
      <ProseA href="/api-reference/rate-limits-and-quotas">rate limit</ProseA>.
    </p>

    <ProseH2 id="request-body">Request body</ProseH2>
    <p>
      The body is validated as a <strong>strict object</strong> — any field not listed below causes
      <ProseCode>400 invalid_request</ProseCode>, it is never silently dropped.
    </p>
    <FieldGroup>
      <Field
        name="model"
        type="string, required"
      >
        A registry model <ProseCode>id</ProseCode> or <ProseCode>alias</ProseCode> (see
        <ProseA href="/architecture/model-registry-and-routing">Model Registry &amp; Routing</ProseA
        >). Unknown model → <ProseCode>404 model_not_found</ProseCode>.
      </Field>
      <Field
        name="messages"
        type="ChatMessage[], required"
      >
        1 to 200 items. Each message is itself a strict object:
        <ProseCode>{ role: 'system' | 'user' | 'assistant', content: string }</ProseCode>, content
        up to 32,000 characters.
      </Field>
      <Field
        name="stream"
        type="boolean, default false"
      >
        When <ProseCode>true</ProseCode>, the response is
        <ProseCode>text/event-stream</ProseCode> instead of a single JSON body. See
        <ProseA href="#streaming">Streaming</ProseA>.
      </Field>
      <Field
        name="temperature"
        type="number, optional"
        ><ProseCode>0</ProseCode> to <ProseCode>2</ProseCode>.</Field
      >
      <Field
        name="max_tokens"
        type="integer, optional"
      >
        <ProseCode>&gt;= 1</ProseCode>. Also used as the upper bound for
        <ProseA href="/architecture/request-lifecycle#step-by-step">quota reservation</ProseA>
        before dispatch.
      </Field>
      <Field
        name="top_p"
        type="number, optional"
      />
      <Field
        name="stop"
        type="string | string[], optional"
      />
    </FieldGroup>
    <CodeBlock
      language="json"
      filename="json"
      :code="requestExample"
    />
    <Note>
      Not supported today: <ProseCode>tools</ProseCode>/<ProseCode>tool_calls</ProseCode>,
      <ProseCode>n</ProseCode> (multiple completions), <ProseCode>logprobs</ProseCode>,
      <ProseCode>response_format</ProseCode>, image/multimodal content. Sending any of these fails
      validation rather than being ignored, so a client finds out immediately rather than silently
      getting different behavior than expected.
    </Note>

    <ProseH2 id="non-streaming-response">Non-streaming response</ProseH2>
    <p><ProseCode>200 OK</ProseCode>, <ProseCode>content-type: application/json</ProseCode>:</p>
    <CodeBlock
      language="json"
      filename="json"
      :code="responseExample"
    />
    <p>
      <ProseCode>finish_reason</ProseCode> is one of
      <ProseCode>'stop' | 'length' | 'content_filter'</ProseCode>, normalized the same way across
      every provider — see <ProseA href="/providers/cloud-providers">Providers</ProseA> for how each
      upstream's native stop reason maps into these three.
    </p>

    <ProseH2 id="streaming">Streaming</ProseH2>
    <p>
      Set <ProseCode>"stream": true</ProseCode>. The response is
      <ProseCode>text/event-stream</ProseCode>; each event's <ProseCode>data:</ProseCode> payload is
      a JSON-encoded chunk, and the stream ends with a literal <ProseCode>data: [DONE]</ProseCode>:
    </p>
    <CodeBlock
      language="text"
      filename="text"
      :code="streamExample"
    />
    <p>Chunk shape:</p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="chunkType"
    />
    <p>
      <ProseCode>usage</ProseCode> is only present on the terminal chunk, and only when the upstream
      provider reports it there.
    </p>

    <CodeGroup>
      <CodeBlock
        language="ts"
        filename="TypeScript"
        :code="streamTsExample"
      />
      <CodeBlock
        language="python"
        filename="Python"
        :code="streamPythonExample"
      />
    </CodeGroup>

    <Warning>
      Failover for a streaming request only happens <strong>before the first chunk</strong> is sent.
      If a provider fails mid-stream after content has already reached the client, the connection
      just ends — see
      <ProseA href="/architecture/request-lifecycle#streaming-is-different-after-the-first-chunk"
        >Request Lifecycle</ProseA
      >
      for why partial output is never silently replaced.
    </Warning>

    <ProseH2 id="errors">Errors</ProseH2>
    <p>
      See the full table in <ProseA href="/api-reference/errors">Errors</ProseA>. The two most
      common on this endpoint beyond auth failures:
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Status</ProseTh>
          <ProseTh><ProseCode>error.code</ProseCode></ProseTh>
          <ProseTh>Cause</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>403</ProseCode></ProseTd>
          <ProseTd><ProseCode>model_not_permitted</ProseCode></ProseTd>
          <ProseTd
            >The application has an <ProseCode>allowedModels</ProseCode> list and this model isn't
            on it.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>429</ProseCode></ProseTd>
          <ProseTd><ProseCode>quota_exceeded</ProseCode></ProseTd>
          <ProseTd>The application's monthly token quota is exhausted.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>429</ProseCode></ProseTd>
          <ProseTd><ProseCode>rate_limit_exceeded</ProseCode></ProseTd>
          <ProseTd>The application's per-minute request limit is exceeded.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>404</ProseCode></ProseTd>
          <ProseTd><ProseCode>model_not_found</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>model</ProseCode> doesn't match any registry <ProseCode>id</ProseCode> or
            <ProseCode>alias</ProseCode>.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>502</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>all_providers_failed</ProseCode> /
            <ProseCode>provider_error</ProseCode></ProseTd
          >
          <ProseTd>Every candidate provider failed.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
  </DocPage>
</template>
