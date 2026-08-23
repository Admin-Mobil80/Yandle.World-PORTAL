<script setup>
import { computed, onMounted, ref } from 'vue';
import { parseHandle, formatPrice, ERRORS } from './lib/parse.js';
import { loadConfig } from './lib/config.js';
import { SEED } from './lib/seed.js';
import { useVoice } from './composables/useVoice.js';
import HandleResult from './components/HandleResult.vue';

const config = ref(SEED);        // replaced by the server's pool on mount
const input = ref('');
const fromVoice = ref(false);

onMounted(async () => { config.value = await loadConfig(); });

const parsed = computed(() =>
  parseHandle(input.value, config.value, { stripFiller: fromVoice.value }));

const purchase = computed(() => {
  const tier = parsed.value.tier;
  if (!tier) return null;
  return { path: tier.purchasePath, priceCents: tier.buyoutCents };
});

const voice = useVoice(({ transcript, alternatives }) => {
  // Prefer whichever alternative is actually a legal handle. The top ASR
  // guess is often a near-miss ("cold" for "gold") that the pool itself can
  // arbitrate, with no round-trip.
  const legal = alternatives.find(
    (alt) => parseHandle(alt, config.value, { stripFiller: true }).valid);
  fromVoice.value = true;
  input.value = legal ?? transcript;
});

function pick(handle) {
  fromVoice.value = false;
  input.value = handle;
}

function surpriseMe() {
  const pool = config.value.words;
  pick(Array.from({ length: 4 },
    () => pool[Math.floor(Math.random() * pool.length)]).join('-'));
}
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="page" max-width="560">
        <header class="text-center mb-8">
          <h1 class="text-h4 font-weight-bold">
            Yandle<span class="text-medium-emphasis">.world</span>
          </h1>
          <p class="text-medium-emphasis mt-2">Say up to four words. Reach anything.</p>
        </header>

        <v-text-field
          v-model="input"
          placeholder="sky bird lake"
          variant="solo" rounded="pill" hide-details
          autocapitalize="off" autocorrect="off" spellcheck="false"
          aria-label="Handle to look up"
          @update:model-value="fromVoice = false"
        >
          <template #append-inner>
            <v-btn
              :icon="voice.listening.value ? 'mdi-stop' : 'mdi-microphone'"
              :color="voice.listening.value ? 'error' : 'primary'"
              :disabled="!voice.supported"
              :class="{ listening: voice.listening.value }"
              :aria-label="voice.listening.value ? 'Stop listening' : 'Search by voice'"
              size="small" variant="flat"
              @click="voice.listening.value ? voice.stop() : voice.start()"
            />
          </template>
        </v-text-field>

        <p v-if="!voice.supported" class="text-caption text-medium-emphasis mt-2 text-center">
          Voice search needs Chrome or Safari. Typing works everywhere.
        </p>

        <HandleResult
          class="mt-6"
          :parsed="parsed" :errors="ERRORS"
          :purchase="purchase" :format-price="formatPrice"
          @pick="pick"
        />

        <div class="text-center mt-6">
          <v-btn variant="text" size="small" @click="surpriseMe">Surprise me</v-btn>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.page { padding-top: 12vh; }
.listening { animation: pulse 1.1s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(166, 58, 30, 0.18); } }
@media (prefers-reduced-motion: reduce) { .listening { animation: none; } }
</style>
