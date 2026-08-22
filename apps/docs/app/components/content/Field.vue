<script setup lang="ts">
  defineProps<{ name?: string; type?: string }>();
</script>

<template>
  <div class="border-border border-b py-4">
    <div class="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <code class="text-ink font-mono text-sm font-semibold">{{ name }}</code>
      <span class="text-ink-faint font-mono text-xs">{{ type }}</span>
    </div>
    <div class="text-ink-muted text-sm leading-relaxed [&_p]:mb-2 [&>:last-child]:mb-0">
      <slot />
    </div>
  </div>
</template>
