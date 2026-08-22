<script setup lang="ts">
  definePageMeta({
    docs: { section: 'Development', sectionOrder: 7, title: 'Coding Standards', order: 2 },
  });

  useSeoMeta({
    title: 'Coding Standards',
    description:
      'Formatting, linting, TypeScript conventions, and validation patterns used throughout the codebase.',
  });
</script>

<template>
  <DocPage>
    <ProseH1 id="coding-standards">Coding Standards</ProseH1>

    <ProseH2 id="tooling">Tooling</ProseH2>
    <ProseTable>
      <ProseThead>
        <ProseTr>
          <ProseTh>Concern</ProseTh>
          <ProseTh>Tool</ProseTh>
          <ProseTh>Config</ProseTh>
        </ProseTr>
      </ProseThead>
      <tbody>
        <ProseTr>
          <ProseTd>Formatting</ProseTd>
          <ProseTd>
            <ProseA href="https://oxc.rs">oxfmt</ProseA> — single quotes, sorted imports, Tailwind
            class sorting
          </ProseTd>
          <ProseTd><ProseCode>oxfmt.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Linting</ProseTd>
          <ProseTd>
            <ProseA href="https://oxc.rs">oxlint</ProseA> — TypeScript, Vue, Unicorn, Import, OXC
            plugins, type-aware
          </ProseTd>
          <ProseTd><ProseCode>oxlint.config.ts</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Type checking</ProseTd>
          <ProseTd>TypeScript, strict</ProseTd>
          <ProseTd>per-workspace <ProseCode>tsconfig.json</ProseCode></ProseTd>
        </ProseTr>
        <ProseTr>
          <ProseTd>Testing</ProseTd>
          <ProseTd><ProseA href="https://vitest.dev">Vitest</ProseA>, Node environment</ProseTd>
          <ProseTd><ProseCode>vitest.config.ts</ProseCode></ProseTd>
        </ProseTr>
      </tbody>
    </ProseTable>
    <p>
      Type-aware linting is enabled (<ProseCode
        >options: { typeAware: true, typeCheck: true }</ProseCode
      >) — oxlint rules like <ProseCode>typescript/no-floating-promises</ProseCode>,
      <ProseCode>typescript/await-thenable</ProseCode>, and
      <ProseCode>typescript/unbound-method</ProseCode> run against real inferred types, not just
      syntax.
    </p>

    <ProseH2 id="typescript-configuration">TypeScript configuration</ProseH2>
    <p>
      <ProseCode>strict: true</ProseCode>, <ProseCode>verbatimModuleSyntax: true</ProseCode>,
      <ProseCode>noUncheckedIndexedAccess: true</ProseCode>. The last one means every indexed
      array/object access (<ProseCode>arr[i]</ProseCode>, <ProseCode>record[key]</ProseCode>) is
      typed as possibly <ProseCode>undefined</ProseCode> — code throughout the repo narrows
      explicitly rather than asserting a value is present.
    </p>

    <ProseH2 id="naming-and-typing-conventions">Naming and typing conventions</ProseH2>
    <FieldGroup>
      <Field
        name="type over interface"
        type="convention"
        >Prefer <ProseCode>type</ProseCode> declarations.</Field
      >
      <Field
        name="unknown, not any"
        type="convention"
      >
        Narrow <ProseCode>unknown</ProseCode> explicitly. Avoid inventing a generic
        <ProseCode>isRecord</ProseCode>
        helper for this.
      </Field>
      <Field
        name="explicit return types"
        type="required"
        >On exported functions and non-trivial helpers.</Field
      >
      <Field
        name="string literal unions"
        type="for small enums"
      >
        E.g. <ProseCode>'ok' | 'error'</ProseCode>, as seen throughout
        (<ProseCode>LatticeErrorCode</ProseCode>, <ProseCode>RoutingStrategy</ProseCode>, request
        statuses).
      </Field>
      <Field
        name="descriptive names"
        type="required"
      >
        No abbreviated iterable items — <ProseCode>item</ProseCode>, <ProseCode>entry</ProseCode>,
        <ProseCode>record</ProseCode>, <ProseCode>status</ProseCode>, not
        <ProseCode>i</ProseCode>/<ProseCode>e</ProseCode>/<ProseCode>x</ProseCode>
        (conventional numeric indexes excepted).
      </Field>
    </FieldGroup>

    <ProseH2 id="import-conventions">Import conventions</ProseH2>
    <p>
      <ProseCode>verbatimModuleSyntax</ProseCode> requires <ProseCode>import type</ProseCode> for
      type-only imports. Import paths use explicit <ProseCode>.ts</ProseCode> extensions. Path alias
      <ProseCode>~/*</ProseCode> resolves to the repo root (configured in
      <ProseCode>tsconfig.json</ProseCode>, used by tests via the Vitest alias).
    </p>

    <ProseH2 id="style">Style</ProseH2>
    <ProseUl>
      <ProseLi>
        Single quotes, sorted imports (oxfmt-enforced import group order: type-import →
        type-internal → type-parent/sibling/index → value-builtin/external → value-internal →
        value-parent/sibling/index → unknown).
      </ProseLi>
      <ProseLi>
        <ProseCode>function name()</ProseCode> for named functions and top-level helpers — not
        <ProseCode>const fn = () => {}</ProseCode>. Callbacks (e.g.
        <ProseCode>items.map((item) => item.id)</ProseCode>) stay as arrows; that's the one
        exception.
      </ProseLi>
      <ProseLi
        >Destructure one or two properties from an iterated item when it won't collide with another
        in-scope variable.</ProseLi
      >
      <ProseLi
        >Prefer functions over classes. Existing correct classes aren't rewritten just for
        style.</ProseLi
      >
      <ProseLi
        >Match the surrounding file's formatting rather than hand-styling a custom layout.</ProseLi
      >
    </ProseUl>

    <ProseH2 id="validation-errors-and-responses">Validation, errors, and responses</ProseH2>
    <ProseUl>
      <ProseLi>
        <ProseA href="https://valibot.dev">Valibot</ProseA> for environment parsing, form
        validation, and request validation — see
        <ProseA href="/development/shared-packages">Shared Packages</ProseA> for
        <ProseCode>packages/env</ProseCode> and <ProseCode>packages/api-contract</ProseCode>.
      </ProseLi>
      <ProseLi
        ><ProseCode>camelCaseSchema</ProseCode> naming, not
        <ProseCode>PascalCaseSchema</ProseCode>.</ProseLi
      >
      <ProseLi
        >Composable <ProseCode>v.pipe()</ProseCode> schemas with built-in actions, over
        manual/ad-hoc parsing.</ProseLi
      >
      <ProseLi
        >Validate once at the boundary (the route handler), not repeatedly in inner layers.</ProseLi
      >
      <ProseLi>
        Never throw raw strings — always a typed error (<ProseCode>createLatticeError</ProseCode> on
        the gateway, <ProseCode>createError</ProseCode> elsewhere).
      </ProseLi>
      <ProseLi>
        Catch infrastructure errors where graceful degradation is expected (e.g.
        <ProseCode>touchLastUsedAt</ProseCode> failures are logged, not fatal — see
        <ProseA href="/architecture/security#verification">Security</ProseA>).
      </ProseLi>
      <ProseLi>Clean up temporary resources in <ProseCode>finally</ProseCode> blocks.</ProseLi>
      <ProseLi>
        Stable error codes in config validation and app-level failures — see the
        <ProseA href="/api-reference/errors#every-error-code">LatticeErrorCode table</ProseA>.
      </ProseLi>
    </ProseUl>

    <ProseH2 id="editing-guidance-for-contributors-and-agents"
      >Editing guidance for contributors and agents</ProseH2
    >
    <ProseUl>
      <ProseLi
        >Make the smallest correct change; don't polish unrelated code or expand into a repo-wide
        refactor unless the task requires it.</ProseLi
      >
      <ProseLi
        >Don't remove correct comments/documentation, or rename broad parts of the codebase, without
        a reason tied to the task.</ProseLi
      >
      <ProseLi
        >No backward-compatibility shims — remove obsolete paths outright rather than adding
        fallbacks or migrations for them.</ProseLi
      >
      <ProseLi
        >Choose the simplest implementation that fully meets the <em>current</em> requirement; no
        speculative abstraction or configuration.</ProseLi
      >
      <ProseLi
        >Grow the system in layers — every change should leave a product that works end to end,
        never a working product traded for unfinished complexity.</ProseLi
      >
      <ProseLi
        >Lean on dependencies already in the project before writing a new implementation; don't
        assume a library lacks a capability without checking.</ProseLi
      >
      <ProseLi
        >If a workaround needs a paragraph of comment to justify why it's okay, that's a signal the
        code is wrong, not that it needs a bigger comment.</ProseLi
      >
    </ProseUl>

    <ProseH2 id="anti-slop-lint-plugin">Anti-slop lint plugin</ProseH2>
    <p>
      <ProseCode>tools/oxlint/anti-slop/</ProseCode> is a custom oxlint plugin enforcing patterns
      that AI-assisted and human contributors alike tend toward under time pressure: chained type
      assertions, conditional empty-object spreads, widening known values, module mocking in tests,
      object/unknown-shaped parameters and returns, runtime <ProseCode>typeof</ProseCode> misuse,
      unsafe dictionary types, and "widen then assert" patterns. All are
      <ProseCode>error</ProseCode>-level. If you hit one, the fix is almost always a narrower, more
      explicit type or a smaller function signature — not a suppression comment.
    </p>
  </DocPage>
</template>
