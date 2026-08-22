<script setup lang="ts">
  definePageMeta({
    docs: { section: 'API Reference', sectionOrder: 4, title: 'Authentication', order: 1 },
  });

  useSeoMeta({
    title: 'Authentication',
    description: 'How to authenticate application requests against the /v1 API.',
  });

  const curlExample = `curl https://gateway.internal/v1/chat/completions \\
  -H "authorization: Bearer $LATTICE_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{ "model": "gpt-4o", "messages": [{"role":"user","content":"hi"}] }'`;

  const tsExample = `const response = await fetch('https://gateway.internal/v1/chat/completions', {
  method: 'POST',
  headers: {
    authorization: \`Bearer \${process.env.LATTICE_API_KEY}\`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'hi' }],
  }),
});`;

  const pythonExample = `import os
import requests

response = requests.post(
    "https://gateway.internal/v1/chat/completions",
    headers={"authorization": f"Bearer {os.environ['LATTICE_API_KEY']}"},
    json={"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]},
)`;

  const sdkExample = `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.LATTICE_API_KEY,
  baseURL: 'https://gateway.internal/v1',
});`;
</script>

<template>
  <DocPage>
    <ProseH1 id="authentication">Authentication</ProseH1>
    <p>
      Every request to <ProseCode>/v1/**</ProseCode> must carry an
      <ProseCode>Authorization</ProseCode> header with a Lattice application API key:
    </p>
    <CodeBlock
      language="http"
      filename="http"
      code="Authorization: Bearer lattice_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    />

    <CodeGroup>
      <CodeBlock
        language="bash"
        filename="cURL"
        :code="curlExample"
      />
      <CodeBlock
        language="ts"
        filename="TypeScript"
        :code="tsExample"
      />
      <CodeBlock
        language="python"
        filename="Python"
        :code="pythonExample"
      />
    </CodeGroup>

    <ProseH2 id="getting-a-key">Getting a key</ProseH2>
    <p>
      Application API keys are issued through the
      <ProseA href="/management-api/api-keys">Management API</ProseA> (or the
      <ProseA href="/dashboard/overview">Dashboard</ProseA>) by an admin — not by the application
      itself. A key is scoped to exactly one application and inherits that application's policy
      (allowed models, quota, rate limit, routing strategy).
    </p>
    <Note>
      The full key value is only ever shown once, at creation time. Lattice stores an HMAC-SHA256
      hash of the key, not the key itself — losing it means issuing a new one, not "looking it up
      again." See
      <ProseA href="/architecture/security">Security</ProseA> for why.
    </Note>

    <ProseH2 id="the-openai-compatible-surface">The OpenAI-compatible surface</ProseH2>
    <p>
      Lattice's <ProseCode>/v1</ProseCode> API deliberately mirrors OpenAI's request/response shapes
      so existing OpenAI SDKs and tooling work against it with only a
      <ProseCode>baseURL</ProseCode> change:
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="sdkExample"
    />
    <Warning>
      The request schema is a strict object — fields the gateway doesn't recognize (like
      <ProseCode>tools</ProseCode>/<ProseCode>tool_calls</ProseCode>, which Lattice doesn't support
      yet) are rejected with <ProseCode>400 invalid_request</ProseCode> rather than silently
      ignored. Don't pass OpenAI SDK options you haven't confirmed Lattice accepts — see
      <ProseA href="/api-reference/chat-completions">Chat Completions</ProseA>
      for the exact accepted field list.
    </Warning>

    <ProseH2 id="auth-failure-responses">Auth failure responses</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Condition</ProseTh>
          <ProseTh>Status</ProseTh>
          <ProseTh><ProseCode>error.code</ProseCode></ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd
            >No <ProseCode>Authorization</ProseCode> header, or not
            <ProseCode>Bearer &lt;token&gt;</ProseCode></ProseTd
          >
          <ProseTd><ProseCode>401</ProseCode></ProseTd>
          <ProseTd><ProseCode>missing_api_key</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Key doesn't match any active key, or its application is disabled</ProseTd>
          <ProseTd><ProseCode>401</ProseCode></ProseTd>
          <ProseTd><ProseCode>invalid_api_key</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      See <ProseA href="/api-reference/errors">Errors</ProseA> for the full error envelope shape and
      every possible code.
    </p>

    <ProseH2 id="what-a-key-does-not-grant">What a key does <em>not</em> grant</ProseH2>
    <p>
      An application key only authenticates against <ProseCode>/v1/**</ProseCode>. It carries no
      access to <ProseCode>/management/v1/**</ProseCode> — provisioning, usage inspection, and key
      issuance for <em>other</em> applications all require a separate
      <ProseA href="/api-reference/authentication#management-api-authentication"
        >management key</ProseA
      >, held only by the dashboard or trusted admin tooling.
    </p>

    <ProseH3 id="management-api-authentication">Management API authentication</ProseH3>
    <p>
      <ProseCode>/management/v1/**</ProseCode> uses the same
      <ProseCode>Authorization: Bearer &lt;key&gt;</ProseCode>
      mechanics, but against a distinct key type and table
      (<ProseCode>management_api_keys</ProseCode>, not
      <ProseCode>api_keys</ProseCode>). A management key is not scoped to any application — it
      administers the gateway itself. See
      <ProseA href="/management-api/overview">Management API → Overview</ProseA>.
    </p>
  </DocPage>
</template>
