import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: 'apps/web/' } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      // The UI must not reach the HTTP layer directly: it goes through the SDK packages.
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'openapi-fetch', message: 'Use @web-boilerplate/sdk-core instead.' }],
          // Packages are consumed through their public entry point only (see each package.json `exports`).
          patterns: [
            {
              group: ['@web-boilerplate/*/*'],
              message: 'Import from the package entry point, not its internals.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/sdk-core/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/generated/**',
    '**/playwright-report/**',
    '**/test-results/**',
    'next-env.d.ts',
    'apps/web/next-env.d.ts',
  ]),
]);
