<script setup lang="ts">
  import * as v from 'valibot';
  import { docsPageMetaSchema } from '~/composables/useDocsNavigation';

  const route = useRoute();
  const meta = computed(() => {
    const result = v.safeParse(docsPageMetaSchema, route.meta.docs);
    return result.success ? result.output : null;
  });
  const surround = useDocsSurround(() => route.path);

  const contentRef = useTemplateRef('content');
</script>

<template>
  <div class="mx-auto flex max-w-[1440px]">
    <aside class="border-border hidden w-64 shrink-0 border-r px-6 py-10 lg:block">
      <DocsNav />
    </aside>

    <div class="min-w-0 flex-1 px-6 py-10 lg:px-14 xl:px-16">
      <div class="mx-auto max-w-3xl">
        <div
          v-if="meta"
          class="text-ink-faint mb-4 font-mono text-[11px] tracking-wide"
        >
          DOCS / <b class="text-ink-muted">{{ meta.section.toUpperCase() }}</b> /
          {{ meta.title.toUpperCase() }}
        </div>

        <div
          ref="content"
          class="[&>p:first-of-type]:border-border [&>p:first-of-type]:text-ink-muted [&>p:first-of-type]:mb-9 [&>p:first-of-type]:border-b [&>p:first-of-type]:pb-9 [&>p:first-of-type]:text-lg [&>p:first-of-type]:leading-relaxed"
        >
          <slot />
        </div>

        <DocsPager
          :prev="surround.prev"
          :next="surround.next"
        />
      </div>
    </div>

    <aside class="hidden w-56 shrink-0 px-6 py-10 xl:block">
      <div class="sticky top-24">
        <DocsToc :container="contentRef" />
      </div>
    </aside>
  </div>
</template>
