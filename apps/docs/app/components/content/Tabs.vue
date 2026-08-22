<script setup lang="ts">
  import type { VNode } from 'vue';
  import { Tabs as AkazaTabs } from 'akaza-ui';
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

  function getItems() {
    return getChildren().map((vnode, index) => ({
      value: `tab-${index}`,
      label: readTabLabel(vnode, index),
    }));
  }

  const active = ref('tab-0');
</script>

<template>
  <AkazaTabs
    v-model="active"
    :items="getItems()"
    class="my-6"
    :ui="{ list: 'flex border-b border-border', indicator: 'hidden' }"
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
      #[`panel-tab-${index}`]
    >
      <div class="text-ink-muted pt-5 text-sm leading-relaxed [&_p]:mb-3">
        <component :is="() => vnode" />
      </div>
    </template>
  </AkazaTabs>
</template>
