export default defineNuxtConfig({
  compatibilityDate: '2026-08-21',
  devtools: {
    enabled: true,
  },
  typescript: {
    typeCheck: true,
    strict: true,
    tsConfig: {
      compilerOptions: {
        rootDir: '..',
      },
    },
  },
  experimental: {
    typedPages: true,
  },
  app: {
    head: {
      title: 'Lattice | Dashboard',
      charset: 'utf8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        {
          name: 'format-detection',
          content: 'no',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1',
        },
      ],
    },
    pageTransition: {
      name: 'page',
      mode: 'out-in',
    },
    layoutTransition: {
      name: 'layout',
      mode: 'out-in',
    },
  },
  router: {
    options: {
      scrollBehaviorType: 'smooth',
    },
  },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/better-auth',
  ],
});
