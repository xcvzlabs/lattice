<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Architecture', sectionOrder: 2, title: 'Data Model', order: 5 },
  });

  useSeoMeta({
    title: 'Data Model',
    description:
      "Every table in the gateway's Postgres database, its columns, and why it's shaped that way.",
  });

  const diagram = `erDiagram
    applications ||--o{ api_keys : issues
    applications ||--o{ usage_records : generates
    applications ||--o{ request_logs : generates
    applications ||--o{ application_usage_counters : tracked_by
    applications ||--o{ rate_limit_counters : tracked_by

    applications {
        uuid id PK
        text name
        int monthly_token_quota "null = unlimited"
        int rate_limit_per_minute "null = unlimited"
        text_array allowed_models "null = unrestricted"
        enum routing_strategy "cost | latency | balanced | null"
        timestamp disabled_at
    }
    api_keys {
        uuid id PK
        uuid application_id FK
        text key_hash
        text key_prefix
        timestamp revoked_at
        timestamp last_used_at
    }
    usage_records {
        uuid id PK
        uuid application_id FK
        text model
        text provider
        int prompt_tokens
        int completion_tokens
    }
    request_logs {
        uuid id PK
        uuid application_id FK
        text model
        text provider "null if failed before routing"
        enum status "success | error"
        int http_status
        int attempts
        int latency_ms
        numeric estimated_cost_usd
    }
    management_api_keys {
        uuid id PK
        text key_hash
        timestamp revoked_at
    }`;
</script>

