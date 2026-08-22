<script setup lang="ts">
  const { sections } = useDocsNavigation();

  const sectionBlurbs = [
    { title: 'Getting Started', blurb: 'Install, seed keys, first request.' },
    { title: 'Architecture', blurb: 'Request lifecycle, routing, security.' },
    { title: 'Providers', blurb: 'Cloud and self-hosted backends.' },
    { title: 'API Reference', blurb: 'Auth, completions, errors, limits.' },
    { title: 'Management API', blurb: 'Applications, keys, usage.' },
    { title: 'Dashboard', blurb: 'Setup, auth, feature tour.' },
    { title: 'Development', blurb: 'Standards, testing, packages.' },
    { title: 'Deployment', blurb: 'Configuration and production guide.' },
  ];

  function blurbFor(title: string): string {
    return sectionBlurbs.find((entry) => entry.title === title)?.blurb ?? '';
  }

  const gettingStartedPath = computed(() => sections.value[0]?.items[0]?.path ?? '/');
  const apiReferencePath = computed(
    () =>
      sections.value.find((section) => section.title === 'API Reference')?.items[0]?.path ?? '/',
  );

  const capabilities = [
    {
      number: '01',
      title: 'One API',
      tag: 'OpenAI-compatible',
      body: 'A single /v1/chat/completions endpoint fronts five providers. Swap or add a provider without touching client code.',
    },
    {
      number: '02',
      title: 'Failover',
      tag: 'Automatic',
      body: 'Five consecutive failures opens a per-provider circuit; requests route around it until a 30-second cooldown elapses.',
    },
    {
      number: '03',
      title: 'Policy',
      tag: 'Per application',
      body: 'Model allowlists, monthly token quotas, per-minute rate limits, and routing strategy are enforced on every request.',
    },
    {
      number: '04',
      title: 'Observability',
      tag: 'Built-in',
      body: 'Every request is logged with provider, latency, attempts, and estimated cost — queryable through the dashboard.',
    },
  ];

  useSeoMeta({
    description:
      'Centralized AI infrastructure for connecting applications to cloud and self-hosted models.',
  });
</script>

<template>
  <div>
    <section class="mx-auto max-w-[1440px] px-6 pt-20 pb-16 sm:px-10 sm:pt-24">
      <div class="text-ink-muted mb-6 font-mono text-xs font-semibold tracking-widest uppercase">
        Internal AI Gateway &#8212; Documentation
      </div>
      <h1 class="mb-7 text-6xl leading-[0.95] font-black tracking-tight uppercase sm:text-8xl">
        Lattice
      </h1>
      <p class="text-ink-muted mb-10 max-w-2xl text-lg leading-relaxed">
        One OpenAI-compatible API fronting five providers. The gateway holds provider credentials,
        decides which one handles a request, retries a fallback when one fails, and records what
        happened &#8212; without any of that bookkeeping blocking the response a client sees.
      </p>
      <div class="mb-14 flex flex-wrap gap-4">
        <NuxtLink
          :to="gettingStartedPath"
          class="border-ink bg-ink text-bg border px-6 py-3.5 font-mono text-xs font-bold tracking-wide uppercase"
        >
          Get Started &#8594;
        </NuxtLink>
        <NuxtLink
          :to="apiReferencePath"
          class="border-border-strong text-ink border px-6 py-3.5 font-mono text-xs font-bold tracking-wide uppercase"
        >
          View API Reference
        </NuxtLink>
      </div>
      <div class="border-border max-w-2xl border">
        <div class="border-border bg-bg-alt border-b px-4 py-2.5">
          <span class="text-ink-muted font-mono text-xs">topology.txt</span>
        </div>
        <pre
          class="bg-code-bg text-code-ink overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed"
        >
Application A &#9492;
Application B &#9500;&#9472;&#9472;&#9656; Lattice &#9656;&#9472;&#9472; OpenAI / Anthropic / Google / Ollama / vLLM
Application C &#9496;</pre>
      </div>
    </section>

    <section class="mx-auto max-w-[1440px] px-6 sm:px-10">
      <div class="border-border flex items-baseline justify-between border-b pb-4">
        <h2 class="text-2xl font-extrabold tracking-tight">Why Lattice</h2>
        <span class="text-ink-muted font-mono text-xs font-semibold tracking-widest uppercase"
          >04 Capabilities</span
        >
      </div>
      <div class="border-border grid grid-cols-1 border-t border-l sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="capability in capabilities"
          :key="capability.number"
          class="border-border border-r border-b p-7"
        >
          <div class="text-accent mb-5 font-mono text-xs">{{ capability.number }}</div>
          <h3 class="mb-1 text-lg font-bold">{{ capability.title }}</h3>
          <div class="text-ink-muted mb-3.5 font-mono text-[11px] tracking-wide uppercase">
            {{ capability.tag }}
          </div>
          <p class="text-ink-muted text-sm leading-relaxed">{{ capability.body }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-[1440px] px-6 pt-16 sm:px-10">
      <div class="border-border flex items-baseline justify-between border-b pb-4">
        <h2 class="text-2xl font-extrabold tracking-tight">Documentation</h2>
        <span class="text-ink-muted font-mono text-xs font-semibold tracking-widest uppercase">
          {{ sections.length }} Sections
        </span>
      </div>
      <div class="border-border grid grid-cols-1 border-t border-l sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="section in sections"
          :key="section.number"
          :to="section.items[0]?.path ?? '/'"
          class="border-border hover:bg-bg-alt border-r border-b p-7"
        >
          <div class="text-ink-faint mb-4 font-mono text-xs">{{ section.number }}</div>
          <h3 class="mb-1 text-[15px] font-bold">{{ section.title }}</h3>
          <p class="text-ink-muted text-[13px]">{{ blurbFor(section.title) }}</p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
