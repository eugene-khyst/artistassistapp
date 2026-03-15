import {lingui} from '@lingui/vite-plugin';
import react from '@vitejs/plugin-react-swc';
import {visualizer} from 'rollup-plugin-visualizer';
import type {PluginOption} from 'vite';
import {defineConfig} from 'vite';
import glsl from 'vite-plugin-glsl';
import {VitePWA} from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';

const maxFileSize = 2 * 1024 * 1024;

const glslPlugin: PluginOption = glsl({
  minify: true,
});

const excludeWasmPlugin: PluginOption = {
  name: 'exclude-wasm',
  generateBundle(_, bundle) {
    for (const filename of Object.keys(bundle)) {
      if (filename.endsWith('.wasm')) {
        // You can prevent files from being emitted by deleting them from the bundle object
        // https://rollupjs.org/plugin-development/#generatebundle
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete bundle[filename];
      }
    }
  },
};

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
        globIgnores: ['**/node_modules/**/*', '**/404.html', '**/cleanup.html'],
        buildPlugins: {
          vite: [glslPlugin],
          rollup: [excludeWasmPlugin],
        },
      },
    }),
  ],

  worker: {
    plugins: () => [glslPlugin],
  },

  resolve: {
    alias: [{find: /^~\/src\//, replacement: '/src/'}],
  },

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  build: {
    target: ['chrome85', 'edge85', 'firefox105', 'safari16.4', 'ios16.4'],
    sourcemap: true,
    chunkSizeWarningLimit: maxFileSize,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('onnxruntime')) {
            return 'onnx';
          } else if (id.includes('node_modules')) {
            return 'vendor';
          }
          return;
        },
      },
      plugins: [
        excludeWasmPlugin,
        visualizer({
          template: 'treemap',
        }),
      ],
    },
  },
});
