export default {
  '*.{ts,vue,md,yml,json,css,html}': 'oxfmt',
  '*.{ts,vue}': (files: string[]) => {
    const OXLINT_IGNORED = /(^|\/)\.[^/]+\/|(^|\/)[^/]+\.d\.ts$|(^|\/)tools\/oxlint\/anti-slop\//;
    const lintable = files.filter((file) => !OXLINT_IGNORED.test(file));
    return lintable.length > 0 ? [`oxlint ${lintable.join(' ')}`] : [];
  },
};
