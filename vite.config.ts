import {sentryVitePlugin} from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      manifest: false,
      injectRegister: false,
    }),
    sentryVitePlugin({
      org: 'eugene-khyst',
      project: 'artistassistapp',
    }),
  ],

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
    sourcemap: true,
  },
});