<template>
  <DocPage>
    <ProseH1 id="data-model">Data Model</ProseH1>
    <MermaidDiagram :code="diagram" />

    <ProseH2 id="tables">Tables</ProseH2>

    <ProseH3 id="applications">
      <ProseCode>applications</ProseCode>
    </ProseH3>
    <p>The unit of tenancy. Every row doubles as its own policy document.</p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
          <ProseTh>Meaning</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, PK</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>name</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>created_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode></ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>monthly_token_quota</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, nullable</ProseTd>
          <ProseTd>
            <ProseCode>null</ProseCode> = unlimited. Enforced by
            <ProseA href="/architecture/request-lifecycle#step-by-step">quota reservation</ProseA>.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>rate_limit_per_minute</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, nullable</ProseTd>
          <ProseTd
            ><ProseCode>null</ProseCode> = unlimited. Enforced by the fixed-window rate
            limiter.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>allowed_models</ProseCode></ProseTd>
          <ProseTd><ProseCode>text[]</ProseCode>, nullable</ProseTd>
          <ProseTd>
            <ProseCode>null</ProseCode> = unrestricted. Checked against the raw requested model
            name, before alias resolution.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>routing_strategy</ProseCode></ProseTd>
          <ProseTd><ProseCode>enum('cost','latency','balanced')</ProseCode>, nullable</ProseTd>
          <ProseTd><ProseCode>null</ProseCode> = use the registry's declared order.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>disabled_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode>, nullable</ProseTd>
          <ProseTd>
            Set it, and every one of the application's API keys stops working immediately — no need
            to revoke them individually.
          </ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="api_keys">
      <ProseCode>api_keys</ProseCode>
    </ProseH3>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
          <ProseTh>Meaning</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, PK</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>uuid</ProseCode>, FK → <ProseCode>applications.id</ProseCode></ProseTd
          >
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>key_hash</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
          <ProseTd>
            HMAC-SHA256 of the raw key, never the key itself. See
            <ProseA href="/architecture/security">Security</ProseA>.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>key_prefix</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
          <ProseTd>
            First 23 characters of the issued key (<ProseCode>lattice_sk_</ProseCode> + 12 chars),
            safe to display in a UI so an admin can recognize a key without ever seeing it in full
            again.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>revoked_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode>, nullable</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>last_used_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode>, nullable</ProseTd>
          <ProseTd>Best-effort touched on every successful auth.</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="usage_records">
      <ProseCode>usage_records</ProseCode>
    </ProseH3>
    <p>
      One row per completed request that produced token counts — the raw ledger
      <ProseCode>application_usage_counters</ProseCode> is a running aggregate of.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, PK</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, FK</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>model</ProseCode>, <ProseCode>provider</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd
            ><ProseCode>prompt_tokens</ProseCode>, <ProseCode>completion_tokens</ProseCode></ProseTd
          >
          <ProseTd><ProseCode>integer</ProseCode>, nullable</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>created_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="application_usage_counters">
      <ProseCode>application_usage_counters</ProseCode>
    </ProseH3>
    <p>
      A running total per application per calendar month, keyed by
      <ProseCode>(application_id, period_start)</ProseCode>. Exists so a quota check is a
      <strong>single row read</strong>, not a scan over <ProseCode>usage_records</ProseCode>.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, FK — part of composite PK</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>period_start</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>timestamptz</ProseCode> — month start (UTC), part of composite PK</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>tokens_used</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, default <ProseCode>0</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>requests_used</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, default <ProseCode>0</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="rate_limit_counters">
      <ProseCode>rate_limit_counters</ProseCode>
    </ProseH3>
    <p>
      The same "single row read" idea, for the 60-second rate-limit window instead of the monthly
      quota.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, FK — part of composite PK</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>window_start</ProseCode></ProseTd>
          <ProseTd
            ><ProseCode>timestamptz</ProseCode> — floored to the current 60s window, part of
            composite PK</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>request_count</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, default <ProseCode>0</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="request_logs">
      <ProseCode>request_logs</ProseCode>
    </ProseH3>
    <p>
      Append-only observability history, written best-effort so a logging failure never affects the
      client response — see
      <ProseA
        href="/architecture/request-lifecycle#everything-downstream-of-dispatch-is-fire-and-forget"
      >
        Request Lifecycle </ProseA
      >.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
          <ProseTh>Meaning</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, PK</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>application_id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, FK</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>request_id</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
          <ProseTd
            >Server-generated <ProseCode>Bun.randomUUIDv7()</ProseCode>, correlates with structured
            logs.</ProseTd
          >
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>model</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
          <ProseTd>The requested model name, as sent by the client.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>provider</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode>, nullable</ProseTd>
          <ProseTd>
            <ProseCode>null</ProseCode> if the request failed before routing resolved a provider
            (e.g. bad model name, quota exceeded).
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>status</ProseCode></ProseTd>
          <ProseTd><ProseCode>enum('success','error')</ProseCode></ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>http_status</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode></ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>error_code</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode>, nullable</ProseTd>
          <ProseTd>
            A <ProseCode>LatticeErrorCode</ProseCode> — see
            <ProseA href="/api-reference/errors">Errors</ProseA>.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>attempts</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode></ProseTd>
          <ProseTd>How many providers were tried.</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>latency_ms</ProseCode></ProseTd>
          <ProseTd><ProseCode>integer</ProseCode></ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd>
            <ProseCode>prompt_tokens</ProseCode>, <ProseCode>completion_tokens</ProseCode>,
            <ProseCode>total_tokens</ProseCode>
          </ProseTd>
          <ProseTd><ProseCode>integer</ProseCode>, nullable</ProseTd>
          <ProseTd />
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>estimated_cost_usd</ProseCode></ProseTd>
          <ProseTd><ProseCode>numeric(12,6)</ProseCode>, nullable</ProseTd>
          <ProseTd>
            See
            <ProseA href="/architecture/model-registry-and-routing#cost-estimation"
              >cost estimation</ProseA
            >.
          </ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>created_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode></ProseTd>
          <ProseTd
            >Indexed alongside <ProseCode>application_id</ProseCode> for the management API's
            paginated request log.</ProseTd
          >
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="management_api_keys">
      <ProseCode>management_api_keys</ProseCode>
    </ProseH3>
    <p>
      Structurally similar to <ProseCode>api_keys</ProseCode>, but with
      <strong>no foreign key to <ProseCode>applications</ProseCode></strong> — a management key
      authorizes the gateway's own admin surface, not any one application's traffic.
    </p>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Column</ProseTh>
          <ProseTh>Type</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd><ProseCode>id</ProseCode></ProseTd>
          <ProseTd><ProseCode>uuid</ProseCode>, PK</ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>name</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>key_hash</ProseCode>, <ProseCode>key_prefix</ProseCode></ProseTd>
          <ProseTd><ProseCode>text</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd><ProseCode>revoked_at</ProseCode>, <ProseCode>last_used_at</ProseCode></ProseTd>
          <ProseTd><ProseCode>timestamptz</ProseCode>, nullable</ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>

    <ProseH3 id="provider_circuit_state-provider_latency_state">
      <ProseCode>provider_circuit_state</ProseCode> / <ProseCode>provider_latency_state</ProseCode>
    </ProseH3>
    <p>
      Not shown on the ERD above (they have no relationship to <ProseCode>applications</ProseCode>)
      — these are the Postgres-backed sync points for the in-memory
      <ProseA href="/architecture/failover-and-circuit-breaking#multi-instance-sync">
        circuit breaker and latency tracker </ProseA
      >, keyed by <ProseCode>provider</ProseCode> and <ProseCode>model_id</ProseCode> respectively.
    </p>

    <ProseH2 id="migrations">Migrations</ProseH2>
    <p>
      The gateway uses
      <ProseA href="https://orm.drizzle.team/kit-docs/overview">Drizzle Kit</ProseA> against
      <ProseCode>server/database/schema.ts</ProseCode>. See
      <ProseA href="/development/database-and-migrations">Database &amp; Migrations</ProseA> for the
      day-to-day workflow.
    </p>
  </DocPage>
</template>
