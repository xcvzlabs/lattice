<script setup lang="ts">
  import type { VNode } from 'vue';
  import * as v from 'valibot';

  const tabItemPropsSchema = v.object({
    label: v.optional(v.string()),
  });

  function readTabLabel(vnode: VNode, index: number): string {
    const result = v.safeParse(tabItemPropsSchema, vnode.props ?? {});
    return (result.success ? result.output.label : undefined) ?? `Tab ${index + 1}`;
  }

  const slots = useSlots();

  function getChildren(): VNode[] {
    return slots.default?.() ?? [];
  }

  const items = computed(() =>
    getChildren().map((vnode, index) => ({
      value: `tab-${index}`,
      label: readTabLabel(vnode, index),
    })),
  );

  function renderPanel(index: number): VNode | null {
    return getChildren()[index] ?? null;
  }
</script>

<template>
  <UTabs
    :items="items"
    class="my-6"
    :ui="{
      list: 'border-border bg-transparent p-0 border-b',
      indicator: 'hidden',
      trigger:
        'text-ink-muted hover:text-ink data-[state=active]:text-ink data-[state=active]:border-accent border-b-2 border-transparent px-4 py-2.5 font-mono text-xs font-normal tracking-wide data-[state=active]:font-semibold',
      content: 'text-ink-muted pt-5 text-sm leading-relaxed [&_p]:mb-3',
    }"
  >
    <template #content="{ index }">
      <component :is="() => renderPanel(index)" />
    </template>
  </UTabs>
</template>
