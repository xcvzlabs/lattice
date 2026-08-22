<template>
  <div class="flex min-h-svh flex-col">
    <SiteHeader />
    <main class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <CommandPalette />
  </div>
</template>
