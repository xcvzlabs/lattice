<script setup lang="ts">
  defineProps<{ id?: string }>();
</script>

<template>
  <h2
    :id="id"
    class="group text-ink mt-12 mb-4 scroll-mt-24 text-xl font-bold tracking-tight first:mt-0"
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
  </h2>
</template>
