<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Deployment', sectionOrder: 8, title: 'Production Guide', order: 2 },
  });

  useSeoMeta({
    title: 'Production Guide',
    description: 'What to get right before running Lattice for real traffic.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="production-guide">Production Guide</ProseH1>

    <ProseH2 id="runtime-target">Runtime target</ProseH2>
    <p>
      The gateway's <ProseCode>nitro.config.ts</ProseCode> sets
      <ProseCode>preset: 'bun'</ProseCode> — it's built and run as a Bun server, not deployed
      through a different Nitro preset (Node, serverless, edge) without re-evaluating whether the
      <ProseCode>bun</ProseCode>-specific bits (native <ProseCode>Bun.randomUUIDv7()</ProseCode>,
      <ProseCode>drizzle-orm/bun-sql</ProseCode>) still apply. The dashboard is a standard Nuxt 4
      app and can follow
      <ProseA href="https://nuxt.com/docs/getting-started/deployment"
        >Nuxt's own deployment guidance</ProseA
      >
      for whichever target you choose.
    </p>

    <ProseH2 id="before-going-live">Before going live</ProseH2>
    <FieldGroup>
      <Field
        name="Pepper"
        type="generated once, backed up"
      >
        <ProseCode>API_KEY_PEPPER</ProseCode> must be stable across every gateway instance and every
        restart — rotating it invalidates every issued key. Store it in a secrets manager, not a
        <ProseCode>.env</ProseCode> file on a single box. See
        <ProseA href="/architecture/security#storage-hash-not-the-key">Security</ProseA>.
      </Field>
      <Field
        name="Model registry"
        type="reviewed"
      >
        The shipped <ProseCode>models.config.ts</ProseCode> is a Phase 1 starter, not a fixed
        catalog — confirm the models, fallback chains, and pricing match what you actually want to
        expose before shipping. See
        <ProseA href="/architecture/model-registry-and-routing">Model Registry &amp; Routing</ProseA
        >.
      </Field>
      <Field
        name="Provider credentials"
        type="scoped and rotated"
      >
        Every cloud provider key referenced by the registry needs to be present, valid, and on your
        organization's normal credential-rotation schedule.
      </Field>
      <Field
        name="Database"
        type="migrated, backed up"
      >
        Both the gateway's and the dashboard's databases need migrations applied (<ProseCode
          >bun run db:migrate</ProseCode
        >
        in each app) and a backup policy — the gateway's holds every application's policy and API
        key hashes; losing it without a backup means re-provisioning every application.
      </Field>
      <Field
        name="Management key"
        type="issued and restricted"
      >
        Mint at least one management key for the dashboard; treat it with the same care as a root
        credential — see
        <ProseA href="/dashboard/setup-and-auth#the-flat-single-tenant-trust-model"
          >Dashboard trust model</ProseA
        >.
      </Field>
    </FieldGroup>

    <ProseH2 id="running-multiple-gateway-instances">Running multiple gateway instances</ProseH2>
    <p>
      The gateway is designed to run as more than one process: the
      <ProseA href="/architecture/failover-and-circuit-breaking#multi-instance-sync"
        >circuit breaker and latency tracker</ProseA
      >
      sync their in-memory state through Postgres every 5 seconds specifically so multiple instances
      converge on the same view of provider health without a shared cache like Redis. Put a load
      balancer in front of as many gateway instances as you need; no instance holds state that isn't
      either in Postgres or reconstructible from it.
    </p>

    <ProseH2 id="graceful-shutdown">Graceful shutdown</ProseH2>
    <p>
      <ProseCode>plugins/shutdown.ts</ProseCode> closes the database connection pool on Nitro's
      <ProseCode>close</ProseCode> lifecycle hook, relying on the <ProseCode>bun</ProseCode> preset
      to drain in-flight requests and SSE streams first. Send whatever signal your process manager
      uses for graceful shutdown (not <ProseCode>SIGKILL</ProseCode>) and give it a few seconds
      before forcing termination, especially if long-running streaming requests are common.
    </p>

    <ProseH2 id="observability">Observability</ProseH2>
    <p>
      Every request — success or failure — produces a <ProseCode>request_logs</ProseCode> row
      queryable through the
      <ProseA href="/management-api/usage-and-requests">management API</ProseA> or the
      <ProseA href="/dashboard/features">dashboard</ProseA>. The gateway also uses
      <ProseA href="https://www.npmjs.com/package/evlog">evlog</ProseA> for structured process logs
      (<ProseCode>plugins/evlog.ts</ProseCode>), initialized directly rather than through evlog's
      own Nitro module integration, specifically to avoid overriding the gateway's OpenAI-compatible
      error envelope — see <ProseA href="/api-reference/errors">Errors</ProseA>.
    </p>

    <ProseH2 id="rotating-the-pepper-disaster-scenario-only"
      >Rotating the pepper (disaster scenario only)</ProseH2
    >
    <p>
      Rotating <ProseCode>API_KEY_PEPPER</ProseCode> is destructive by design — see
      <ProseA href="/architecture/security#storage-hash-not-the-key">Security</ProseA>. Only do it
      if you believe the pepper itself has been compromised. It invalidates every issued application
      and management key simultaneously; plan for re-issuing keys to every application before
      rotating, not after.
    </p>
  </DocPage>
</template>
