<script setup lang="ts">
  import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui';

  const { open, hide, toggle } = useCommandPalette();
  const { sections } = useDocsNavigation();

  const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() =>
    sections.value.map((section) => ({
      id: section.number,
      label: `${section.number} — ${section.title.toUpperCase()}`,
      items: section.items.map((item) => ({
        label: item.title,
        to: item.path,
        onSelect: hide,
      })),
    })),
  );

  function handleKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggle();
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown));
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'h-[80svh] max-h-[80svh]' }"
  >
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="Search docs…"
        close
        class="h-full"
        @update:open="() => hide()"
      />
    </template>
  </UModal>
</template>
