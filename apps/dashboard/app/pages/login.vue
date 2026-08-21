<script setup lang="ts">
  import type { FormSubmitEvent } from '@nuxt/ui';
  import * as v from 'valibot';

  definePageMeta({ layout: false, auth: 'guest' });

  const loginSchema = v.object({
    email: v.pipe(v.string(), v.email('Enter a valid email address')),
    password: v.pipe(v.string(), v.minLength(1, 'Password is required')),
  });
  type LoginSchema = v.InferOutput<typeof loginSchema>;

  const fields = [
    { name: 'email', type: 'text' as const, label: 'Email', required: true },
    { name: 'password', type: 'password' as const, label: 'Password', required: true },
  ];

  const errorMessage = ref<string>();
  const loading = ref(false);

  async function onSubmit(event: FormSubmitEvent<LoginSchema>): Promise<void> {
    const client = useAuthClient();
    if (client === null) return;

    loading.value = true;
    errorMessage.value = undefined;

    const { error } = await client.signIn.email({
      email: event.data.email,
      password: event.data.password,
    });

    loading.value = false;

    if (error) {
      errorMessage.value = error.message ?? 'Sign in failed';
      return;
    }

    await navigateTo({ name: 'index' });
  }
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <UCard class="w-full max-w-sm">
      <UAuthForm
        :schema="loginSchema"
        :fields="fields"
        :loading="loading"
        title="Lattice"
        description="Sign in to manage the gateway."
        icon="i-lucide-network"
        :submit="{ label: 'Sign in' }"
        @submit="onSubmit"
      />
      <UAlert
        v-if="errorMessage"
        class="mt-4"
        color="error"
        variant="subtle"
        :title="errorMessage"
      />
    </UCard>
  </div>
</template>
