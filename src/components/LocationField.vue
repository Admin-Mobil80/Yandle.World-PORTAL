<script setup>
import { computed, ref, watch } from 'vue';
import { api } from '../lib/api.js';

/**
 * Address picker.
 *
 * Two things the first version got wrong:
 *
 *  1. It swallowed search errors, so an API failure rendered as "no matches"
 *     — indistinguishable from a genuinely unknown address, and impossible
 *     for the user to act on.
 *  2. It had no free-text fallback, so a lookup failure was a dead end on a
 *     form the user had already filled in. The address is the user's own
 *     information; the service is a convenience, not a gatekeeper.
 */
const props = defineProps({ modelValue: { type: Object, default: null } });
const emit = defineEmits(['update:modelValue']);

const query = ref('');
const results = ref([]);
const searching = ref(false);
const error = ref(null);
const manual = ref(false);
const locating = ref(false);

/**
 * Browser geolocation, reverse-geocoded to a readable address.
 *
 * Only ever called from a click. A permission prompt that appears on page
 * load, unprompted, is the fastest way to get it denied permanently — and a
 * denied permission cannot be re-requested without the user digging through
 * browser settings.
 */
function useCurrentLocation() {
  if (!navigator.geolocation) {
    error.value = 'This browser cannot share a location.';
    return;
  }
  locating.value = true;
  error.value = null;

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const place = await api.reverseGeocode(coords.latitude, coords.longitude);
        emit('update:modelValue', { label: place.label, lat: place.lat, lon: place.lon });
        query.value = '';
        results.value = [];
      } catch (err) {
        error.value = err.message;
      } finally {
        locating.value = false;
      }
    },
    (err) => {
      locating.value = false;
      error.value = err.code === err.PERMISSION_DENIED
        ? 'Location permission was denied. Type your address instead.'
        : 'Could not get your location. Type your address instead.';
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
  );
}

const MIN_CHARS = 3;
const tooShort = computed(() => query.value.trim().length > 0 && query.value.trim().length < MIN_CHARS);

let timer;
watch(query, (q) => {
  clearTimeout(timer);
  error.value = null;
  const text = q.trim();
  if (text.length < MIN_CHARS) { results.value = []; return; }

  searching.value = true;
  // Debounced — every keystroke is a billed lookup otherwise.
  timer = setTimeout(async () => {
    try {
      results.value = (await api.searchPlaces(text)).items ?? [];
    } catch (err) {
      results.value = [];
      error.value = err.message;
    } finally {
      searching.value = false;
    }
  }, 350);
});

function choose(place) {
  emit('update:modelValue', { label: place.label, lat: place.lat, lon: place.lon });
  query.value = '';
  results.value = [];
}

function clear() {
  emit('update:modelValue', null);
  manual.value = false;
}

function useTyped() {
  const label = query.value.trim();
  if (!label) return;
  // No coordinates — validateProfile accepts a label alone, and half a
  // coordinate pair would put a map pin in the wrong ocean.
  emit('update:modelValue', { label });
  query.value = '';
  results.value = [];
  manual.value = false;
}
</script>

<template>
  <div>
    <!-- Chosen state: show it plainly, with one obvious way to change it. -->
    <v-sheet v-if="modelValue" border rounded class="pa-3 d-flex align-start ga-3">
      <v-icon icon="mdi-map-marker" size="20" class="mt-1 text-primary" />
      <div class="flex-grow-1">
        <div class="text-body-2">{{ modelValue.label }}</div>
        <div v-if="modelValue.lat == null" class="text-caption text-medium-emphasis">
          Typed manually — no map pin
        </div>
      </div>
      <v-btn size="small" variant="text" @click="clear">Change</v-btn>
    </v-sheet>

    <template v-else>
      <v-text-field
        v-model="query"
        label="Location"
        placeholder="Start typing your address or area"
        variant="outlined" density="comfortable"
        :loading="searching"
        prepend-inner-icon="mdi-map-marker-outline"
        :hint="tooShort ? `Keep typing — ${MIN_CHARS} characters minimum` : 'Search, or type your own and use it as-is'"
        persistent-hint
        clearable
      />

      <div class="d-flex justify-end mt-1 mb-1">
        <v-btn
          size="small" variant="text" prepend-icon="mdi-crosshairs-gps"
          :loading="locating" @click="useCurrentLocation"
        >Use my current location</v-btn>
      </div>

      <v-list v-if="results.length" density="compact" class="mt-1 rounded border">
        <v-list-item
          v-for="(p, i) in results" :key="i"
          :title="p.label" @click="choose(p)"
        >
          <template #prepend><v-icon icon="mdi-map-marker-outline" size="18" /></template>
        </v-list-item>
      </v-list>

      <!-- An error is not "no matches". Say which, and still let them past. -->
      <v-alert
        v-else-if="error" type="warning" variant="tonal" density="compact" class="mt-2"
      >
        <p class="mb-1 text-body-2">Address lookup is unavailable right now.</p>
        <p class="mb-2 text-caption">{{ error }}</p>
        <v-btn size="small" variant="tonal" :disabled="!query.trim()" @click="useTyped">
          Use “{{ query.trim() }}” as typed
        </v-btn>
      </v-alert>

      <div
        v-else-if="query.trim().length >= MIN_CHARS && !searching"
        class="mt-2 d-flex align-center ga-2"
      >
        <span class="text-caption text-medium-emphasis">No matches.</span>
        <v-btn size="small" variant="text" @click="useTyped">Use it as typed</v-btn>
      </div>
    </template>
  </div>
</template>
