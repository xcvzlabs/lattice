<script setup lang="ts">
  const props = defineProps<{ href?: string; target?: string }>();

  const isExternal = computed(() => /^https?:\/\//.test(props.href ?? ''));
</script>

<template>
  <NuxtLink
    :href="href"
    :target="target ?? (isExternal ? '_blank' : undefined)"
    :rel="isExternal ? 'noopener noreferrer' : undefined"
    class="text-accent decoration-border-strong hover:decoration-accent underline underline-offset-2"
  >
    <slot />
    <svg
      v-if="isExternal"
      class="ml-0.5 inline-block size-3 -translate-y-px"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  </NuxtLink>
</template>
