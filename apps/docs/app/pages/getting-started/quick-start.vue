<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Getting Started', sectionOrder: 1, title: 'Quick Start', order: 3 },
  });

  useSeoMeta({
    title: 'Quick Start',
    description: 'Get the gateway and dashboard running end to end, and make your first request.',
  });

  const curlExample = `curl http://localhost:3001/v1/chat/completions \\
  -H "authorization: Bearer lattice_sk_..." \\
  -H "content-type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{ "role": "user", "content": "Say hello in five words." }]
  }'`;

  const diagram = `sequenceDiagram
    participant App as Application
    participant GW as Gateway
    participant P1 as Primary provider
    participant DB as Postgres

    App->>GW: POST /v1/chat/completions
    GW->>GW: verify API key, check quota + rate limit
    GW->>GW: resolve model → candidate chain
    GW->>P1: forward request
    P1-->>GW: 200 + completion
    GW-->>App: response
    GW--)DB: usage + request log (fire-and-forget)`;
</script>

<template>
  <DocPage>
    <ProseH1 id="quick-start">Quick Start</ProseH1>
    <p>
      This walks through a complete local setup: pepper generation, database migration, seeding a
      management key and a test application, running both apps, and making your first chat
      completion.
    </p>

    <Steps>
      <ProseH3>Generate the API key pepper</ProseH3>
      <p>
        Every Lattice API key is stored as a hash, never in plaintext. The hash is keyed by a
        server-side secret called the <strong>pepper</strong>. Generate one:
      </p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="cd apps/gateway
bun run generate-pepper"
      />
      <p>
        This prints a line like <ProseCode>API_KEY_PEPPER=Xk3n...</ProseCode>. Paste it into
        <ProseCode>apps/gateway/.env</ProseCode>. It must be at least 32 characters — losing it
        invalidates every key ever issued, which is the intended failure mode for a stolen database
        dump. See <ProseA href="/architecture/security">Security</ProseA> for why.
      </p>

      <ProseH3>Configure provider credentials</ProseH3>
      <p>
        Still in <ProseCode>apps/gateway/.env</ProseCode>, set credentials for at least one provider
        so the shipped model registry (<ProseCode>gpt-4o</ProseCode>,
        <ProseCode>claude-sonnet</ProseCode>, <ProseCode>gemini-pro</ProseCode>) has somewhere to
        route:
      </p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=..."
      />
      <p>
        A provider only needs a key if a registry entry references it. Self-hosted providers
        (<ProseCode>OLLAMA_BASE_URL</ProseCode>, <ProseCode>VLLM_BASE_URL</ProseCode>) don't require
        a key at all — see <ProseA href="/providers/overview">Providers</ProseA>.
      </p>

      <ProseH3>Configure the database</ProseH3>
      <p>
        Fill in <ProseCode>DB_HOST</ProseCode>, <ProseCode>DB_PORT</ProseCode>,
        <ProseCode>DB_USER</ProseCode>, <ProseCode>DB_PASSWORD</ProseCode>,
        <ProseCode>DB_SSL</ProseCode>, <ProseCode>DB_DATABASE</ProseCode> in
        <ProseCode>apps/gateway/.env</ProseCode> for a Postgres instance you control, then run
        migrations:
      </p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="bun run db:migrate"
      />

      <ProseH3>Seed a management key</ProseH3>
      <p>The dashboard needs a management API key to administer the gateway. Mint one:</p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="bun run seed-management-key admin"
      />
      <p>This prints the key exactly once:</p>
      <CodeBlock
        language="text"
        filename="text"
        code="Management API key created: 3f2b... (admin)
API key (shown once, store it now): lattice_sk_..."
      />
      <p>
        Copy that key into <ProseCode>apps/dashboard/.env</ProseCode> as
        <ProseCode>LATTICE_MANAGEMENT_API_KEY</ProseCode>.
      </p>

      <ProseH3>Run the gateway</ProseH3>
      <CodeBlock
        language="bash"
        filename="bash"
        code="bun run dev"
      />
      <p>
        The gateway listens on <ProseCode>:3001</ProseCode> by default (<ProseCode>PORT</ProseCode>
        in .env).
      </p>

      <ProseH3>Set up the dashboard</ProseH3>
      <p>In a second terminal:</p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="cd apps/dashboard
cp .env.example .env"
      />
      <p>Fill in:</p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="NUXT_BETTER_AUTH_SECRET=<openssl rand -base64 32>
LATTICE_GATEWAY_URL=http://localhost:3001
LATTICE_MANAGEMENT_API_KEY=<the key from step 5>
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_SSL=... DB_DATABASE=..."
      />
      <p>
        The dashboard's database only stores its own admin sessions (better-auth) — it can be a
        separate Postgres database from the gateway's. Then migrate and run:
      </p>
      <CodeBlock
        language="bash"
        filename="bash"
        code="bun run db:migrate
bun run dev"
      />
      <p>
        The dashboard listens on <ProseCode>:3000</ProseCode> by default. Open it, sign up an admin
        account, and sign in.
      </p>

      <ProseH3>Create a test application and make a request</ProseH3>
      <p>
        From <ProseCode>apps/gateway</ProseCode>, seed an application with its own API key
        (independent of the dashboard, useful for scripting):
      </p>
      <CodeBlock
        language="bash"
        filename="bash"
        code='bun run seed "My Test App"'
      />
      <CodeBlock
        language="text"
        filename="text"
        code="Application created: 8f1c... (My Test App)
API key (shown once, store it now): lattice_sk_..."
      />
      <p>Call the gateway directly:</p>
      <CodeBlock
        language="bash"
        filename="bash"
        :code="curlExample"
      />
      <p>
        A <ProseCode>200</ProseCode> with a <ProseCode>chat.completion</ProseCode> body means the
        gateway authenticated the key, routed to OpenAI, and logged the request. See
        <ProseA href="/api-reference/chat-completions">Chat Completions</ProseA> for the full
        request/response reference, including streaming.
      </p>
    </Steps>

    <ProseH2 id="what-you-just-set-up">What you just set up</ProseH2>
    <MermaidDiagram :code="diagram" />

    <p>
      Next, read <ProseA href="/architecture/overview">Architecture</ProseA> to understand routing
      and failover, or <ProseA href="/management-api/overview">Management API</ProseA> to provision
      real applications.
    </p>
  </DocPage>
</template>
