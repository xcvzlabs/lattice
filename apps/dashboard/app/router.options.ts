import type { RouterOptions } from '@nuxt/schema';

export default {
  scrollBehavior: async (to, _from, savedPosition) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (savedPosition) resolve(savedPosition);
        else if (to.hash) resolve({ el: to.hash, top: 0 });
        else resolve({ top: 0 });
      }, 100);
    });
  },
} satisfies RouterOptions;
