<template>
  <div
    class="warning-callout border-border-strong relative my-6 overflow-hidden border py-4 pr-5 pl-[30px]"
  >
    <span class="text-ink mb-1.5 block font-mono text-[10.5px] font-bold tracking-widest"
      >WARNING</span
    >
    <div class="text-ink-muted text-sm leading-relaxed [&_p]:mb-3 [&>:last-child]:mb-0">
      <slot />
    </div>
  </div>
</template>

<style scoped>
  .warning-callout::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 10px;
    background-image: repeating-linear-gradient(
      45deg,
      var(--color-ink) 0 3px,
      var(--color-bg-alt) 3px 7px
    );
  }
</style>
