<script setup lang="ts">
  const route = useRoute();
  const { sections } = useDocsNavigation();
</script>

<template>
  <nav class="text-sm">
    <div
      v-for="section in sections"
      :key="section.number"
      class="mb-1"
    >
      <div
        class="text-ink-faint mt-6 mb-2 font-mono text-xs font-semibold tracking-wider first:mt-0"
      >
        {{ section.number }} — {{ section.title.toUpperCase() }}
      </div>
      <NuxtLink
        v-for="item in section.items"
        :key="item.path"
        :to="item.path"
        class="block border-l-2 px-2.5 py-1.5"
        :class="
          route.path === item.path
            ? 'border-accent bg-accent-soft text-accent font-semibold'
            : 'text-ink-muted hover:bg-bg-alt hover:text-ink border-transparent'
        "
      >
        {{ item.title }}
      </NuxtLink>
    </div>
  </nav>
</template>
