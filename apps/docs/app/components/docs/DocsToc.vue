<script setup lang="ts">
  type TocLink = {
    id: string;
    text: string;
    depth: number;
  };

  const props = defineProps<{ container: HTMLElement | null }>();

  const links = ref<TocLink[]>([]);
  const activeId = ref<string | null>(null);
  let observer: IntersectionObserver | undefined;

  function collectHeadings(): HTMLElement[] {
    if (!props.container) return [];
    return [...props.container.querySelectorAll<HTMLElement>('h2, h3')];
  }

  function observeHeadings(): void {
    observer?.disconnect();

    const headings = collectHeadings();
    links.value = headings.map((heading) => ({
      id: heading.id,
      text: heading.textContent ?? '',
      depth: heading.tagName === 'H3' ? 3 : 2,
    }));

    if (!headings.length) return;

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        const topmost = visible.toSorted(
          (a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top,
        );
        activeId.value = topmost[0]?.target.id ?? null;
      },
      { rootMargin: '-96px 0px -70% 0px' },
    );

    for (const heading of headings) observer.observe(heading);
  }

  onMounted(observeHeadings);
  watch(() => props.container, observeHeadings);
  onUnmounted(() => observer?.disconnect());
</script>

<template>
  <nav
    v-if="links.length"
    class="text-sm"
  >
    <div class="text-ink-faint mb-3 font-mono text-xs font-semibold tracking-wider">
      ON THIS PAGE
    </div>
    <a
      v-for="link in links"
      :key="link.id"
      :href="`#${link.id}`"
      class="block border-l-2 py-1.5"
      :class="[
        link.depth === 3 ? 'pl-6 text-xs' : 'pl-3',
        activeId === link.id
          ? 'border-accent text-accent font-semibold'
          : 'border-border text-ink-muted hover:text-ink',
      ]"
    >
      {{ link.text }}
    </a>
  </nav>
</template>
