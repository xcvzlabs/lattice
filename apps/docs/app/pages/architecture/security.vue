<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Architecture', sectionOrder: 2, title: 'Security', order: 6 },
  });

  useSeoMeta({
    title: 'Security',
    description: 'How API keys are generated, hashed, and verified, and the trust model behind it.',
  });

  const trustDiagram = `Application ──[lattice_sk_… key]──▶ Gateway ──[provider credential]──▶ Provider
Dashboard   ──[management key]───▶ Gateway`;

  const generateApiKey = `const KEY_BYTE_LENGTH = 32
const KEY_PREFIX = 'lattice_sk_'
const DISPLAY_PREFIX_LENGTH = 12

function generateApiKey(): { key: string; prefix: string } {
  const secret = randomBytes(KEY_BYTE_LENGTH).toString('base64url')
  const key = \`\${KEY_PREFIX}\${secret}\`
  return { key, prefix: key.slice(0, KEY_PREFIX.length + DISPLAY_PREFIX_LENGTH) }
}`;

  const hashApiKey = `function hashApiKey(key: string, pepper: string): string {
  return createHmac('sha256', pepper).update(key).digest('hex')
}`;

  const errorEnvelope = `{ "error": { "message": "...", "type": "invalid_request_error", "code": "invalid_api_key" } }`;
</script>

