<script setup lang="ts">
  import type { VNode } from 'vue';
  import { Tabs as AkazaTabs } from 'akaza-ui';
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

  function getItems() {
    return getChildren().map((vnode, index) => ({
      value: `block-${index}`,
      label: readPreLabel(vnode, index),
    }));
  }

  const active = ref('block-0');
</script>

<template>
  <div class="border-border my-6 border">
    <AkazaTabs
      v-model="active"
      :items="getItems()"
      :ui="{ list: 'flex border-b border-border bg-bg-alt', indicator: 'hidden' }"
    >
      <template #tab="{ item, isActive, select }">
        <button
          type="button"
          class="-mb-px border-b-2 px-4 py-2.5 font-mono text-xs tracking-wide"
          :class="
            isActive
              ? 'border-accent text-ink font-semibold'
              : 'text-ink-muted hover:text-ink border-transparent'
          "
          @click="select"
        >
          {{ item.label }}
        </button>
      </template>
      <template
        v-for="(vnode, index) in getChildren()"
        :key="index"
        #[`panel-block-${index}`]
      >
        <component :is="() => cloneVNode(vnode, { hideBar: true })" />
      </template>
    </AkazaTabs>
  </div>
</template>
