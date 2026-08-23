<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui';

  const { sections } = useDocsNavigation();

  const items = computed<NavigationMenuItem[]>(() => {
    const result: NavigationMenuItem[] = [];

    for (const section of sections.value) {
      result.push({ type: 'label', label: `${section.number} — ${section.title.toUpperCase()}` });
      for (const item of section.items) result.push({ label: item.title, to: item.path });
    }

    return result;
  });
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
    class="text-sm"
    :ui="{
      label: 'text-ink-faint mt-6 mb-2 font-mono text-xs font-semibold tracking-wider first:mt-0',
      link: 'px-2.5 py-1.5',
    }"
  />
</template>
