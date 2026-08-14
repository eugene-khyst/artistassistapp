import {defineConfig} from '@eslint/config-helpers';
import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import eslintReact from '@eslint-react/eslint-plugin';
import pluginLingui from 'eslint-plugin-lingui';
import licenseHeader from 'eslint-plugin-license-header';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedPlugins = {
  'import-x': importX,
  'simple-import-sort': simpleImportSort,
  'unused-imports': unusedImports,
};

const sharedTsRules = {
  '@typescript-eslint/consistent-type-exports': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    },
  ],
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
  'import-x/no-duplicates': ['error', {'prefer-inline': true}],
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': 'off',
};

export default defineConfig(
  {
    ignores: ['dist', '.*/**', 'license-header.js', 'public'],
  },

  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      eslintReact.configs['recommended-typescript'],
      reactHooks.configs.flat['recommended-latest'],
      pluginLingui.configs['flat/recommended'],
    ],
    files: ['src/**/*.{ts,tsx}', 'test/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      ...sharedPlugins,
      'license-header': licenseHeader,
      'react-refresh': reactRefresh,
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
      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
    },
  },

  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'lingui.config.ts',
      'translate-po.ts',
      'scripts/**/*.ts',
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: sharedPlugins,
    rules: {
      ...sharedTsRules,
    },
  }
);
