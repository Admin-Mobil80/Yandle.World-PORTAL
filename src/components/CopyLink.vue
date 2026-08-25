<script setup>
import { ref } from 'vue';
import { handleUrl } from '../lib/host.js';

/**
 * Copy-to-clipboard for a Yandle URL.
 *
 * The whole product is a URL people pass to other people, so copying it is
 * the primary verb on this page — worth a control of its own rather than
 * making someone select the text.
 */
const props = defineProps({ handle: { type: String, required: true } });
const copied = ref(false);
const failed = ref(false);

async function copy() {
  const url = handleUrl(props.handle);
  failed.value = false;
  try {
    await navigator.clipboard.writeText(url);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1800);
  } catch {
    // Clipboard is blocked in some contexts (http, some webviews). Showing
    // the URL to copy by hand beats a button that silently does nothing.
    failed.value = true;
    window.prompt('Copy this link', url);
  }
}
</script>

<template>
  <v-btn
    :icon="copied ? 'mdi-check' : 'mdi-content-copy'"
    :color="copied ? 'success' : undefined"
    :aria-label="copied ? 'Copied' : 'Copy link'"
    :title="copied ? 'Copied' : 'Copy link'"
    size="x-small" variant="text" density="comfortable"
    @click.stop.prevent="copy"
  />
</template>
