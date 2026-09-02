import {fileURLToPath} from 'node:url';

import {playwright} from '@vitest/browser-playwright';
import glsl from 'vite-plugin-glsl';
import {defineConfig} from 'vitest/config';

const alias = {'@': fileURLToPath(new URL('./src', import.meta.url))};

export default defineConfig({
  test: {
    coverage: {
      include: ['src/{services,stores,utils}/**/*.ts'],
      reporter: ['text', 'html'],
    },
    projects: [
      {
        resolve: {alias},
        test: {
          name: 'unit',
          environment: 'node',
          fileParallelism: false,
          include: ['./test/**/*.test.ts'],
          exclude: ['./test/**/*.browser.test.ts'],
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        plugins: [glsl({minify: true})],
        resolve: {alias},
        test: {
          name: 'browser',
          include: ['./test/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: {args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']},
            }),
            headless: true,
            screenshotFailures: false,
            instances: [{browser: 'chromium'}],
          },
        },
      },
    ],
  },
});
