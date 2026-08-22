<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Dashboard', sectionOrder: 6, title: 'Setup & Auth', order: 2 },
  });

  useSeoMeta({
    title: 'Setup & Auth',
    description:
      "Environment configuration, the better-auth session model, and the dashboard's trust model.",
  });

  const envExample = `# apps/dashboard/.env
NUXT_BETTER_AUTH_SECRET=<openssl rand -base64 32>
LATTICE_GATEWAY_URL=http://localhost:3001
LATTICE_MANAGEMENT_API_KEY=<from \`bun run gateway seed-management-key <name>\`>
DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_SSL=... DB_DATABASE=...`;

  const runExample = `cd apps/dashboard
bun run db:migrate
bun run dev   # :3000 by default`;

  const sessionConfig = `session: {
  expiresIn: 12 * 3600, // 12 hours
  updateAge: 3600,      // refreshed hourly while active
}`;

  const cookieConfig = `advanced: {
  useSecureCookies: process.env.NODE_ENV === 'production',
}`;
</script>

<template>
  <DocPage>
    <ProseH1 id="setup-auth">Setup &amp; Auth</ProseH1>

    <ProseH2 id="environment">Environment</ProseH2>
    <CodeBlock
      language="bash"
      filename="bash"
      :code="envExample"
    />
    <p>
      <ProseCode>LATTICE_MANAGEMENT_API_KEY</ProseCode> and
      <ProseCode>LATTICE_GATEWAY_URL</ProseCode> are read only on the server
      (<ProseCode>server/utils/env.ts</ProseCode>,
      <ProseCode>server/utils/gateway-client.ts</ProseCode>) and never sent to the browser.
      <ProseCode>DB_*</ProseCode> points at the dashboard's <strong>own</strong> Postgres database —
      used exclusively for better-auth's user/session/account tables, entirely separate from the
      gateway's database. See
      <ProseA href="/deployment/configuration-reference">Configuration Reference</ProseA>
      for the full variable list.
    </p>
    <CodeBlock
      language="bash"
      filename="bash"
      :code="runExample"
    />

    <ProseH2 id="sign-in">Sign-in</ProseH2>
    <p>
      Email/password only (<ProseCode>emailAndPassword: { enabled: true }</ProseCode> — no
      social/OAuth providers configured). The login page (<ProseCode>/login</ProseCode>) is
      guest-gated (<ProseCode>definePageMeta({ auth: 'guest' })</ProseCode>); every other page
      requires an authenticated session (<ProseCode>definePageMeta({ auth: 'user' })</ProseCode>),
      enforced both client-side by route meta and server-side — every
      <ProseCode>server/api/**</ProseCode> handler calls
      <ProseCode>requireUserSession(event)</ProseCode> before doing anything else.
    </p>

    <ProseH2 id="session-lifetime">Session lifetime</ProseH2>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="sessionConfig"
    />
    <p>Deliberately short. See the next section for why.</p>

    <ProseH2 id="secure-cookies">Secure cookies</ProseH2>
    <CodeBlock
      language="ts"
      filename="ts"
      :code="cookieConfig"
    />
    <p>
      This is explicit even though it matches better-auth's own default — a guard against that
      upstream default silently changing in a future version, not a behavior change from the
      library's out-of-the-box setting.
    </p>

    <ProseH2 id="the-flat-single-tenant-trust-model">The flat, single-tenant trust model</ProseH2>
    <p>
      This is the security property worth understanding before provisioning dashboard accounts:
      <strong>every dashboard session is full admin over every application.</strong> There are no
      per-user roles, no per-application scoping, no read-only accounts. Signing in grants the same
      access the management API key itself grants — the dashboard is, architecturally, just a UI
      over that one key, shared by every signed-in user.
    </p>
    <p>
      This is why the session lifetime is short (12 hours, hourly-refreshed) rather than the
      weeks-long default many admin tools use: a stolen dashboard session is equivalent to a stolen
      management key for as long as it's valid, so limiting that window is the primary mitigation
      available at this layer. If your organization needs per-admin scoping or audit trails
      distinguishing <em>which</em> admin took an action, that isn't modeled today — every write the
      dashboard makes to the gateway is indistinguishable from any other admin's, since the gateway
      itself only sees "a valid management key," not which dashboard user was signed in.
    </p>
    <Warning>
      Treat "who has a dashboard account" with the same care as "who holds the management API key."
      There's no lesser tier to grant someone who should only be able to, say, view usage — they'd
      get full application/key management too.
    </Warning>

    <ProseH2 id="what-the-dashboards-database-actually-stores"
      >What the dashboard's database actually stores</ProseH2
    >
    <p>
      Four tables, all better-auth's own core schema (not custom to this project):
      <ProseCode>user</ProseCode>, <ProseCode>session</ProseCode>,
      <ProseCode>account</ProseCode> (holds the hashed password for email/password auth),
      <ProseCode>verification</ProseCode>. Nothing about applications, API keys, usage, or request
      logs lives here — that's all on the gateway's side, fetched live through
      <ProseCode>gatewayFetch</ProseCode> on every page load.
    </p>
  </DocPage>
</template>
