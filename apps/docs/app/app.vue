<script setup lang="ts">
  useSeoMeta({
    titleTemplate: (title) => (title ? `${title} · Lattice Docs` : 'Lattice Docs'),
    description:
      'Centralized AI infrastructure for connecting applications to cloud and self-hosted models.',
  });
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
