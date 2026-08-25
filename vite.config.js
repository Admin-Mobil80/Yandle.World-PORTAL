import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  build: {
    // Named explicitly rather than left to the default. Vuetify ships
    // toSorted/toReversed/findLast, which need Safari 16.4/15.4 — they throw
    // at CALL time, so an older Safari renders a blank page with no clue why.
    // The polyfills in src/compat.js cover the methods; this covers syntax.
    target: ['es2020', 'safari14', 'chrome87', 'firefox78', 'edge88'],
  },
  // autoImport pulls in only the Vuetify components each app actually uses,
  // which matters here: the portal is the page people load right after
  // hearing a handle read aloud, so its bundle is a product concern.
  plugins: [vue(), vuetify({ autoImport: true })],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
});
