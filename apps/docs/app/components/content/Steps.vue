<script setup lang="ts">
  withDefaults(defineProps<{ level?: string | number }>(), { level: 3 });
</script>

<template>
  <div class="steps">
    <slot />
  </div>
</template>

<style scoped>
  .steps {
    counter-reset: step;
    margin: 24px 0;
    margin-left: 6px;
    border-left: 1px solid var(--color-border);
    padding-left: 26px;
  }

  .steps :deep(h3),
  .steps :deep(h4) {
    position: relative;
    margin: 32px 0 8px;
    font-size: 14.5px;
    font-weight: 700;
    counter-increment: step;
  }

  .steps :deep(h3:first-of-type),
  .steps :deep(h4:first-of-type) {
    margin-top: 0;
  }

  .steps :deep(h3)::before,
  .steps :deep(h4)::before {
    content: counter(step);
    position: absolute;
    top: 0;
    left: -38px;
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-strong);
    background: var(--color-bg);
    color: var(--color-ink-muted);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
</style>
