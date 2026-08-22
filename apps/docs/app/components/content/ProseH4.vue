<script setup lang="ts">
  defineProps<{ id?: string }>();
</script>

<template>
  <h4
    :id="id"
    class="group text-ink mt-6 mb-2 scroll-mt-24 text-sm font-bold tracking-tight"
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
  </h4>
</template>
