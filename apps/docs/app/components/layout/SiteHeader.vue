<script setup lang="ts">
  import { Drawer as AkazaDrawer } from 'akaza-ui';

  const { show: showSearch } = useCommandPalette();
  const mobileNavOpen = ref(false);
</script>

<template>
  <header class="border-border bg-bg sticky top-0 z-30 border-b">
    <div class="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6">
      <div class="flex items-center gap-10">
        <NuxtLink
          to="/"
          class="text-ink font-mono text-base font-bold tracking-tight"
          >[ LATTICE ]</NuxtLink
        >
        <nav class="hidden items-center gap-7 md:flex">
          <NuxtLink
            to="/getting-started/introduction"
            class="text-ink-muted hover:text-ink font-mono text-xs tracking-wider"
          >
            DOCS
          </NuxtLink>
          <a
            href="https://github.com/xcvzlabs/lattice"
            target="_blank"
            rel="noopener noreferrer"
            class="text-ink-muted hover:text-ink font-mono text-xs tracking-wider"
          >
            GITHUB &#8599;
          </a>
        </nav>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          class="border-border-strong text-ink-muted hover:text-ink hidden h-9 items-center gap-3 border px-3 sm:flex"
          @click="showSearch"
        >
          <svg
            class="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
          <span class="font-mono text-xs">SEARCH DOCS&#8230;</span>
          <span
            class="border-border-strong text-ink-faint border px-1.5 py-0.5 font-mono text-[10px]"
            >&#8984;K</span
          >
        </button>
        <button
          type="button"
          class="border-border-strong text-ink-muted hover:text-ink flex size-9 items-center justify-center border sm:hidden"
          aria-label="Search documentation"
          @click="showSearch"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
            />
            <line
              x1="21"
              y1="21"
              x2="16.65"
              y2="16.65"
            />
          </svg>
        </button>

        <ThemeToggle />

        <button
          type="button"
          class="border-border-strong text-ink-muted hover:text-ink flex size-9 items-center justify-center border md:hidden"
          aria-label="Open navigation"
          @click="mobileNavOpen = true"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>
    </div>

    <AkazaDrawer
      v-model="mobileNavOpen"
      side="left"
      aria-label="Site navigation"
      :ui="{
        overlay: 'fixed inset-0 z-40 bg-ink/40',
        content:
          'fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-border bg-bg p-5',
      }"
    >
      <template #body="{ close }">
        <div class="mb-5 flex items-center justify-between">
          <span class="font-mono text-sm font-bold">[ LATTICE ]</span>
          <button
            type="button"
            class="text-ink-muted hover:text-ink"
            aria-label="Close navigation"
            @click="close"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <DocsNav @click="close" />
      </template>
    </AkazaDrawer>
  </header>
</template>
