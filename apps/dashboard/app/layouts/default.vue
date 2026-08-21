<script setup lang="ts">
  import type { NavigationMenuItem } from '@nuxt/ui';

  const { user, signOut } = useUserSession();

  const navItems: NavigationMenuItem[] = [
    { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: { name: 'index' } },
    { label: 'Applications', icon: 'i-lucide-boxes', to: { name: 'applications' } },
    { label: 'Providers', icon: 'i-lucide-server', to: { name: 'providers' } },
    { label: 'Requests', icon: 'i-lucide-list', to: { name: 'requests' } },
  ];

  async function handleSignOut(): Promise<void> {
    await signOut({
      onSuccess: () => {
        void navigateTo({ name: 'login' });
      },
    });
  }
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <template #header>
        <span class="text-highlighted text-lg font-semibold">Lattice</span>
      </template>

      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
      />

      <template #footer>
        <UButton
          v-if="user"
          :label="user.email"
          icon="i-lucide-log-out"
          variant="ghost"
          color="neutral"
          class="w-full justify-start"
          @click="handleSignOut"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar />
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
