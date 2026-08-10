import fs from 'node:fs';
import path from 'node:path';

import {lingui} from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import type {PluginOption} from 'vite';
import {defineConfig} from 'vite';
import glsl from 'vite-plugin-glsl';
import {VitePWA} from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';

const maxFileSize = 2 * 1024 * 1024;

const glslPlugin: PluginOption = glsl({
  minify: true,
});

function parseHeaders(): Record<string, string> {
  const content = fs.readFileSync(path.resolve(import.meta.dirname, 'public/_headers'), 'utf-8');
  const headers: Record<string, string> = {};
  let isGlobal = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '/*') {
      isGlobal = true;
    } else if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith('/')) {
      isGlobal = false;
    } else if (isGlobal && trimmed) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        headers[trimmed.slice(0, colonIndex).trim()] = trimmed.slice(colonIndex + 1).trim();
      }
    }
  }
  return headers;
}

const globalHeaders = parseHeaders();

export default defineConfig({
  plugins: [
    glslPlugin,
    react({
      plugins: [['@lingui/swc-plugin', {}]],
    }),
    lingui(),
    svgr(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: false,
      injectRegister: false,
      injectManifest: {
        maximumFileSizeToCacheInBytes: maxFileSize,
        globIgnores: ['**/node_modules/**/*', '**/404.html', '**/cleanup.html', '**/*.wasm'],
        buildPlugins: {
          vite: [glslPlugin],
        },
      },
    }),
  ],

  worker: {
    plugins: () => [glslPlugin],
  },

  resolve: {
    alias: [{find: /^@\//, replacement: '/src/'}],
  },

  server: {
    port: 5173,
    headers: globalHeaders,
  },

  preview: {
    port: 5173,
    headers: globalHeaders,
  },

  build: {
    target: ['chrome124', 'edge124', 'firefox105', 'safari16.4', 'ios16.4'],
    sourcemap: true,
    chunkSizeWarningLimit: maxFileSize,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'onnx',
              test: /node_modules[\\/]onnxruntime/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
