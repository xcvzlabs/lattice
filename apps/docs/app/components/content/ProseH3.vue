<script setup lang="ts">
  defineProps<{ id?: string }>();
</script>

<template>
  <h3
    :id="id"
    class="group text-ink mt-8 mb-3 scroll-mt-24 text-base font-bold tracking-tight"
  >
    <a
      v-if="id"
      :href="`#${id}`"
      class="no-underline"
    >
      <slot />
      <span
        class="text-accent ml-2 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
        >#</span
      >
    </a>
    <slot v-else />
  </h3>
</template>
