import react from '@vitejs/plugin-react';
import fs from 'fs';
import {defineConfig} from 'vite';
import glsl from 'vite-plugin-glsl';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    glsl({
      compress: true,
    }),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      includeAssets: ['public/sample-images/chrysanthemum-thumbnail.webp'],
      manifest: false,
      injectRegister: false,
      injectManifest: {
        buildPlugins: {
          vite: [
            glsl({
              compress: true,
            }),
          ],
        },
      },
    }),
  ],

  worker: {
    plugins: () => [
      glsl({
        compress: true,
      }),
    ],
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
  },
});
