/**
 * Conventional Commits em português — ver docs/processo/versionamento.md.
 * Escopos fora da lista geram aviso (não erro), para não travar escopos novos legítimos.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'core',
        'editor',
        'acordes',
        'repertorios',
        'grupos',
        'palco',
        'sync',
        'api',
        'db',
        'web',
        'desktop',
        'android',
        'ci',
        'deps',
        'docs',
        'specs',
        'prompts',
        'release',
      ],
    ],
    'body-max-line-length': [1, 'always', 100],
  },
};
