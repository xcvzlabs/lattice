<script setup lang="ts">
  type PagerLink = {
    title: string;
    path: string;
  };

  defineProps<{ prev?: PagerLink | null; next?: PagerLink | null }>();
</script>

<template>
  <div
    v-if="prev || next"
    class="border-border mt-12 flex items-center justify-between border-t pt-6"
  >
    <NuxtLink
      v-if="prev"
      :to="prev.path"
      class="text-ink-muted hover:text-accent font-mono text-xs"
    >
      &#8592; {{ prev.title }}
    </NuxtLink>
    <span v-else />
    <NuxtLink
      v-if="next"
      :to="next.path"
      class="text-ink-muted hover:text-accent font-mono text-xs"
    >
      {{ next.title }} &#8594;
    </NuxtLink>
  </div>
</template>
