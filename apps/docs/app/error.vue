<script setup lang="ts">
  import type { NuxtError } from '#app';

  const props = defineProps<{ error: NuxtError }>();

  function handleClear(): void {
    clearError({ redirect: '/' });
  }
</script>

<template>
  <div class="flex min-h-svh flex-col">
    <SiteHeader />
    <main class="flex flex-1 items-center justify-center px-6">
      <div class="max-w-md text-center">
        <div class="text-accent mb-4 font-mono text-sm font-semibold tracking-widest">
          {{ props.error.statusCode }}
        </div>
        <h1 class="mb-4 text-3xl font-extrabold tracking-tight">
          {{ props.error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}
        </h1>
        <p class="text-ink-muted mb-8 text-sm leading-relaxed">
          {{
            props.error.statusCode === 404
              ? "The page you're looking for doesn't exist or has moved."
              : (props.error.statusMessage ?? 'An unexpected error occurred.')
          }}
        </p>
        <button
          type="button"
          class="border-ink bg-ink text-bg border px-6 py-3 font-mono text-xs font-bold tracking-wide uppercase"
          @click="handleClear"
        >
          Back to home
        </button>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
