import * as v from 'valibot';

export type DocsNavItem = {
  path: string;
  title: string;
};

export type DocsNavSection = {
  number: string;
  title: string;
  items: DocsNavItem[];
};

export const docsPageMetaSchema = v.object({
  section: v.string(),
  sectionOrder: v.number(),
  title: v.string(),
  order: v.number(),
});

export type DocsPageMeta = v.InferOutput<typeof docsPageMetaSchema>;

type DocsSectionGroup = {
  order: number;
  items: (DocsNavItem & { order: number })[];
};

export function useDocsNavigation() {
  const router = useRouter();

  const sections = computed<DocsNavSection[]>(() => {
    const groups = new Map<string, DocsSectionGroup>();

    for (const route of router.getRoutes()) {
      const result = v.safeParse(docsPageMetaSchema, route.meta.docs);
      if (!result.success) continue;

      const meta = result.output;
      const group = groups.get(meta.section) ?? { order: meta.sectionOrder, items: [] };
      group.items.push({ path: route.path, title: meta.title, order: meta.order });
      groups.set(meta.section, group);
    }

    return [...groups.entries()]
      .toSorted((a, b) => a[1].order - b[1].order)
      .map(([title, group], index) => ({
        number: String(index + 1).padStart(2, '0'),
        title,
        items: group.items.toSorted((a, b) => a.order - b.order),
      }));
  });

  return { sections };
}

export function useDocsSurround(path: MaybeRefOrGetter<string>) {
  const { sections } = useDocsNavigation();

  return computed(() => {
    const flat = sections.value.flatMap((section) => section.items);
    const currentPath = toValue(path);
    const index = flat.findIndex((item) => item.path === currentPath);

    return {
      prev: index > 0 ? (flat[index - 1] ?? null) : null,
      next: index >= 0 && index < flat.length - 1 ? (flat[index + 1] ?? null) : null,
    };
  });
}
