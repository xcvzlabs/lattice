<script setup lang="ts">
  const colorMode = useColorMode();

  function toggleColorMode(): void {
    colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
  }
</script>

<template>
  <button
    type="button"
    class="border-border-strong text-ink-muted hover:text-ink flex size-9 shrink-0 items-center justify-center border"
    aria-label="Toggle color mode"
    @click="toggleColorMode"
  >
    <ClientOnly>
      <svg
        v-if="colorMode.value === 'dark'"
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <svg
        v-else
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="4"
        />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        />
      </svg>
      <template #fallback>
        <span class="block size-4" />
      </template>
    </ClientOnly>
  </button>
</template>
