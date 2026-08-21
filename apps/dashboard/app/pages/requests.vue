<script setup lang="ts">
  import type { RequestLog } from '@lattice/api-contract';
  import type { TableColumn } from '@nuxt/ui';
  import { requestLogsQuery, type RequestLogStatusFilter } from '~/queries/requests.ts';

  definePageMeta({ auth: 'user' });

  const statusFilter = ref<RequestLogStatusFilter>('all');

  const { data, status } = useQuery(() => requestLogsQuery(statusFilter.value));

  const statusOptions: { label: string; value: RequestLogStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Success', value: 'success' },
    { label: 'Error', value: 'error' },
  ];

  const columns: TableColumn<RequestLog>[] = [
    { accessorKey: 'createdAt', header: 'Time' },
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'attempts', header: 'Attempts' },
    { accessorKey: 'latencyMs', header: 'Latency' },
    { accessorKey: 'estimatedCostUsd', header: 'Cost' },
  ];

  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
</script>

<template>
  <UDashboardPanel>
    <UPageHeader
      title="Requests"
      description="Recent gateway requests across every application."
    >
      <template #links>
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          class="w-40"
        />
      </template>
    </UPageHeader>

    <div class="p-4">
      <UTable
        :data="data?.data ?? []"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'success' ? 'success' : 'error'"
            variant="subtle"
          >
            {{
              row.original.status === 'success' ? row.original.httpStatus : row.original.errorCode
            }}
          </UBadge>
        </template>
        <template #provider-cell="{ row }">
          {{ row.original.provider ?? '—' }}
        </template>
        <template #latencyMs-cell="{ row }"> {{ Math.round(row.original.latencyMs) }}ms </template>
        <template #estimatedCostUsd-cell="{ row }">
          {{
            row.original.estimatedCostUsd !== null
              ? currencyFormatter.format(row.original.estimatedCostUsd)
              : '—'
          }}
        </template>
      </UTable>
    </div>
  </UDashboardPanel>
</template>
