<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../lib/api.js';

const props = defineProps({
  modelValue: Boolean,
  handle: { type: String, default: '' },
  tier: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'claimed']);

const name = ref('');
const description = ref('');
const websiteUrl = ref('');
const whatsapp = ref('');
const location = ref(null);
const placeQuery = ref('');
const places = ref([]);
const searching = ref(false);
const busy = ref(false);
const error = ref(null);

watch(() => props.modelValue, (open) => {
  if (open) { error.value = null; }
});

// Debounced, and only from three characters — every keystroke is a billed
// Location Service request otherwise.
let timer;
watch(placeQuery, (q) => {
  clearTimeout(timer);
  if (!q || q.length < 3) { places.value = []; return; }
  searching.value = true;
  timer = setTimeout(async () => {
    try { places.value = (await api.searchPlaces(q)).items ?? []; }
    catch { places.value = []; }
    finally { searching.value = false; }
  }, 400);
});

const nameValid = computed(() => name.value.trim().length > 0 && name.value.length <= 60);
const descValid = computed(() => description.value.length <= 160);
const urlValid = computed(() => !websiteUrl.value.trim() || /^https:\/\/\S+\.\S+/.test(websiteUrl.value.trim()));
// E.164 — wa.me accepts nothing else, and a bad number fails silently.
const waValid = computed(() => !whatsapp.value.trim() || /^\+[1-9]\d{7,14}$/.test(whatsapp.value.replace(/[\s()\-.]/g, '')));
const canSubmit = computed(() => nameValid.value && descValid.value && urlValid.value && waValid.value && !busy.value);

async function claim() {
  busy.value = true; error.value = null;
  try {
    // Reserve first. If the profile save fails the hold still stands, so the
    // handle is not lost to someone else while the form is corrected.
    await api.reserve(props.handle);
    await api.setProfile(props.handle, {
      displayName: name.value.trim(),
      tagline: description.value.trim() || undefined,
      websiteUrl: websiteUrl.value.trim() || undefined,
      whatsapp: whatsapp.value.replace(/[\s()\-.]/g, '') || undefined,
      location: location.value
        ? { label: location.value.label, lat: location.value.lat, lon: location.value.lon }
        : undefined,
      actions: [],
    });
    emit('claimed', props.handle);
    emit('update:modelValue', false);
  } catch (err) {
    error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" scrollable
            @update:model-value="emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="pt-5 px-6">
        <div class="text-h6">Claim yandle.world/{{ handle }}</div>
        <div v-if="tier" class="text-body-2 text-medium-emphasis mt-1">
          Free for {{ tier.holdLabel }} — no payment now.
        </div>
      </v-card-title>

      <v-card-text class="px-6">
        <v-text-field
          v-model="name" label="Name" placeholder="Apex Coffee Roasters"
          variant="outlined" density="comfortable" counter="60"
          :error="!!name && !nameValid" class="mb-3" autofocus
        />
        <v-textarea
          v-model="description" label="Description" rows="2" auto-grow
          placeholder="Small-batch coffee from a vintage truck."
          variant="outlined" density="comfortable" counter="160"
          :error="!descValid" class="mb-3"
        />
        <v-text-field
          v-model="websiteUrl" label="Website" placeholder="https://example.com"
          variant="outlined" density="comfortable" class="mb-3"
          :error="!urlValid" :error-messages="!urlValid ? 'Must start with https://' : ''"
        />
        <v-autocomplete
          v-model="location" v-model:search="placeQuery"
          :items="places" item-title="label" return-object
          :loading="searching" no-filter clearable
          label="Location" placeholder="Start typing an address"
          variant="outlined" density="comfortable" class="mb-3"
          :no-data-text="placeQuery.length < 3 ? 'Type at least three characters' : 'No matches'"
        />
        <v-text-field
          v-model="whatsapp" label="WhatsApp" placeholder="+919845012345"
          variant="outlined" density="comfortable"
          :error="!waValid"
          :error-messages="!waValid ? 'Include the country code, e.g. +91…' : ''"
          hint="With country code. This becomes a one-tap chat link."
          persistent-hint
        />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4">{{ error }}</v-alert>
      </v-card-text>

      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" :disabled="busy" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" :loading="busy" @click="claim">
          Hold it free
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
