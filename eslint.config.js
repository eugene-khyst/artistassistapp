import {defineConfig} from '@eslint/config-helpers';
import js from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import pluginLingui from 'eslint-plugin-lingui';
import licenseHeader from 'eslint-plugin-license-header';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedTsRules = {
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/restrict-template-expressions': ['error', {allowNumber: true}],
  '@typescript-eslint/prefer-nullish-coalescing': ['error', {ignorePrimitives: true}],
};

export default defineConfig(
  // Global ignores
  {
    ignores: [
      'license-header.js',
      'public',
      'dist',
      '.agents/**',
      '.codex/**',
      '.claude/**',
      '.semgrep/**',
      '.remember/**',
    ],
  },

  // App source files (src/**/*.{ts,tsx})
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintReact.configs['recommended-typescript'],
      reactHooks.configs.flat['recommended-latest'],
      pluginLingui.configs['flat/recommended'],
    ],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
      'license-header': licenseHeader,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      ...sharedTsRules,
      'license-header/header': ['error', './license-header.js'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./',
              message: 'Use an @/ import for files outside the current folder.',
            },
          ],
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
    },
  },

  // Node config/script files
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: ['vite.config.ts', 'vitest.config.ts', 'lingui.config.ts', 'translate-po.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      ...sharedTsRules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
    },
  }
);
