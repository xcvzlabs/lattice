<script setup lang="ts">
  import { providersQuery } from '~/queries/providers.ts';
  import { usageSummaryQuery } from '~/queries/usage.ts';

  definePageMeta({ auth: 'user' });

  const USAGE_LOOKBACK_DAYS = 30;

  const { data: usage } = useQuery(() => usageSummaryQuery(USAGE_LOOKBACK_DAYS));
  const { data: providers } = useQuery(providersQuery);

  const totals = computed(() => {
    const rows = usage.value?.data ?? [];
    return rows.reduce(
      (acc, row) => ({
        requests: acc.requests + row.requests,
        totalTokens: acc.totalTokens + row.totalTokens,
        estimatedCostUsd: acc.estimatedCostUsd + row.estimatedCostUsd,
      }),
      { requests: 0, totalTokens: 0, estimatedCostUsd: 0 },
    );
  });

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
  const numberFormatter = new Intl.NumberFormat('en-US');

  const circuitColor = { closed: 'success', 'half-open': 'warning', open: 'error' } as const;
</script>

<template>
  <UDashboardPanel>
    <UPageHeader
      title="Overview"
      description="Gateway activity over the last 30 days."
    />

    <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
      <UCard>
        <div class="text-muted text-sm">Requests</div>
        <div class="text-2xl font-semibold">{{ numberFormatter.format(totals.requests) }}</div>
      </UCard>
      <UCard>
        <div class="text-muted text-sm">Tokens</div>
        <div class="text-2xl font-semibold">{{ numberFormatter.format(totals.totalTokens) }}</div>
      </UCard>
      <UCard>
        <div class="text-muted text-sm">Estimated spend</div>
        <div class="text-2xl font-semibold">
          {{ currencyFormatter.format(totals.estimatedCostUsd) }}
        </div>
      </UCard>
    </div>

    <div class="p-4 pt-0">
      <h2 class="mb-2 text-sm font-medium">Provider health</h2>
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="provider in providers?.data"
          :key="provider.provider"
          :color="circuitColor[provider.circuitState]"
          variant="subtle"
        >
          {{ provider.provider }} · {{ provider.circuitState }}
        </UBadge>
        <span
          v-if="providers?.data.length === 0"
          class="text-muted text-sm"
        >
          No providers configured.
        </span>
      </div>
    </div>
  </UDashboardPanel>
</template>
