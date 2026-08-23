<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { parseHandle, formatPrice, ERRORS } from './lib/parse.js';
import { loadConfig } from './lib/config.js';
import { SEED } from './lib/seed.js';
import { useVoice } from './composables/useVoice.js';
import WordSlots from './components/WordSlots.vue';
import HandleResult from './components/HandleResult.vue';
import YandleWordmark from './components/YandleWordmark.vue';
import PricingPage from './pages/PricingPage.vue';
import TermsPage from './pages/TermsPage.vue';
import PrivacyPage from './pages/PrivacyPage.vue';
import RefundsPage from './pages/RefundsPage.vue';

/**
 * Path-based view switch rather than vue-router.
 *
 * These are four static documents, not an application with navigation state.
 * A router would add a dependency and a history layer to solve a problem that
 * `location.pathname` already answers. CloudFront maps each path to the SPA
 * shell (see infra/hosting.yaml), so a hard load of /terms works.
 */
const PAGES = {
  '/pricing': PricingPage,
  '/terms': TermsPage,
  '/privacy': PrivacyPage,
  '/refunds': RefundsPage,
};
const staticPage = PAGES[window.location.pathname.replace(/\/$/, '')] ?? null;

const config = ref(SEED);
const slots = ref([null]);          // one dropdown to start; up to four
const availability = ref(null);
const checking = ref(false);

onMounted(async () => { config.value = await loadConfig(); });

const words = computed(() => slots.value.filter(Boolean));
const handle = computed(() => (words.value.length ? words.value.join('-') : ''));
const parsed = computed(() => parseHandle(handle.value, config.value));

const voice = useVoice(({ transcript, alternatives }) => {
  // Prefer whichever alternative is a legal handle — the top ASR guess is
  // often a near-miss ("cold" for "gold") the pool itself can arbitrate.
  const legal = alternatives.find((alt) => parseHandle(alt, config.value, { stripFiller: true }).valid)
    ?? transcript;
  const spoken = parseHandle(legal, config.value, { stripFiller: true });
  if (spoken.words.length) slots.value = spoken.words.slice(0, config.value.maxWords);
});

// Ask the server only for a complete, locally-valid handle. Debounced, because
// every dropdown change would otherwise be a round-trip.
let timer;
watch(handle, (h) => {
  clearTimeout(timer);
  availability.value = null;
  if (!parsed.value.valid) return;
  checking.value = true;
  timer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/availability`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: h }),
      });
      const body = await res.json();
      availability.value = body?.data ?? null;
    } catch {
      availability.value = null;   // the local result still stands
    } finally {
      checking.value = false;
    }
  }, 350);
});

function surpriseMe() {
  const pool = config.value.words;
  slots.value = Array.from({ length: 4 }, () => pool[Math.floor(Math.random() * pool.length)]);
}
</script>

<template>
  <v-app>
    <v-main>
      <component :is="staticPage" v-if="staticPage" />

      <v-container v-else class="page" max-width="580">
        <header class="text-center mb-8">
          <YandleWordmark size="large" class="justify-center" />
          <p class="text-medium-emphasis mt-3">Pick up to four words. Reach anything.</p>
        </header>

        <v-card variant="outlined" class="pa-4 pa-sm-5">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-2">Build your handle</span>
            <v-btn
              :icon="voice.listening.value ? 'mdi-stop' : 'mdi-microphone'"
              :color="voice.listening.value ? 'error' : 'primary'"
              :disabled="!voice.supported"
              :class="{ listening: voice.listening.value }"
              :aria-label="voice.listening.value ? 'Stop listening' : 'Speak your handle'"
              size="small" variant="flat"
              @click="voice.listening.value ? voice.stop() : voice.start()"
            />
          </div>

          <WordSlots
            :slots="slots"
            :config="config"
            :max-words="config.maxWords"
            @update:slots="slots = $event"
          />

          <p v-if="!voice.supported" class="text-caption text-medium-emphasis mt-3 mb-0">
            Voice needs Chrome or Safari. The dropdowns work everywhere.
          </p>
        </v-card>

        <HandleResult
          class="mt-5"
          :parsed="parsed"
          :errors="ERRORS"
          :availability="availability"
          :checking="checking"
          :format-price="formatPrice"
        />

        <div class="text-center mt-6">
          <v-btn variant="text" size="small" prepend-icon="mdi-dice-5-outline" @click="surpriseMe">
            Surprise me
          </v-btn>
        </div>

        <footer class="text-center mt-10 text-caption">
          <a href="/pricing" class="mx-2">Pricing</a>
          <a href="/terms" class="mx-2">Terms</a>
          <a href="/privacy" class="mx-2">Privacy</a>
          <a href="/refunds" class="mx-2">Refunds</a>
        </footer>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.page { padding-top: 8vh; }
footer a { color: rgb(var(--v-theme-on-surface)); opacity: 0.6; text-decoration: none; }
footer a:hover { opacity: 1; text-decoration: underline; }
.listening { animation: pulse 1.1s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(166, 58, 30, 0.18); } }
@media (prefers-reduced-motion: reduce) { .listening { animation: none; } }
</style>
