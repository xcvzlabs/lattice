<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Shared Packages', order: 4 },
  });

  useSeoMeta({
    title: 'Shared Packages',
    description: 'The two workspace packages every app builds on — api-contract and env.',
  });

  const schemaTree = `src/schemas/
├── chat-completion.ts    ChatCompletionRequest/Response/Chunk, ChatMessage, FinishReason
├── error.ts               ErrorEnvelope — the shape every error response uses
├── model.ts                Model, ModelListResponse (/v1/models)
└── management/
    ├── application.ts       Application, Create/UpdateApplicationRequest
    ├── api-key.ts            ApiKey, CreateApiKeyResponse
    ├── usage.ts               UsageSummaryRow/Response
    ├── request-log.ts         RequestLog, RequestLogListResponse
    ├── provider-health.ts     ProviderHealth, CircuitState
    ├── registry-model.ts      RegistryModel, RegistryModelListResponse
    └── routing-strategy.ts    RoutingStrategy`;

  const parseExample = `import { chatCompletionRequestSchema, type ChatCompletionRequest } from '@lattice/api-contract'
import * as v from 'valibot'

const parsed = v.safeParse(chatCompletionRequestSchema, body)`;

  const defineEnvSignature = `export function defineEnv<TSchema extends v.GenericSchema>(options: {
  schema: TSchema
  source?: EnvSource
}): v.InferOutput<TSchema>`;

  const envSchemaExample = `// apps/gateway/server/utils/env.ts
export const env = defineEnv({
  schema: v.object({
    apiKeyPepper: v.pipe(v.string(), v.minLength(32)),
    openaiApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    // ...
    db: v.object({
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      ssl: booleanEnvSchema,
      // ...
    }),
  }),
})`;
</script>

<template>
  <DocPage>
    <ProseH1 id="shared-packages">Shared Packages</ProseH1>

    <ProseH2 id="lattice-api-contract"><ProseCode>@lattice/api-contract</ProseCode></ProseH2>
    <p>
      One Valibot schema (plus its <ProseCode>v.InferOutput</ProseCode> type) per request/response
      concept, barrel-exported from <ProseCode>packages/api-contract/src/index.ts</ProseCode>. This
      is the single source of truth for wire shapes — the gateway validates requests and types
      responses against these same schemas, and the dashboard imports the same types for its proxy
      routes, so the two apps cannot silently drift apart on what a field is called or what type it
      holds.
    </p>
    <CodeBlock
      language="text"
      filename="text"
      :code="schemaTree"
    />
    <p>
      Request schemas that accept client input use <ProseCode>v.strictObject</ProseCode> (unknown
      fields rejected, not dropped — see
      <ProseA href="/api-reference/chat-completions#request-body">Chat Completions</ProseA>);
      response schemas use <ProseCode>v.object</ProseCode>. Every schema documented in
      <ProseA href="/api-reference/authentication">API Reference</ProseA> and
      <ProseA href="/management-api/overview">Management API</ProseA> is defined here — those pages
      describe the same shapes this package encodes as runtime-checkable Valibot schemas.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="parseExample"
    />

    <ProseH2 id="lattice-env"><ProseCode>@lattice/env</ProseCode></ProseH2>
    <p>
      A small, deliberate wrapper around Valibot for environment variable parsing — see
      <ProseA href="/architecture/security">Security</ProseA> and
      <ProseA href="/deployment/configuration-reference">Configuration Reference</ProseA> for what
      it validates in practice.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="defineEnvSignature"
    />
    <p>
      <strong>Naming convention</strong>: a nested <ProseCode>v.object()</ProseCode> schema's key
      path maps to a <ProseCode>SCREAMING_SNAKE_CASE</ProseCode> env var name, camelCase segments
      included — <ProseCode>v.object({ db: v.object({ host: v.string() }) })</ProseCode> reads from
      <ProseCode>DB_HOST</ProseCode>. This is why
      <ProseCode>apps/gateway/server/utils/env.ts</ProseCode>'s
      <ProseCode>apiKeyPepper</ProseCode> field reads <ProseCode>API_KEY_PEPPER</ProseCode>, and
      <ProseCode>db.host</ProseCode> reads <ProseCode>DB_HOST</ProseCode>.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="envSchemaExample"
    />
    <p>
      <strong>Source</strong>: defaults to <ProseCode>Bun.env</ProseCode> when running under Bun,
      falling back to <ProseCode>process.env</ProseCode> for tools that load config in a plain Node
      subprocess (drizzle-kit, notably — see <ProseCode>drizzle.config.ts</ProseCode> importing this
      same <ProseCode>env</ProseCode> object).
    </p>
    <p>
      <strong>Failure mode</strong>: <ProseCode>v.safeParse</ProseCode> runs once, eagerly, at
      import time. Any invalid or missing variable throws
      <ProseCode>EnvValidationError</ProseCode> — a typed error carrying
      <ProseCode>issues: EnvIssue[]</ProseCode> (each with <ProseCode>envVar</ProseCode>,
      <ProseCode>path</ProseCode>, and <ProseCode>message</ProseCode>) — which crashes the process
      at boot rather than surfacing as a runtime <ProseCode>undefined</ProseCode> deep in request
      handling.
    </p>
    <p>
      <strong><ProseCode>booleanEnvSchema</ProseCode></strong
      >: exported from <ProseCode>packages/env/schemas.ts</ProseCode> specifically because Valibot's
      own <ProseCode>v.toBoolean()</ProseCode> does a plain
      <ProseCode>Boolean(value)</ProseCode> coercion, and <em>any</em> non-empty string — including
      the literal text <ProseCode>"false"</ProseCode> — is truthy in JavaScript.
      <ProseCode>booleanEnvSchema</ProseCode> only accepts the literal strings
      <ProseCode>"true"</ProseCode>/<ProseCode>"false"</ProseCode> and transforms them to the real
      boolean, which is what makes <ProseCode>DB_SSL=false</ProseCode> actually mean
      <ProseCode>false</ProseCode>.
    </p>

    <ProseH2 id="why-these-are-separate-packages-not-gateway-local-utilities"
      >Why these are separate packages, not gateway-local utilities</ProseH2
    >
    <p>
      Both the gateway and the dashboard need typed environment parsing, and the dashboard's
      <ProseCode>server/api/*</ProseCode> routes need the exact same request/response types the
      gateway's route handlers validate against. Duplicating either would mean the two apps could
      drift — a field renamed on one side without the other noticing until a request fails at
      runtime. Centralizing both in <ProseCode>packages/</ProseCode> makes that drift a compile-time
      TypeScript error instead.
    </p>
  </DocPage>
</template>
