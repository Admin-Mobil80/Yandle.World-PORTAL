<script setup>
import { computed, onUnmounted, ref } from 'vue';

/**
 * Location capture with no geocoding service behind it.
 *
 * The picker lives under /app/ because that prefix already has a CloudFront
 * behaviour pointing at the static bucket. At the root it would fall through
 * to the default behaviour, which hands everything to the handle resolver —
 * and "pick-location.html" is not a Yandle.
 *
 * This used to call AWS Location Service to search addresses and to reverse
 * geocode the browser's coordinates into a readable street address. That is
 * gone: a map picker opens in its own window, the person places a pin, and
 * the only thing that comes back is a latitude and longitude.
 *
 * The consequence is deliberate and worth being explicit about — without a
 * geocoder nothing can invent an address from coordinates, so the label is
 * whatever the owner types. It is free text, optional, and purely a caption
 * for the pin.
 */
const props = defineProps({
  modelValue: { type: Object, default: null },   // { lat, lon, label? }
});
const emit = defineEmits(['update:modelValue']);

const picking = ref(false);
let popup = null;
let listener = null;

const coords = computed(() => {
  const v = props.modelValue;
  return v && v.lat != null && v.lon != null ? `${v.lat}, ${v.lon}` : null;
});

const label = computed({
  get: () => props.modelValue?.label ?? '',
  set: (text) => {
    const v = props.modelValue;
    if (!v) return;
    emit('update:modelValue', { ...v, label: text || undefined });
  },
});

/** Static preview of the pin. Keyless Google embed — display only. */
const previewSrc = computed(() => {
  const v = props.modelValue;
  if (!v || v.lat == null) return null;
  return `https://maps.google.com/maps?q=${v.lat},${v.lon}&z=16&output=embed`;
});

function openPicker() {
  const v = props.modelValue;
  const qs = v?.lat != null ? `?lat=${v.lat}&lon=${v.lon}` : '';
  const w = 520, h = 620;
  // Centred on the parent window rather than the screen — on a multi-monitor
  // setup screen coordinates can land it on the wrong display.
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);

  popup = window.open(
    `/app/pick-location.html${qs}`,
    'yandle-location',
    `width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`,
  );

  if (!popup) return;   // blocked; the inline button stays available
  picking.value = true;

  if (!listener) {
    listener = (event) => {
      // Both checks matter: a message from any other origin, or of any other
      // shape, is somebody else's traffic and must be ignored.
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'yandle:location') return;
      emit('update:modelValue', {
        lat: event.data.lat,
        lon: event.data.lon,
        // A label already typed survives a re-pick.
        label: props.modelValue?.label,
      });
      picking.value = false;
    };
    window.addEventListener('message', listener);
  }

  // The popup can be closed without choosing anything, and that fires no
  // message at all — so the "waiting" state has to be cleared by watching it.
  const poll = setInterval(() => {
    if (popup?.closed) {
      clearInterval(poll);
      picking.value = false;
    }
  }, 500);
}

function clear() {
  emit('update:modelValue', null);
}

onUnmounted(() => {
  if (listener) window.removeEventListener('message', listener);
  listener = null;
});
</script>

<template>
  <div class="loc-field">
    <div class="text-caption text-medium-emphasis mb-2">Location</div>

    <template v-if="coords">
      <iframe
        v-if="previewSrc" class="preview" :src="previewSrc"
        loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Selected location"
      />
      <div class="d-flex align-center ga-2 mt-2">
        <v-icon icon="mdi-map-marker" size="18" color="primary" />
        <span class="coords flex-grow-1">{{ coords }}</span>
        <v-btn size="small" variant="text" @click="openPicker">Change</v-btn>
        <v-btn size="small" variant="text" color="error" @click="clear">Remove</v-btn>
      </div>
      <v-text-field
        v-model="label"
        label="Address to show (optional)"
        placeholder="Vidyaranyapura, Bangalore"
        variant="outlined" density="comfortable" class="mt-2"
        hint="Free text. We no longer look addresses up, so this is whatever you want shown under the pin."
        persistent-hint
      />
    </template>

    <template v-else>
      <v-btn
        variant="tonal" size="small" prepend-icon="mdi-map-search-outline"
        :loading="picking" @click="openPicker"
      >Pick on map</v-btn>
      <div class="text-caption text-medium-emphasis mt-1">
        Opens a map. Drop a pin or use your current location — only the
        coordinates are saved.
      </div>
    </template>
  </div>
</template>

<style scoped>
.loc-field { margin: 0 0 1.25rem; }
.preview {
  width: 100%; height: 150px; border: 1px solid rgba(128,128,128,.3);
  border-radius: 12px; display: block;
}
.coords {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .8rem;
}
</style>
