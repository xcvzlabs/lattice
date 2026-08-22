import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-08-22',
  devtools: {
    enabled: true,
  },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/fonts', '@nuxtjs/color-mode', 'akaza-ui/nuxt'],
  components: [{ path: '~/components', pathPrefix: false }],
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
  colorMode: {
    classSuffix: '',
  },
});
