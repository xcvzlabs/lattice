<script setup lang="ts">
  import type { ComboboxOption } from 'akaza-ui';
  import { Combobox as AkazaCombobox, Dialog as AkazaDialog } from 'akaza-ui';
  import * as v from 'valibot';

  const navigablePathSchema = v.string();

  const { open, hide, toggle } = useCommandPalette();
  const { sections } = useDocsNavigation();

  const query = ref('');
  const results = ref<ComboboxOption[]>([]);

  function scheduleSearch(value: string): void {
    query.value = value;
    const needle = value.trim().toLowerCase();

    if (!needle) {
      results.value = [];
      return;
    }

    results.value = sections.value.flatMap((section) =>
      section.items
        .filter((item) => item.title.toLowerCase().includes(needle))
        .map((item) => ({
          value: item.path,
          label: item.title,
          description: section.title.toUpperCase(),
        })),
    );
  }

  function handleSelect(
    value: ComboboxOption['value'] | ComboboxOption['value'][] | undefined,
  ): void {
    const result = v.safeParse(navigablePathSchema, value);
    if (!result.success) return;
    hide();
    navigateTo(result.output);
  }

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
  <AkazaDialog
    v-model="open"
    aria-label="Search documentation"
    :ui="{
      overlay: 'fixed inset-0 z-40 bg-ink/40',
      content:
        'fixed top-[15vh] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 border border-border-strong bg-bg',
    }"
  >
    <template #body>
      <AkazaCombobox
        :options="results"
        :filterable="false"
        open-on-focus
        placeholder="Search docs…"
        :ui="{
          root: 'flex items-center gap-3 border-b border-border px-4 py-3',
          input:
            'w-full bg-transparent font-mono text-sm text-ink placeholder:text-ink-faint focus:outline-none',
          content: 'max-h-96 overflow-y-auto',
          option:
            'flex cursor-pointer items-center justify-between gap-3 border-l-2 border-transparent px-4 py-3 hover:bg-bg-alt aria-selected:border-l-accent aria-selected:bg-bg-alt',
          optionLabel: 'text-sm text-ink',
          optionDescription: 'font-mono text-[10px] tracking-wide text-ink-faint uppercase',
          empty: 'px-4 py-6 text-center font-mono text-xs text-ink-faint',
        }"
        @update:search="scheduleSearch"
        @value-change="handleSelect"
      >
        <template #empty>
          <span>{{ query ? 'No results' : 'Type to search…' }}</span>
        </template>
      </AkazaCombobox>
      <div class="border-border flex gap-4 border-t px-4 py-2.5">
        <span class="text-ink-faint font-mono text-[10px]">&#8593;&#8595; NAVIGATE</span>
        <span class="text-ink-faint font-mono text-[10px]">&#8629; SELECT</span>
        <span class="text-ink-faint font-mono text-[10px]">ESC CLOSE</span>
      </div>
    </template>
  </AkazaDialog>
</template>
