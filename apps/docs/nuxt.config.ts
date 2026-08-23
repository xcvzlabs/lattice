export default defineNuxtConfig({
  compatibilityDate: '2026-08-22',
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/fonts', '@nuxt/ui'],
  components: [{ path: '~/components', pathPrefix: false }],
  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
});
