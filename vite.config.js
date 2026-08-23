import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  // autoImport pulls in only the Vuetify components each app actually uses,
  // which matters here: the portal is the page people load right after
  // hearing a handle read aloud, so its bundle is a product concern.
  plugins: [vue(), vuetify({ autoImport: true })],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
});
