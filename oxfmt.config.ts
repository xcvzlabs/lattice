import { defineConfig } from 'oxfmt';

export default defineConfig({
  sortImports: {
    groups: [
      'type-import',
      'type-internal',
      ['type-parent', 'type-sibling', 'type-index'],
      ['value-builtin', 'value-external'],
      'value-internal',
      ['value-parent', 'value-sibling', 'value-index'],
      'unknown',
    ],
    newlinesBetween: false,
  },
  sortTailwindcss: {
    stylesheets: ['apps/dashboard/app/assets/css/main.css'],
    attributes: ['class'],
    functions: ['clsx', 'cn'],
    preserveWhitespace: true,
  },
  sortPackageJson: false,
  singleQuote: true,
  singleAttributePerLine: true,
  vueIndentScriptAndStyle: true,
  ignorePatterns: [
    'CHANGELOG.md',
    '.agent/**',
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.continue/**',
    '.cursor/**',
    '.gemini/**',
    '.opencode/**',
    '.pi/**',
    '.roo/**',
    '.windsurf/**',
    'tools/oxlint/anti-slop/**',
  ],
});