<template>
  <DocPage>
    <ProseH1 id="security">Security</ProseH1>
    <CodeBlock
      language="text"
      filename="text"
      :code="trustDiagram"
    />
    <p>
      Applications and the dashboard both authenticate with a bearer key; the gateway never
      re-exposes a provider credential to either. This page covers exactly how those bearer keys are
      generated, stored, and verified — for the API surface that issues and consumes them, see
      <ProseA href="/api-reference/authentication">Authentication</ProseA> and
      <ProseA href="/management-api/api-keys">API Keys</ProseA>.
    </p>

    <ProseH2 id="key-generation">Key generation</ProseH2>
    <p>
      <ProseCode>generateApiKey()</ProseCode>
      (<ProseCode>apps/gateway/server/auth/api-keys.ts</ProseCode>) is used for
      <strong>both</strong> application-scoped keys and management keys — they're structurally
      identical, just stored in different tables and checked by different middleware.
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="generateApiKey"
    />
    <ProseUl>
      <ProseLi
        ><strong>32 bytes</strong> of cryptographically random data
        (<ProseCode>node:crypto</ProseCode>'s <ProseCode>randomBytes</ProseCode>),
        base64url-encoded.</ProseLi
      >
      <ProseLi
        >Prefixed <ProseCode>lattice_sk_</ProseCode> so a key is recognizable by sight and greppable
        in logs (with the rest redacted).</ProseLi
      >
      <ProseLi>
        <ProseCode>prefix</ProseCode> is the first 23 characters (<ProseCode>lattice_sk_</ProseCode>
        + 12 characters of the secret) — enough to let an admin recognize <em>which</em> key a UI
        row refers to, without ever storing or displaying the rest again.
      </ProseLi>
    </ProseUl>

    <ProseH2 id="storage-hash-not-the-key">Storage: hash, not the key</ProseH2>
    <p>
      The raw key is <strong>never stored</strong>. What lands in
      <ProseCode>api_keys.key_hash</ProseCode> /
      <ProseCode>management_api_keys.key_hash</ProseCode> is:
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="hashApiKey"
    />
    <p>
      HMAC-SHA256, keyed by a server-side secret (the <strong>pepper</strong>,
      <ProseCode>API_KEY_PEPPER</ProseCode>) that lives only in the gateway's environment — not in
      the database. This is the deliberate security property: a stolen database dump alone is not
      enough to produce a usable key, because computing the right hash requires the pepper too.
      Losing the pepper is equally deliberate in its blast radius — it invalidates every key ever
      issued at once, since no stored hash can be reproduced from a new pepper. Generate one with
      <ProseCode>bun run generate-pepper</ProseCode>
      (<ProseCode>apps/gateway/scripts/generate-pepper.ts</ProseCode>, also 32 random bytes,
      base64url); it must be at least 32 characters (enforced by the gateway's env schema).
    </p>

    <ProseH2 id="verification">Verification</ProseH2>
    <Tabs>
      <TabsItem label="Application key">
        <p>
          <ProseCode>verifyApiKey(key)</ProseCode>
          (<ProseCode>server/auth/verify-api-key.ts</ProseCode>): hashes the presented key with the
          pepper, looks up an <strong>active</strong> (unrevoked) row by that hash, and additionally
          checks the owning application's <ProseCode>disabledAt</ProseCode> is
          <ProseCode>null</ProseCode>. On success it best-effort touches
          <ProseCode>last_used_at</ProseCode> (a failure to update that timestamp is logged but
          never fails the request) and returns the <ProseCode>Application</ProseCode> row, which the
          auth middleware attaches to the request context for every downstream check (policy, quota,
          rate limit, logging) to read.
        </p>
      </TabsItem>
      <TabsItem label="Management key">
        <p>
          <ProseCode>verifyManagementApiKey(key)</ProseCode>
          (<ProseCode>server/auth/verify-management-api-key.ts</ProseCode>): same hash-and-lookup,
          against <ProseCode>management_api_keys</ProseCode> instead. It returns a plain
          <ProseCode>boolean</ProseCode> — there is currently no per-key identity surfaced to the
          rest of the request. Every valid, unrevoked management key carries the same single admin
          trust tier; the gateway does not yet support scoped or role-limited management keys.
        </p>
      </TabsItem>
    </Tabs>
    <p>
      Both lookups are a single indexed read against a <ProseCode>key_hash</ProseCode> column —
      verifying a bearer key never requires scanning every issued key.
    </p>

    <ProseH2 id="request-context-storage">Request-context storage</ProseH2>
    <p>
      The application resolved by <ProseCode>verifyApiKey</ProseCode> needs to be readable by later
      middleware (rate limiting) and the route handler (policy, quota, logging) without re-verifying
      the key. Rather than relying on <ProseCode>H3Event.context</ProseCode> — which the codebase
      found didn't reliably survive Nitro's typing/module augmentation in this setup — the gateway
      keys a <ProseCode>WeakMap&lt;Request, { application?, requestId? }&gt;</ProseCode> off the
      underlying <ProseCode>Request</ProseCode> object directly
      (<ProseCode>server/utils/request-context.ts</ProseCode>). It's a small, deliberate deviation
      from the "just use <ProseCode>event.context</ProseCode>" default, scoped to exactly this
      problem.
    </p>

    <ProseH2 id="error-responses-never-leak-internals"
      >Error responses never leak internals</ProseH2
    >
    <p>
      Every error the gateway can throw — auth, validation, quota, provider failures, unexpected
      exceptions — passes through one central error handler
      (<ProseCode>server/utils/error-handler.ts</ProseCode>) that emits a single envelope shape:
    </p>
    <CodeBlock
      language="json"
      filename="json"
      :code="errorEnvelope"
    />
    <p>
      An error not explicitly thrown as a <ProseCode>LatticeError</ProseCode> (i.e. any unhandled
      exception) has its <ProseCode>message</ProseCode> replaced with the generic
      <ProseCode>"Internal server error"</ProseCode> before it reaches the client — stack traces and
      internal error text never escape the process. See
      <ProseA href="/api-reference/errors">Errors</ProseA> for the full code table.
    </p>

    <ProseH2 id="summary-of-the-two-trust-tiers">Summary of the two trust tiers</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh>Application key (<ProseCode>lattice_sk_…</ProseCode>)</ProseTh>
          <ProseTh>Management key</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Table</ProseTd>
          <ProseTd><ProseCode>api_keys</ProseCode></ProseTd>
          <ProseTd><ProseCode>management_api_keys</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Scoped to</ProseTd>
          <ProseTd>One <ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd>Nothing — administers the whole gateway</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Grants</ProseTd>
          <ProseTd><ProseCode>/v1/**</ProseCode>, subject to that application's policy</ProseTd>
          <ProseTd
            ><ProseCode>/v1/**</ProseCode> is <em>not</em> granted;
            <ProseCode>/management/v1/**</ProseCode> only</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd>Revocation</ProseTd>
          <ProseTd
            >Per-key, or all-at-once via <ProseCode>applications.disabled_at</ProseCode></ProseTd
          >
          <ProseTd>Per-key</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Typical holder</ProseTd>
          <ProseTd>A company application's backend</ProseTd>
          <ProseTd>The dashboard's server, or an admin script</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
  </DocPage>
</template>
