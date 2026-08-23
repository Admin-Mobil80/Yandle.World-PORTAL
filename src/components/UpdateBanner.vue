<script setup>
import { useVersionCheck } from '../composables/useVersionCheck.js';
const { updateAvailable, reload } = useVersionCheck();
</script>

<template>
  <v-snackbar
    :model-value="updateAvailable"
    :timeout="-1"
    location="bottom"
    color="primary"
    multi-line
  >
    A new version is available.
    <template #actions>
      <v-btn variant="text" @click="reload">Reload</v-btn>
    </template>
  </v-snackbar>
</template>
