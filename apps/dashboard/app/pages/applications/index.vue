<script setup lang="ts">
  import type { Application } from '@lattice/api-contract';
  import type { FormSubmitEvent, TableColumn } from '@nuxt/ui';
  import * as v from 'valibot';
  import { useCreateApplication } from '~/mutations/applications.ts';
  import { applicationsListQuery } from '~/queries/applications.ts';

  definePageMeta({ auth: 'user' });

  const { data, status } = useQuery(applicationsListQuery);

  const createSchema = v.object({
    name: v.pipe(v.string(), v.minLength(1, 'Name is required')),
  });
  type CreateSchema = v.InferOutput<typeof createSchema>;

  const createOpen = ref(false);
  const createState = reactive<CreateSchema>({ name: '' });

  const { mutateAsync: createApplication, isLoading: creating } = useCreateApplication();

  async function onCreateSubmit(event: FormSubmitEvent<CreateSchema>): Promise<void> {
    await createApplication(event.data);
    createOpen.value = false;
    createState.name = '';
  }

  const columns: TableColumn<Application>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'disabledAt',
      header: 'Status',
    },
    { accessorKey: 'monthlyTokenQuota', header: 'Monthly quota' },
    { accessorKey: 'routingStrategy', header: 'Routing' },
  ];
</script>

<template>
  <UDashboardPanel>
    <UPageHeader
      title="Applications"
      description="Applications authorized to call the gateway."
    >
      <template #links>
        <UButton
          label="New application"
          icon="i-lucide-plus"
          @click="createOpen = true"
        />
      </template>
    </UPageHeader>

    <div class="p-4">
      <UTable
        :data="data?.data ?? []"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #disabledAt-cell="{ row }">
          <UBadge
            :color="row.original.disabledAt ? 'error' : 'success'"
            variant="subtle"
          >
            {{ row.original.disabledAt ? 'Disabled' : 'Active' }}
          </UBadge>
        </template>
        <template #routingStrategy-cell="{ row }">
          {{ row.original.routingStrategy ?? 'default' }}
        </template>
        <template #name-cell="{ row }">
          <NuxtLink
            class="font-medium hover:underline"
            :to="{ name: 'applications-id', params: { id: row.original.id } }"
          >
            {{ row.original.name }}
          </NuxtLink>
        </template>
      </UTable>
    </div>

    <UModal
      v-model:open="createOpen"
      title="New application"
    >
      <template #body>
        <UForm
          :schema="createSchema"
          :state="createState"
          @submit="onCreateSubmit"
        >
          <UFormField
            label="Name"
            name="name"
            required
          >
            <UInput
              v-model="createState.name"
              class="w-full"
            />
          </UFormField>
          <div class="mt-4 flex justify-end gap-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="createOpen = false"
            />
            <UButton
              label="Create"
              type="submit"
              :loading="creating"
            />
          </div>
        </UForm>
      </template>
    </UModal>
  </UDashboardPanel>
</template>
