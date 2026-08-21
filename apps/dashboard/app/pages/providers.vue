<script setup lang="ts">
  import { providersQuery } from '~/queries/providers.ts';

  definePageMeta({ auth: 'user' });

  const { data, status } = useQuery(providersQuery);

  const circuitColor = { closed: 'success', 'half-open': 'warning', open: 'error' } as const;
</script>

<template>
  <UDashboardPanel>
    <UPageHeader
      title="Providers"
      description="Circuit breaker state and live routing latency."
    />

    <div
      v-if="status === 'pending'"
      class="p-4"
    >
      <USkeleton class="h-32 w-full" />
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2"
    >
      <UCard
        v-for="provider in data?.data"
        :key="provider.provider"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium capitalize">{{ provider.provider }}</span>
            <UBadge
              :color="circuitColor[provider.circuitState]"
              variant="subtle"
            >
              {{ provider.circuitState }}
            </UBadge>
          </div>
        </template>

        <ul class="space-y-1 text-sm">
          <li
            v-for="model in provider.models"
            :key="model.modelId"
            class="flex justify-between"
          >
            <span class="text-muted">{{ model.modelId }}</span>
            <span>{{
              model.averageLatencyMs !== null ? `${Math.round(model.averageLatencyMs)}ms` : '—'
            }}</span>
          </li>
          <li
            v-if="provider.models.length === 0"
            class="text-muted"
          >
            No models on this provider.
          </li>
        </ul>
      </UCard>
    </div>
  </UDashboardPanel>
</template>
