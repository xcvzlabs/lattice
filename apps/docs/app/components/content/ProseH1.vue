<script setup lang="ts">
  defineProps<{ id?: string }>();
</script>

<template>
  <h1
    :id="id"
    class="text-ink mb-4 text-3xl font-extrabold tracking-tight md:text-4xl"
  >
    <slot />
  </h1>
</template>
