<script setup lang="ts">
  import type { VNode } from 'vue';
  import * as v from 'valibot';
  import { cloneVNode } from 'vue';

  const preItemPropsSchema = v.object({
    language: v.optional(v.nullable(v.string())),
    filename: v.optional(v.nullable(v.string())),
  });

  function readPreLabel(vnode: VNode, index: number): string {
    const result = v.safeParse(preItemPropsSchema, vnode.props ?? {});
    if (!result.success) return `Tab ${index + 1}`;
    return result.output.filename ?? result.output.language ?? `Tab ${index + 1}`;
  }

  const slots = useSlots();

  function getChildren(): VNode[] {
    return slots.default?.() ?? [];
  }

  const items = computed(() =>
    getChildren().map((vnode, index) => ({
      value: `block-${index}`,
      label: readPreLabel(vnode, index),
    })),
  );

  function renderBlock(index: number): VNode | null {
    const vnode = getChildren()[index];
    return vnode ? cloneVNode(vnode, { hideBar: true }) : null;
  }
</script>

<template>
  <div class="border-border my-6 border">
    <UTabs
      :items="items"
      :ui="{
        list: 'border-border bg-bg-alt p-0 border-b',
        indicator: 'hidden',
        trigger:
          'text-ink-muted hover:text-ink data-[state=active]:text-ink data-[state=active]:border-accent border-b-2 border-transparent px-4 py-2.5 font-mono text-xs font-normal tracking-wide data-[state=active]:font-semibold',
        content: '',
      }"
    >
      <template #content="{ index }">
        <component :is="() => renderBlock(index)" />
      </template>
    </UTabs>
  </div>
</template>
