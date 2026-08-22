<script setup lang="ts">
  import type { DiagramColors } from 'beautiful-mermaid';
  import { renderMermaidSVG } from 'beautiful-mermaid';

  const props = defineProps<{ code: string }>();

  const lightColors: DiagramColors = {
    bg: '#fafafa',
    fg: '#18181b',
    line: '#3f3f46',
    accent: '#059669',
    muted: '#71717a',
    surface: '#f4f4f5',
    border: '#d4d4d8',
  };

  const darkColors: DiagramColors = {
    bg: '#09090b',
    fg: '#f4f4f5',
    line: '#71717a',
    accent: '#34d399',
    muted: '#a1a1aa',
    surface: '#18181b',
    border: '#3f3f46',
  };

  function render(colors: DiagramColors): string {
    try {
      return renderMermaidSVG(props.code, colors);
    } catch {
      return '';
    }
  }

  // Rendered up front with the light palette so the diagram is present in the
  // server-rendered/static HTML instead of appearing only after client mount.
  const svg = ref(render(lightColors));

  function renderForCurrentTheme(): void {
    const isDark = document.documentElement.classList.contains('dark');
    svg.value = render(isDark ? darkColors : lightColors);
  }

  let observer: MutationObserver | undefined;

  onMounted(() => {
    renderForCurrentTheme();
    observer = new MutationObserver(renderForCurrentTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });

  onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div class="border-border bg-bg-alt my-6 overflow-x-auto border p-6">
    <div
      v-if="svg"
      class="flex justify-center"
      v-html="svg"
    />
    <p
      v-else
      class="text-ink-faint font-mono text-xs"
    >
      Diagram failed to render.
    </p>
  </div>
</template>
