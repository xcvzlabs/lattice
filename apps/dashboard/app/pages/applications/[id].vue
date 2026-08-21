<script setup lang="ts">
  import type { ApiKey, Application, RoutingStrategy } from '@lattice/api-contract';
  import type { TableColumn } from '@nuxt/ui';
  import {
    useCreateApiKey,
    useRevokeApiKey,
    useUpdateApplication,
  } from '~/mutations/applications.ts';
  import {
    applicationApiKeysQuery,
    applicationByIdQuery,
    applicationUsageQuery,
  } from '~/queries/applications.ts';
  import { registryModelsQuery } from '~/queries/models.ts';

  definePageMeta({ auth: 'user' });

  const USAGE_LOOKBACK_DAYS = 30;

  const route = useRoute('applications-id');
  const applicationId = computed(() => route.params.id);

  const { data: application } = useQuery(() => applicationByIdQuery(applicationId.value));
  const { data: models } = useQuery(registryModelsQuery);

  const { data: apiKeys, status: apiKeysStatus } = useQuery(() =>
    applicationApiKeysQuery(applicationId.value),
  );

  const { data: usage } = useQuery(() =>
    applicationUsageQuery({ id: applicationId.value, days: USAGE_LOOKBACK_DAYS }),
  );

  // --- Settings ---

  const routingOptions: { label: string; value: 'default' | RoutingStrategy }[] = [
    { label: 'Default (registry order)', value: 'default' },
    { label: 'Cost-aware', value: 'cost' },
    { label: 'Latency-aware', value: 'latency' },
    { label: 'Balanced', value: 'balanced' },
  ];

  type SettingsState = {
    monthlyTokenQuota: number | null;
    rateLimitPerMinute: number | null;
    allowedModels: string[];
    routingStrategy: 'default' | RoutingStrategy;
    disabled: boolean;
  };

  const settingsState = reactive<SettingsState>({
    monthlyTokenQuota: null,
    rateLimitPerMinute: null,
    allowedModels: [],
    routingStrategy: 'default',
    disabled: false,
  });

  watchEffect(() => {
    if (application.value === undefined) return;
    settingsState.monthlyTokenQuota = application.value.monthlyTokenQuota;
    settingsState.rateLimitPerMinute = application.value.rateLimitPerMinute;
    settingsState.allowedModels = application.value.allowedModels ?? [];
    settingsState.routingStrategy = application.value.routingStrategy ?? 'default';
    settingsState.disabled = application.value.disabledAt !== null;
  });

  const { mutateAsync: updateApplication, isLoading: saving } = useUpdateApplication();

  function saveSettings(): Promise<Application> {
    return updateApplication({
      id: applicationId.value,
      input: {
        monthlyTokenQuota: settingsState.monthlyTokenQuota,
        rateLimitPerMinute: settingsState.rateLimitPerMinute,
        allowedModels:
          settingsState.allowedModels.length === 0 ? null : settingsState.allowedModels,
        routingStrategy:
          settingsState.routingStrategy === 'default' ? null : settingsState.routingStrategy,
        disabled: settingsState.disabled,
      },
    });
  }

  // --- API keys ---

  const apiKeyColumns: TableColumn<ApiKey>[] = [
    { accessorKey: 'keyPrefix', header: 'Prefix' },
    { accessorKey: 'createdAt', header: 'Created' },
    { accessorKey: 'lastUsedAt', header: 'Last used' },
    { accessorKey: 'revokedAt', header: 'Status' },
    { id: 'actions', header: '' },
  ];

  const newlyCreatedKey = ref<string>();

  const { mutateAsync: createApiKeyMutation, isLoading: creatingKey } = useCreateApiKey();
  const { mutateAsync: revokeApiKeyMutation } = useRevokeApiKey();

  async function createApiKey(): Promise<void> {
    const result = await createApiKeyMutation(applicationId.value);
    newlyCreatedKey.value = result.key;
  }

  function revokeApiKey(keyId: string): Promise<ApiKey> {
    return revokeApiKeyMutation({ applicationId: applicationId.value, keyId });
  }

  const tabs = [
    { label: 'Settings', slot: 'settings' as const },
    { label: 'API keys', slot: 'api-keys' as const },
    { label: 'Usage', slot: 'usage' as const },
  ];

  const numberFormatter = new Intl.NumberFormat('en-US');
  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
</script>

<template>
  <UDashboardPanel v-if="application">
    <UPageHeader
      :title="application.name"
      :description="`Application ${application.id}`"
    />

    <div class="p-4">
      <UTabs
        :items="tabs"
        variant="link"
      >
        <template #settings>
          <div class="max-w-lg space-y-4 pt-4">
            <UFormField
              label="Monthly token quota"
              description="Empty means unlimited."
            >
              <UInputNumber
                v-model="settingsState.monthlyTokenQuota"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Rate limit (requests/minute)"
              description="Empty means unlimited."
            >
              <UInputNumber
                v-model="settingsState.rateLimitPerMinute"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Allowed models"
              description="Empty means every registry model is allowed."
            >
              <USelectMenu
                v-model="settingsState.allowedModels"
                multiple
                :items="models?.data.map((model) => model.id) ?? []"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Routing strategy">
              <USelect
                v-model="settingsState.routingStrategy"
                :items="routingOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Disabled">
              <USwitch v-model="settingsState.disabled" />
            </UFormField>
            <UButton
              label="Save"
              :loading="saving"
              @click="saveSettings()"
            />
          </div>
        </template>

        <template #api-keys>
          <div class="space-y-4 pt-4">
            <UAlert
              v-if="newlyCreatedKey"
              color="warning"
              variant="subtle"
              title="Store this key now — it will not be shown again"
              :description="newlyCreatedKey"
            />
            <UButton
              label="Create API key"
              icon="i-lucide-plus"
              :loading="creatingKey"
              @click="createApiKey()"
            />
            <UTable
              :data="apiKeys?.data ?? []"
              :columns="apiKeyColumns"
              :loading="apiKeysStatus === 'pending'"
            >
              <template #revokedAt-cell="{ row }">
                <UBadge
                  :color="row.original.revokedAt ? 'error' : 'success'"
                  variant="subtle"
                >
                  {{ row.original.revokedAt ? 'Revoked' : 'Active' }}
                </UBadge>
              </template>
              <template #actions-cell="{ row }">
                <UButton
                  v-if="!row.original.revokedAt"
                  label="Revoke"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="revokeApiKey(row.original.id)"
                />
              </template>
            </UTable>
          </div>
        </template>

        <template #usage>
          <div class="pt-4">
            <UTable
              :data="usage?.data ?? []"
              :columns="[
                { accessorKey: 'day', header: 'Day' },
                { accessorKey: 'requests', header: 'Requests' },
                { accessorKey: 'totalTokens', header: 'Tokens' },
                { accessorKey: 'estimatedCostUsd', header: 'Estimated cost' },
              ]"
            >
              <template #requests-cell="{ row }">
                {{ numberFormatter.format(row.original.requests) }}
              </template>
              <template #totalTokens-cell="{ row }">
                {{ numberFormatter.format(row.original.totalTokens) }}
              </template>
              <template #estimatedCostUsd-cell="{ row }">
                {{ currencyFormatter.format(row.original.estimatedCostUsd) }}
              </template>
            </UTable>
          </div>
        </template>
      </UTabs>
    </div>
  </UDashboardPanel>
</template>
