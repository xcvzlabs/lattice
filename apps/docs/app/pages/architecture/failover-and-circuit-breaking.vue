<script setup lang="ts">
  definePageMeta({
    docs: {
      section: 'Architecture',
      sectionOrder: 2,
      title: 'Failover & Circuit Breaking',
      order: 4,
    },
  });

  useSeoMeta({
    title: 'Failover & Circuit Breaking',
    description:
      'The per-provider circuit breaker state machine, retry rules, and multi-instance sync.',
  });

  const diagram = `stateDiagram-v2
    [*] --> closed
    closed --> closed: success
    closed --> open: 5th consecutive failure
    open --> half_open: 30s cooldown elapses
    half_open --> closed: next attempt succeeds
    half_open --> half_open: next attempt fails`;
</script>

<template>
  <DocPage>
    <ProseH1 id="failover-circuit-breaking">Failover &amp; Circuit Breaking</ProseH1>
    <p>
      Each provider has its own in-memory circuit, per gateway process. Five consecutive failures
      opens it; a request against an open provider is skipped in favor of the next candidate, so a
      known-down provider doesn't eat a full timeout on every request.
    </p>

    <MermaidDiagram :code="diagram" />

    <ProseH2 id="thresholds">Thresholds</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Constant</ProseTh>
          <ProseTh>Value</ProseTh>
          <ProseTh>Meaning</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>FAILURE_THRESHOLD</ProseCode></ProseTd>
          <ProseTd><ProseCode>5</ProseCode></ProseTd>
          <ProseTd>Consecutive failures before a provider's circuit opens.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>COOLDOWN_MS</ProseCode></ProseTd>
          <ProseTd><ProseCode>30_000</ProseCode></ProseTd>
          <ProseTd
            >Time after opening before the circuit is treated as
            <ProseCode>half-open</ProseCode>.</ProseTd
          >
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      A success at any point resets <ProseCode>consecutiveFailures</ProseCode> to
      <ProseCode>0</ProseCode> and clears the open timestamp. A failure while already open does
      <strong>not</strong> reset the cooldown timer — it doesn't extend how long the provider stays
      skipped.
    </p>

    <Note>
      <ProseCode>half-open</ProseCode> is not specially filtered by dispatch — only
      <ProseCode>open</ProseCode>
      circuits are excluded from the candidate list. Once the cooldown elapses, the very next
      request that would have used that provider is the probe; if it succeeds, the circuit closes,
      and if it fails,
      <ProseCode>consecutiveFailures</ProseCode> keeps climbing and the circuit re-opens for another
      30 seconds.
    </Note>

    <ProseH2 id="what-counts-as-a-retryable-failure">What counts as a retryable failure</ProseH2>
    <p>
      A failed attempt only moves on to the next candidate — and only counts against the circuit —
      if the error is one of:
    </p>
    <ProseUl>
      <ProseLi
        >A <ProseCode>ProviderRequestError</ProseCode> with an HTTP status
        <ProseCode>&gt;= 500</ProseCode>.</ProseLi
      >
      <ProseLi
        >A timeout (<ProseCode>DOMException</ProseCode> named
        <ProseCode>TimeoutError</ProseCode>).</ProseLi
      >
      <ProseLi
        >A network-level failure (a plain <ProseCode>TypeError</ProseCode>, e.g. DNS failure or
        connection refused).</ProseLi
      >
    </ProseUl>
    <p>
      A 4xx from the provider is <strong>not</strong> retried: the request itself was malformed for
      that provider, and no other provider would accept it either. That failure is returned to the
      client immediately as-is, without touching the circuit.
    </p>

    <ProseH2 id="non-streaming-vs-streaming-retry-windows"
      >Non-streaming vs. streaming retry windows</ProseH2
    >
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh />
          <ProseTh>Timeout</ProseTh>
          <ProseTh>Failover window</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Non-streaming</ProseTd>
          <ProseTd>60 seconds per attempt</ProseTd>
          <ProseTd>Any retryable failure, for every candidate in the resolved order.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Streaming</ProseTd>
          <ProseTd>30-second <strong>idle</strong> timeout, reset on every chunk received</ProseTd>
          <ProseTd>
            Only before the first chunk is produced — see
            <ProseA
              href="/architecture/request-lifecycle#streaming-is-different-after-the-first-chunk"
            >
              Request Lifecycle </ProseA
            >.
          </ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      If every candidate for a model is <ProseCode>open</ProseCode> at once, the gateway tries the
      original declared order anyway rather than failing the request on its own bookkeeping — a
      stuck circuit breaker should never make things worse than having no circuit breaker at all.
    </p>

    <ProseH2 id="exhausting-all-candidates">Exhausting all candidates</ProseH2>
    <p>If every attempt in the resolved order fails:</p>
    <ProseUl>
      <ProseLi
        >More than one attempt was made → <ProseCode>502 all_providers_failed</ProseCode>.</ProseLi
      >
      <ProseLi
        >Only one candidate existed and it failed →
        <ProseCode>502 provider_error</ProseCode>.</ProseLi
      >
    </ProseUl>

    <ProseH2 id="multi-instance-sync">Multi-instance sync</ProseH2>
    <p>
      Circuit state and latency averages are process-local for reads (checking
      <ProseCode>currentState()</ProseCode>
      never does I/O on the request path), but the gateway is expected to run as more than one
      instance. A Nitro plugin (<ProseCode>plugins/state-sync.ts</ProseCode>) runs every 5 seconds:
    </p>
    <ProseOl>
      <ProseLi>
        <strong>Push</strong>: upsert this instance's locally-known circuit/latency state into
        <ProseCode>provider_circuit_state</ProseCode> /
        <ProseCode>provider_latency_state</ProseCode>.
      </ProseLi>
      <ProseLi>
        <strong>Pull</strong>: read every instance's rows back and merge — for circuit state, keep
        whichever of (local, remote) has the <strong>higher</strong>
        <ProseCode>consecutiveFailures</ProseCode>.
      </ProseLi>
    </ProseOl>
    <p>
      That merge policy is deliberately fail-open-to-caution: one instance's bad experience with a
      provider makes every instance cautious about it, but each instance still has to independently
      observe its own successes to fully close the circuit again. Sync failures are logged and
      swallowed — they never crash the process or block a request.
    </p>
  </DocPage>
</template>
