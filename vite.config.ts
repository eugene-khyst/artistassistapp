import react from '@vitejs/plugin-react';
// import * as fs from 'fs';
import {visualizer} from 'rollup-plugin-visualizer';
import {PluginOption, defineConfig} from 'vite';
import glsl from 'vite-plugin-glsl';
import {VitePWA} from 'vite-plugin-pwa';

const maxFileSize = 2 * 1024 * 1024;

const glslPlugin: PluginOption = glsl({
  compress: true,
});

const excludeWasmPlugin: PluginOption = {
  name: 'exclude-wasm',
  generateBundle(_, bundle) {
    for (const filename in bundle) {
      if (filename.endsWith('.wasm')) {
        delete bundle[filename];
      }
    }
  },
};

export default defineConfig({
  plugins: [
    glslPlugin,
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: false,
      injectRegister: false,
      injectManifest: {
        maximumFileSizeToCacheInBytes: maxFileSize,
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
    // https: {
    //   key: fs.readFileSync(`./certs/selfsigned.key`),
    //   cert: fs.readFileSync(`./certs/selfsigned.crt`),
    // },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  build: {
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
