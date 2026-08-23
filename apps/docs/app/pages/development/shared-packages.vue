<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Shared Packages', order: 4 },
  });

  useSeoMeta({
    title: 'Shared Packages',
    description:
      'The workspace package every app builds on — api-contract — plus @xcvzlabs/env, the external env loader both apps share.',
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

  const defineEnvSignature = `export function defineEnv<TSchema extends EnvSchemaTree>(options: {
  schema: TSchema
  source?: EnvSource
  toEnvVarName?: (path: string[]) => string
}): InferEnvOutput<TSchema>`;

  const envSchemaExample = `// apps/gateway/server/utils/env.ts
import { booleanEnv, defineEnv } from '@xcvzlabs/env'
import * as v from 'valibot'

export const env = defineEnv({
  schema: {
    apiKeyPepper: v.pipe(v.string(), v.minLength(32)),
    openaiApiKey: v.optional(v.pipe(v.string(), v.minLength(1))),
    // ...
    db: {
      host: v.string(),
      port: v.pipe(v.string(), v.toNumber()),
      ssl: booleanEnv,
      // ...
    },
  },
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

    <ProseH2 id="xcvzlabs-env"><ProseCode>@xcvzlabs/env</ProseCode></ProseH2>
    <p>
      A runtime-agnostic, <ProseA href="https://standardschema.dev">Standard Schema</ProseA>-based
      env var loader — published independently at
      <ProseA href="https://github.com/xcvzlabs/env">github.com/xcvzlabs/env</ProseA> rather than
      living in this repo's <ProseCode>packages/</ProseCode> directory, since it's generic enough to
      use outside Lattice too. Both apps use it with Valibot leaves, but it works with any Standard
      Schema-compliant validator (Zod, ArkType, or a mix). See
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
      <strong>The schema is a plain object tree, not a single validator schema</strong>: Standard
      Schema exposes no portable way to introspect a validator's keys across vendors, so
      <ProseCode>schema</ProseCode> is a plain nested JS object whose leaves are Standard Schema
      instances — not a <ProseCode>v.object()</ProseCode>. Grouping is owned by
      <ProseCode>@xcvzlabs/env</ProseCode> itself, as plain objects.
    </p>
    <p>
      <strong>Naming convention</strong>: a nested group's key path maps to a
      <ProseCode>SCREAMING_SNAKE_CASE</ProseCode> env var name, camelCase segments included —
      <ProseCode>{ db: { host: v.string() } }</ProseCode> reads from <ProseCode>DB_HOST</ProseCode>.
      This is why <ProseCode>apps/gateway/server/utils/env.ts</ProseCode>'s
      <ProseCode>apiKeyPepper</ProseCode> field reads <ProseCode>API_KEY_PEPPER</ProseCode>, and
      <ProseCode>db.host</ProseCode> reads <ProseCode>DB_HOST</ProseCode>.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="envSchemaExample"
    />
    <p>
      <strong>Source</strong>: defaults to <ProseCode>process.env</ProseCode>, with no Bun-, Deno-,
      or edge-specific APIs involved — Bun populates <ProseCode>process.env</ProseCode> from
      <ProseCode>.env</ProseCode> files the same way it does <ProseCode>Bun.env</ProseCode>, so this
      works unchanged for tools that load config in a plain Node subprocess (drizzle-kit, notably —
      see <ProseCode>drizzle.config.ts</ProseCode> importing this same <ProseCode>env</ProseCode>
      object).
    </p>
    <p>
      <strong>Failure mode</strong>: validation runs once, eagerly, at import time. Any invalid or
      missing variable throws <ProseCode>EnvValidationError</ProseCode> — a typed error carrying
      <ProseCode>issues: EnvIssue[]</ProseCode> (each with <ProseCode>envVar</ProseCode>,
      <ProseCode>path</ProseCode>, and <ProseCode>message</ProseCode>) — which crashes the process
      at boot rather than surfacing as a runtime <ProseCode>undefined</ProseCode> deep in request
      handling.
    </p>
    <p>
      <strong><ProseCode>booleanEnv</ProseCode></strong
      >: one of a handful of zero-dependency leaf schemas <ProseCode>@xcvzlabs/env</ProseCode>
      ships for coercions most validators either lack or get subtly wrong. A naive
      <ProseCode>Boolean(value)</ProseCode> coercion is a JS truthiness check, so it can never
      actually produce <ProseCode>false</ProseCode> for a set env var — <em>any</em> non-empty
      string, including the literal text <ProseCode>"false"</ProseCode>, is truthy in JavaScript.
      <ProseCode>booleanEnv</ProseCode> only accepts the literal strings
      <ProseCode>"true"</ProseCode>/<ProseCode>"false"</ProseCode> and transforms them to the real
      boolean, which is what makes <ProseCode>DB_SSL=false</ProseCode> actually mean
      <ProseCode>false</ProseCode>.
    </p>

    <ProseH2 id="why-api-contract-is-a-separate-package-not-a-gateway-local-utility"
      >Why <ProseCode>api-contract</ProseCode> is a separate package, not a gateway-local
      utility</ProseH2
    >
    <p>
      Both the gateway and the dashboard need typed environment parsing — that's
      <ProseCode>@xcvzlabs/env</ProseCode>, an external dependency, not something to centralize
      locally. But the dashboard's <ProseCode>server/api/*</ProseCode> routes also need the exact
      same request/response types the gateway's route handlers validate against. Duplicating those
      schemas would mean the two apps could drift — a field renamed on one side without the other
      noticing until a request fails at runtime. Centralizing them in
      <ProseCode>packages/api-contract</ProseCode> makes that drift a compile-time TypeScript error
      instead.
    </p>
  </DocPage>
</template>
