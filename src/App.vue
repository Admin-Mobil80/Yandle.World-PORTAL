<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { parseHandle, formatPrice, ERRORS } from './lib/parse.js';
import { loadConfig } from './lib/config.js';
import { SEED } from './lib/seed.js';
import { useVoice } from './composables/useVoice.js';
import WordSlots from './components/WordSlots.vue';
import SignInDialog from './components/SignInDialog.vue';
import ClaimDialog from './components/ClaimDialog.vue';
import MyHandle from './components/MyHandle.vue';
import Trending from './components/Trending.vue';
import StatsBar from './components/StatsBar.vue';
import { getSession, signOut } from './lib/auth.js';
import HandleResult from './components/HandleResult.vue';
import YandleWordmark from './components/YandleWordmark.vue';
import UpdateBanner from './components/UpdateBanner.vue';


const config = ref(SEED);
const slots = ref([null]);          // one dropdown to start; up to four
const availability = ref(null);
const checking = ref(false);

onMounted(async () => {
  // The callback fires when the server's pool differs from the cached one,
  // so a word added in the BMS shows up without a hard refresh.
  config.value = await loadConfig((fresh) => { config.value = fresh; });
});

const words = computed(() => slots.value.filter(Boolean));
const handle = computed(() => (words.value.length ? words.value.join('-') : ''));
const parsed = computed(() => parseHandle(handle.value, config.value));

const heardButUnknown = ref([]);

const voice = useVoice(({ transcript, alternatives }) => {
  // Prefer whichever alternative is a legal handle — the top ASR guess is
  // often a near-miss ("cold" for "gold") the pool itself can arbitrate.
  const legal = alternatives.find((alt) => parseHandle(alt, config.value, { stripFiller: true }).valid)
    ?? transcript;
  const spoken = parseHandle(legal, config.value, { stripFiller: true });

  // Only put words that are actually in the pool into the picker. parseHandle
  // returns every token it heard, valid or not, and writing those straight in
  // left the dropdowns showing words nobody can select or resolve.
  const pool = new Set(config.value.words);
  const usable = spoken.words.filter((w) => pool.has(w)).slice(0, config.value.maxWords);
  heardButUnknown.value = spoken.words.filter((w) => !pool.has(w));

  if (usable.length) slots.value = usable;
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

const session = ref(getSession());
const showSignIn = ref(false);
const showClaim = ref(false);
const claimed = ref(null);
const myHandle = ref(null);
const stats = ref(null);

/** Claiming needs an account; signing in is the first step of it, not a wall. */
const alreadyHolds = ref(null);

function startClaim() {
  if (!session.value) { showSignIn.value = true; return; }
  // One account, one handle. Finding that out after filling in five fields is
  // a waste of the person's time — the server enforces it either way.
  if (alreadyHolds.value) return;
  showClaim.value = true;
}
function onSignedIn(next) {
  session.value = next;
  showClaim.value = true;   // resume what they were doing
}

/** Leave nothing from the previous account on screen. */
function doSignOut() {
  signOut();
  session.value = null;
  claimed.value = null;
  slots.value = [null];
  heardButUnknown.value = [];
  // MyHandle unmounts with the session, so it never emits null on the way
  // out — without this the claim button stays disabled for the next person
  // to sign in on the same browser.
  alreadyHolds.value = null;
}
function onClaimed(h) {
  claimed.value = h;
  // Refresh rather than optimistically render: the server decides the hold
  // window and status, and guessing them here would drift.
  myHandle.value?.load();
}
function go() {
  window.location.assign(`/${parsed.value.handle}`);
}

function surpriseMe() {
  // Three words, not four: the 3-word tier is the one most people actually
  // want, and a suggestion should land on something they might claim.
  const pool = config.value.words;
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  const words = [];
  while (words.length < 3) {
    const w = pick();
    // A repeat reads like a bug in a suggestion, even though gold-gold is legal.
    if (!words.includes(w)) words.push(w);
  }
  slots.value = words;
}
</script>

<template>
  <v-app>
    <UpdateBanner />
    <v-main>
      <v-container class="page" max-width="580">
        <div class="topbar mb-5">
          <StatsBar :stats="stats" />
          <div v-if="session" class="account">
            <span class="email">{{ session.email }}</span>
            <v-btn size="x-small" variant="text" @click="doSignOut">Sign out</v-btn>
          </div>
        </div>

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
          :already-holds="alreadyHolds?.handle ?? null"
          @claim="startClaim"
          @go="go"
          @suggest="(w) => { const i = slots.findIndex((s) => !config.words.includes(s)); if (i >= 0) { const n = [...slots]; n[i] = w; slots = n; } }"
        />

        <v-alert
          v-if="heardButUnknown.length" type="info" variant="tonal"
          density="compact" class="mt-3"
        >
          Heard
          <template v-for="(w, i) in heardButUnknown" :key="w">
            <code>{{ w }}</code><span v-if="i < heardButUnknown.length - 1">, </span>
          </template>
          — not in the word list, so {{ heardButUnknown.length > 1 ? 'they were' : 'it was' }} skipped.
        </v-alert>

        <div v-if="session" class="mt-6">
          <MyHandle ref="myHandle" @loaded="alreadyHolds = $event" @released="alreadyHolds = null" />
        </div>

        <Trending @stats="stats = $event" />

        <div class="text-center mt-6">
          <v-btn variant="text" size="small" prepend-icon="mdi-dice-5-outline" @click="surpriseMe">
            Surprise me
          </v-btn>
        </div>

        <SignInDialog
          v-model="showSignIn"
          reason="Claiming a handle needs a verified email. We send a six-digit code."
          @signed-in="onSignedIn"
        />
        <ClaimDialog
          v-model="showClaim"
          :handle="parsed.handle"
          :tier="parsed.tier"
          @claimed="onClaimed"
        />

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
.page { padding-top: 6vh; }

/* Stats centred, account pinned right. On a narrow screen they stack rather
   than the email squeezing the stats bar out of shape. */
.topbar {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: .75rem;
}
.topbar > :first-child { grid-column: 2; justify-self: center; }
.account { grid-column: 3; justify-self: end; display: flex; align-items: center; gap: .25rem; }
.account .email {
  font-size: .75rem; opacity: .6; max-width: 14rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (max-width: 600px) {
  .topbar { grid-template-columns: 1fr; }
  .topbar > :first-child, .account { grid-column: 1; justify-self: center; }
}
footer a { color: rgb(var(--v-theme-on-surface)); opacity: 0.6; text-decoration: none; }
footer a:hover { opacity: 1; text-decoration: underline; }
.listening { animation: pulse 1.1s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(166, 58, 30, 0.18); } }
@media (prefers-reduced-motion: reduce) { .listening { animation: none; } }
</style>
