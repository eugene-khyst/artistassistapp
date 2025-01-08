import react from '@vitejs/plugin-react';
import {PluginOption, defineConfig} from 'vite';
import glsl from 'vite-plugin-glsl';
import {VitePWA} from 'vite-plugin-pwa';

const glslPlugin: PluginOption = glsl({
  compress: true,
});

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
        buildPlugins: {
          vite: [glslPlugin],
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
