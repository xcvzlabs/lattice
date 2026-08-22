<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Management API', sectionOrder: 5, title: 'Usage & Requests', order: 4 },
  });

  useSeoMeta({
    title: 'Usage & Requests',
    description: 'Aggregate usage summaries and the paginated request log.',
  });

  const usageResponse = `{
  "data": [
    { "day": "2026-08-20", "requests": 412, "totalTokens": 812_400, "estimatedCostUsd": 6.13 },
    { "day": "2026-08-21", "requests": 389, "totalTokens": 795_100, "estimatedCostUsd": 5.94 }
  ]
}`;

  const requestLogResponse = `{
  "data": [
    {
      "id": "...",
      "applicationId": "...",
      "requestId": "0199...",
      "model": "gpt-4o",
      "provider": "openai",
      "status": "success",
      "httpStatus": 200,
      "errorCode": null,
      "attempts": 1,
      "latencyMs": 842,
      "promptTokens": 41,
      "completionTokens": 118,
      "totalTokens": 159,
      "estimatedCostUsd": 0.001283,
      "createdAt": "2026-08-21T09:14:02.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}`;

  const failuresExample = `curl "$GATEWAY/management/v1/requests?applicationId=$APP_ID&status=error&since=2026-08-14T00:00:00Z" \\
  -H "authorization: Bearer $MANAGEMENT_KEY"`;

  const modelTrafficExample = `curl "$GATEWAY/management/v1/requests?model=gpt-4o" \\
  -H "authorization: Bearer $MANAGEMENT_KEY"`;

  const spendExample = `curl "$GATEWAY/management/v1/usage?days=30" \\
  -H "authorization: Bearer $MANAGEMENT_KEY"`;
</script>

<template>
  <DocPage>
    <ProseH1 id="usage-requests">Usage & Requests</ProseH1>

    <ProseH2 id="usage-summary">Usage summary</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/usage?days=30
GET /management/v1/applications/{id}/usage?days=30"
    />
    <p>
      <ProseCode>days</ProseCode> is optional, an integer from <ProseCode>1</ProseCode> to
      <ProseCode>365</ProseCode>, defaulting to <ProseCode>30</ProseCode>. Out of range →
      <ProseCode>400 invalid_request</ProseCode>.
    </p>
    <CodeBlock
      language="json"
      filename="json"
      :code="usageResponse"
    />
    <p>
      One row per day in the lookback window. The top-level <ProseCode>/usage</ProseCode> endpoint
      aggregates across every application; the per-application variant scopes to one.
      <ProseCode>estimatedCostUsd</ProseCode> sums
      <ProseA href="/architecture/model-registry-and-routing#cost-estimation"
        >per-request cost estimates</ProseA
      >
      — days with requests against models that have no configured
      <ProseCode>pricing</ProseCode> will under-report cost for that slice.
    </p>

    <ProseH2 id="request-log">Request log</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/requests"
    />
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Query param</ProseTh>
          <ProseTh>Type</ProseTh>
          <ProseTh>Default</ProseTh>
          <ProseTh>Notes</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>applicationId</ProseCode></ProseTd>
          <ProseTd>string</ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Filter to one application.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>model</ProseCode></ProseTd>
          <ProseTd>string</ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Filter to one requested model name.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>provider</ProseCode></ProseTd>
          <ProseTd>string</ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Filter to one provider id.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>status</ProseCode></ProseTd>
          <ProseTd><ProseCode>'success' | 'error'</ProseCode></ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Invalid value → <ProseCode>400 invalid_request</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>since</ProseCode></ProseTd>
          <ProseTd>ISO date string</ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Invalid date → <ProseCode>400 invalid_request</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>until</ProseCode></ProseTd>
          <ProseTd>ISO date string</ProseTd>
          <ProseTd>—</ProseTd>
          <ProseTd>Invalid date → <ProseCode>400 invalid_request</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>limit</ProseCode></ProseTd>
          <ProseTd>integer, 1–200</ProseTd>
          <ProseTd>50</ProseTd>
          <ProseTd>Out of range → <ProseCode>400 invalid_request</ProseCode>.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>offset</ProseCode></ProseTd>
          <ProseTd>integer, >= 0</ProseTd>
          <ProseTd>0</ProseTd>
          <ProseTd>Negative → <ProseCode>400 invalid_request</ProseCode>.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <CodeBlock
      language="json"
      filename="json"
      :code="requestLogResponse"
    />
    <p>
      <ProseCode>provider</ProseCode> is <ProseCode>null</ProseCode> when a request failed before
      routing resolved one (e.g. an unknown model, or a quota/rate-limit rejection) — there's
      nothing to attribute the failure to yet. <ProseCode>errorCode</ProseCode> mirrors the
      <ProseA href="/api-reference/errors#every-error-code">LatticeErrorCode</ProseA> the client
      would have received.
    </p>

    <ProseH2 id="paging-through-results">Paging through results</ProseH2>
    <CodeBlock
      language="http"
      filename="http"
      code="GET /management/v1/requests?limit=50&offset=0
GET /management/v1/requests?limit=50&offset=50"
    />
    <p>
      <ProseCode>limit</ProseCode>/<ProseCode>offset</ProseCode> are echoed back in the response so
      a client can compute whether it's reached the end (<ProseCode
        >data.length &lt; limit</ProseCode
      >) without a separate total-count field.
    </p>

    <ProseH2 id="common-queries">Common queries</ProseH2>
    <CodeGroup>
      <CodeBlock
        language="bash"
        filename="Failures for one application, last 7 days"
        :code="failuresExample"
      />
      <CodeBlock
        language="bash"
        filename="All traffic against one model"
        :code="modelTrafficExample"
      />
      <CodeBlock
        language="bash"
        filename="30-day spend for the whole gateway"
        :code="spendExample"
      />
    </CodeGroup>
  </DocPage>
</template>
