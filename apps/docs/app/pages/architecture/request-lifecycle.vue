<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Architecture', sectionOrder: 2, title: 'Request Lifecycle', order: 2 },
  });

  useSeoMeta({
    title: 'Request Lifecycle',
    description: "Everything that happens between a client's request and the response it sees.",
  });

  const diagram = `sequenceDiagram
    participant App as Application
    participant GW as Gateway
    participant P1 as Primary provider
    participant P2 as Fallback provider
    participant DB as Postgres

    App->>GW: POST /v1/chat/completions
    GW->>GW: verify API key, check quota + rate limit
    GW->>GW: resolve model → candidate chain (registry, routing strategy, circuit state)
    GW->>P1: forward request
    P1--xGW: 5xx / timeout
    GW->>GW: record failure, maybe open circuit
    GW->>P2: retry with fallback model
    P2-->>GW: 200 + completion
    GW-->>App: response
    GW--)DB: usage + request log (fire-and-forget)`;
</script>

<template>
  <DocPage>
    <ProseH1 id="request-lifecycle">Request Lifecycle</ProseH1>
    <p>
      A chat completion is authenticated, checked against quota, routed to a candidate provider
      chain, and logged — without any of that bookkeeping blocking the response the client sees.
    </p>

    <MermaidDiagram :code="diagram" />

    <ProseH2 id="step-by-step">Step by step</ProseH2>
    <ProseOl>
      <ProseLi>
        <strong>Request ID</strong> (<ProseCode>middleware/01.request-id.ts</ProseCode>) — every
        incoming request is stamped with a server-generated
        <ProseCode>Bun.randomUUIDv7()</ProseCode>, stored in a per-<ProseCode>Request</ProseCode>
        context (see
        <ProseA href="/architecture/security#request-context-storage">Security</ProseA>), used to
        correlate structured log lines.
      </ProseLi>
      <ProseLi>
        <strong>Auth</strong> (<ProseCode>middleware/02.auth.ts</ProseCode>,
        <ProseCode>/v1/**</ProseCode> only) — the
        <ProseCode>authorization: Bearer &lt;key&gt;</ProseCode> header is required. Missing →
        <ProseCode>401 missing_api_key</ProseCode>. The key is hashed and looked up; no match, or
        the owning application is disabled → <ProseCode>401 invalid_api_key</ProseCode>. On success,
        the resolved <ProseCode>Application</ProseCode> row is attached to the request context.
      </ProseLi>
      <ProseLi>
        <strong>Rate limit</strong> (<ProseCode>middleware/03.rate-limit.ts</ProseCode>,
        <ProseCode>/v1/**</ProseCode> only) — if the application has a
        <ProseCode>rateLimitPerMinute</ProseCode>, a fixed 60-second window counter is incremented;
        exceeding it → <ProseCode>429 rate_limit_exceeded</ProseCode>. See
        <ProseA href="/api-reference/rate-limits-and-quotas">Rate Limits &amp; Quotas</ProseA>.
      </ProseLi>
      <ProseLi>
        <strong>Body validation</strong> — the JSON body is parsed and validated against
        <ProseCode>chatCompletionRequestSchema</ProseCode> (a Valibot
        <ProseCode>strictObject</ProseCode>, so unrecognized fields like
        <ProseCode>tools</ProseCode> are rejected outright rather than silently ignored). Failure →
        <ProseCode>400 invalid_request</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>Model permission</strong> (<ProseCode>utils/policy.ts</ProseCode>) — if the
        application has an <ProseCode>allowedModels</ProseCode> list, the raw
        <ProseCode>model</ProseCode> string from the request must be in it (checked before alias
        resolution). Violation → <ProseCode>403 model_not_permitted</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>Quota reservation</strong> (<ProseCode>utils/quota.ts</ProseCode>) — if the
        application has a <ProseCode>monthlyTokenQuota</ProseCode>, an upper-bound token estimate
        (<ProseCode>min(max_tokens ?? 4096, 4096)</ProseCode>) is atomically reserved against the
        current month's counter in the same conditional database write used to check it, so
        concurrent requests can't all pass a stale check. Exceeded →
        <ProseCode>429 quota_exceeded</ProseCode>. The reservation is refunded on failure and
        reconciled down to real usage once the provider responds.
      </ProseLi>
      <ProseLi>
        <strong>Dispatch</strong> — resolve the model to a candidate provider chain (registry order,
        filtered by circuit state, reordered by the application's routing strategy) and attempt each
        in order. See
        <ProseA href="/architecture/model-registry-and-routing"
          >Model Registry &amp; Routing</ProseA
        >
        and
        <ProseA href="/architecture/failover-and-circuit-breaking"
          >Failover &amp; Circuit Breaking</ProseA
        >.
      </ProseLi>
      <ProseLi>
        <strong>Response</strong> — the client gets its response (or a final error) as soon as
        dispatch resolves.
      </ProseLi>
      <ProseLi>
        <strong>Background logging</strong> — usage accounting and the request log row are written
        <em>after</em> the response is already on its way to the client, wrapped so a logging
        failure can never surface as a client-visible error.
      </ProseLi>
    </ProseOl>

    <Note>
      Only 5xx, timeout, and connection failures trigger a fallback attempt. A 4xx from the provider
      means the request itself was bad, and retrying it against a different provider wouldn't fix
      that — that failure is returned to the client immediately.
    </Note>

    <ProseH2 id="streaming-is-different-after-the-first-chunk"
      >Streaming is different after the first chunk</ProseH2
    >
    <p>
      For <ProseCode>stream: true</ProseCode> requests, failover can only happen
      <strong>before the first chunk</strong>
      reaches the client. The gateway pulls exactly one chunk from a candidate before committing to
      it: if the provider fails to produce even one chunk, that counts as a retryable failure and
      the next candidate is tried. Once a chunk has been sent to the client, the connection is
      committed — a failure from that point just ends the stream, since content already delivered
      can't be un-sent or silently replaced by a different provider's answer.
    </p>

    <ProseH2 id="everything-downstream-of-dispatch-is-fire-and-forget">
      Everything downstream of dispatch is fire-and-forget
    </ProseH2>
    <p>
      Recording usage (<ProseCode>recordUsage</ProseCode>) and the request log entry
      (<ProseCode>recordRequestLog</ProseCode>) both happen in
      <ProseCode>void (async () =&gt; { ... })()</ProseCode> blocks wrapped in their own
      <ProseCode>try</ProseCode>/<ProseCode>catch</ProseCode>. This is a deliberate reliability
      property: a Postgres hiccup while writing observability data must never turn into a 500 for a
      request that otherwise succeeded.
    </p>
  </DocPage>
</template>
