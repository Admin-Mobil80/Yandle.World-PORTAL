<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../lib/api.js';
import { currentHost } from '../lib/host.js';

/**
 * Starts a handle-ownership transfer. Kept separate from ClaimDialog rather
 * than folded in: this is a one-field, one-purpose form with its own error
 * shape (the hold-expiry rejection especially deserves its own sentence, not
 * a generic "could not save").
 */
const props = defineProps({
  modelValue: Boolean,
  handle: { type: String, default: '' },
});
const emit = defineEmits(['update:modelValue', 'started']);

const to_contact = ref('');
const busy = ref(false);
const error = ref(null);

watch(() => props.modelValue, (open) => {
  if (open) { to_contact.value = ''; error.value = null; }
});

// Only email is ever accepted server-side today — acceptance rides the same
// passwordless sign-in, which only authenticates an email address.
const contactValid = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to_contact.value.trim()));
const canSubmit = computed(() => contactValid.value && !busy.value);

async function submit() {
  busy.value = true; error.value = null;
  try {
    const data = await api.initiateTransfer(props.handle, to_contact.value.trim());
    emit('started', data);
    emit('update:modelValue', false);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}

const host = currentHost();
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="440" @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-5 px-6">
        <div class="text-h6">Transfer {{ host }}/{{ handle }}</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          They will get an email with a link to accept. Nothing changes until they do.
        </div>
      </v-card-title>

      <v-card-text class="px-6">
        <v-text-field
          v-model="to_contact" label="Recipient's email" placeholder="them@example.com"
          type="email" autocomplete="email" variant="outlined" density="comfortable"
          :error="!!to_contact && !contactValid" autofocus
          @keyup.enter="canSubmit && submit()"
        />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" :loading="busy" @click="submit">
          Send transfer invite
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
