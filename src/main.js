// Must be first: dependencies call methods older Safari does not have.
import './compat.js';
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';

import App from './App.vue';
import { theme } from './theme.js';

createApp(App)
  .use(createVuetify({ theme, defaults: { VBtn: { rounded: 'lg' } } }))
  .mount('#app');
