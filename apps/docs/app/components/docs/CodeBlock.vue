<script setup lang="ts">
  import { codeToHtml } from 'shiki';

  const props = withDefaults(
    defineProps<{
      code: string;
      language?: string;
      filename?: string | null;
      hideBar?: boolean;
    }>(),
    { language: 'text', filename: null, hideBar: false },
  );

  const instanceId = useId();

  async function highlight(): Promise<string> {
    try {
      return await codeToHtml(props.code, { lang: props.language, theme: 'github-dark' });
    } catch {
      return await codeToHtml(props.code, { lang: 'text', theme: 'github-dark' });
    }
  }

  const { data: html } = await useAsyncData(`code-block-${instanceId}`, highlight);

  const copied = ref(false);

  async function copyCode(): Promise<void> {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  }
</script>

<template>
  <div
    v-if="hideBar"
    class="group/code relative"
  >
    <button
      type="button"
      class="border-border-strong bg-bg text-ink-muted hover:text-accent absolute top-3 right-3 z-10 flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-wide opacity-0 transition-opacity group-hover/code:opacity-100"
      @click="copyCode"
    >
      <svg
        class="size-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <rect
          x="9"
          y="9"
          width="12"
          height="12"
        />
        <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
      </svg>
      {{ copied ? 'COPIED' : 'COPY' }}
    </button>
    <div
      class="shiki-block overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed"
      v-html="html"
    />
  </div>
  <div
    v-else
    class="border-border my-6 border"
  >
    <div class="border-border bg-bg-alt flex items-center justify-between border-b px-4 py-2">
      <span class="text-ink-muted font-mono text-xs tracking-wide">{{ filename ?? language }}</span>
      <button
        type="button"
        class="text-ink-muted hover:text-accent flex items-center gap-1.5 font-mono text-xs tracking-wide"
        @click="copyCode"
      >
        <svg
          class="size-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="9"
            width="12"
            height="12"
          />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
        {{ copied ? 'COPIED' : 'COPY' }}
      </button>
    </div>
    <div
      class="shiki-block overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed"
      v-html="html"
    />
  </div>
</template>

<style>
  .shiki-block pre.shiki {
    background: transparent !important;
    margin: 0;
    padding: 0;
  }
</style>
