<script setup lang="ts">
  definePageMeta({
    docs: { section: 'API Reference', sectionOrder: 4, title: 'Rate Limits & Quotas', order: 5 },
  });

  useSeoMeta({
    title: 'Rate Limits & Quotas',
    description:
      'How per-minute rate limiting and monthly token quotas are enforced, per application.',
  });

  const windowExample = `const WINDOW_MS = 60_000
const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS)`;
</script>

<template>
  <DocPage>
    <ProseH1 id="rate-limits-quotas">Rate Limits &amp; Quotas</ProseH1>
    <p>
      Both are per-application policy, set via the
      <ProseA href="/management-api/applications">Management API</ProseA>
      (<ProseCode>rateLimitPerMinute</ProseCode>, <ProseCode>monthlyTokenQuota</ProseCode>).
      <ProseCode>null</ProseCode> means unlimited for either — enforcement is skipped entirely
      rather than checked against an infinite limit.
    </p>

    <ProseH2 id="rate-limiting">Rate limiting</ProseH2>
    <p>
      A fixed 60-second window counter, checked on every <ProseCode>/v1/**</ProseCode> request after
      authentication:
    </p>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="windowExample"
    />
    <p>
      The window is a clock-aligned bucket (e.g.
      <ProseCode>12:00:00</ProseCode>–<ProseCode>12:00:59</ProseCode>), not a rolling window from
      the first request. Each request atomically increments the counter for the application's
      current window and compares it to <ProseCode>rateLimitPerMinute</ProseCode>; exceeding it
      returns <ProseCode>429 rate_limit_exceeded</ProseCode> before the request reaches routing or
      dispatch. The counter resets automatically at the next window boundary — a new
      <ProseCode>(application_id, window_start)</ProseCode> row starts at <ProseCode>0</ProseCode>.
    </p>
    <Note>
      There is no <ProseCode>Retry-After</ProseCode> header today. On a <ProseCode>429</ProseCode>,
      the safe assumption is "retry after the current 60-second window elapses."
    </Note>

    <ProseH2 id="monthly-token-quota">Monthly token quota</ProseH2>
    <p>
      Enforced <em>before</em> dispatch, as a conservative reservation rather than a post-hoc check:
    </p>
    <ProseOl>
      <ProseLi>
        The request's likely token cost is estimated as
        <ProseCode>min(max_tokens ?? 4096, 4096)</ProseCode> — an upper bound, since the real cost
        is only known once the provider responds.
      </ProseLi>
      <ProseLi>
        That estimate is atomically reserved against the application's current-month counter, in the
        same conditional write used to check the limit — so two concurrent requests can't both read
        a stale "under quota" count and both proceed past a limit neither of them alone would have
        exceeded.
      </ProseLi>
      <ProseLi>
        If the reservation would exceed <ProseCode>monthlyTokenQuota</ProseCode>, the request fails
        immediately with <ProseCode>429 quota_exceeded</ProseCode> — no provider is ever called.
      </ProseLi>
      <ProseLi>
        If the request completes, the reservation is reconciled down to the real token usage the
        provider reported (refunding the difference between the estimate and the actual cost).
      </ProseLi>
      <ProseLi
        >If the request fails for any other reason after the reservation was taken, the full
        reservation is refunded.</ProseLi
      >
    </ProseOl>
    <p>
      The quota period is calendar-month, UTC. There's no rollover and no partial-month proration —
      a quota resets at the start of each month regardless of when in the previous month it was set.
    </p>

    <ProseH2 id="checking-current-usage">Checking current usage</ProseH2>
    <p>
      Both counters can be inspected without waiting for a <ProseCode>429</ProseCode> — see the
      <ProseA href="/management-api/usage-and-requests">Management API's usage endpoints</ProseA>
      for per-application and gateway-wide summaries, or the
      <ProseA href="/dashboard/features">Dashboard</ProseA> for a visual view.
    </p>

    <ProseH2 id="designing-a-client-around-these-limits"
      >Designing a client around these limits</ProseH2
    >
    <ProseUl>
      <ProseLi
        >Treat <ProseCode>429 rate_limit_exceeded</ProseCode> as retryable after a short backoff
        (the current window is at most 60 seconds).</ProseLi
      >
      <ProseLi>
        Treat <ProseCode>429 quota_exceeded</ProseCode> as <strong>not</strong> retryable by the
        client itself — it needs either a quota increase (an admin action) or to wait for the next
        calendar month.
      </ProseLi>
      <ProseLi>
        If your application makes bursty, high-<ProseCode>max_tokens</ProseCode> requests, expect
        the quota reservation's conservative estimate (capped at 4096) to sometimes reserve more
        than the request ends up actually costing; this is refunded automatically once the response
        completes, but a burst of concurrent requests can transiently reserve more than their
        eventual real total.
      </ProseLi>
    </ProseUl>
  </DocPage>
</template>
