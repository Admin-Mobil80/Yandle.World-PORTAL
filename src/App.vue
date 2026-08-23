<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { parseHandle, formatPrice, snapToPool, ERRORS } from './lib/parse.js';
import { api } from './lib/api.js';
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
const voiceCorrections = ref([]);

const voice = useVoice(({ transcript, alternatives }) => {
  // Prefer whichever alternative is a legal handle — the top ASR guess is
  // often a near-miss ("cold" for "gold") the pool itself can arbitrate.
  const legal = alternatives.find((alt) => parseHandle(alt, config.value, { stripFiller: true }).valid)
    ?? transcript;
  const spoken = parseHandle(legal, config.value, { stripFiller: true });

  // Snap each token onto the nearest pool word before giving up on it. The
  // recogniser does not know only ~120 words exist, so it returns real
  // English like "red" or "flag"; dropping those was why speaking a Yandle
  // so often produced nothing at all.
  const pool = config.value.words;
  const poolSet = new Set(pool);
  const usable = [];
  const unknown = [];
  const corrected = [];

  for (const heard of spoken.words) {
    if (poolSet.has(heard)) { usable.push(heard); continue; }
    const snapped = snapToPool(heard, pool);
    if (snapped) { usable.push(snapped); corrected.push([heard, snapped]); }
    else unknown.push(heard);
  }

  heardButUnknown.value = unknown;
  voiceCorrections.value = corrected;
  if (usable.length) slots.value = usable.slice(0, config.value.maxWords);
}, { transcribe: api.transcribe });

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

const pendingClaim = ref(false);

function startClaim() {
  if (!session.value) { pendingClaim.value = true; showSignIn.value = true; return; }
  // One account, one handle. Finding that out after filling in five fields is
  // a waste of the person's time — the server enforces it either way.
  if (alreadyHolds.value) return;
  showClaim.value = true;
}
function onSignedIn(next) {
  session.value = next;
  // Only continue into the claim form if a claim is what they started. Someone
  // who used the Sign in button just wants to see their own Yandle.
  if (pendingClaim.value) { showClaim.value = true; pendingClaim.value = false; }
}

/** Leave nothing from the previous account on screen. */
function doSignOut() {
  signOut();
  session.value = null;
  claimed.value = null;
  slots.value = [null];
  heardButUnknown.value = [];
  voiceCorrections.value = [];
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

const surprising = ref(false);

async function surpriseMe() {
  surprising.value = true;
  try {
    // The server composes it and guarantees the result is unclaimed and made
    // only of live pool words; it falls back to random if the model is down.
    const res = await fetch('/api/surprise?words=3', { cache: 'no-store' });
    const body = await res.json();
    const words = String(body?.data?.handle ?? '').split('-').filter(Boolean);
    if (words.length) { slots.value = words; return; }
    throw new Error('no suggestion');
  } catch {
    const pool = config.value.words;
    const words = [];
    while (words.length < 3) {
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (!words.includes(w)) words.push(w);
    }
    slots.value = words;
  } finally {
    surprising.value = false;
  }
}
</script>

<template>
  <v-app>
    <UpdateBanner />
    <v-main>
      <v-container class="page" max-width="580">
        <div class="text-center mb-5">
          <StatsBar :stats="stats" />
        </div>

        <header class="text-center mb-8">
          <YandleWordmark size="large" class="justify-center" />
          <p class="text-medium-emphasis mt-3">Say it. Don't spell it.</p>
        </header>

        <v-card variant="outlined" class="pa-4 pa-sm-5">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-2">Build your Yandle</span>
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
          v-if="voiceCorrections.length" type="success" variant="tonal"
          density="compact" class="mt-3"
        >
          Heard
          <template v-for="([from, to], i) in voiceCorrections" :key="from + i">
            <code>{{ from }}</code> → <strong>{{ to }}</strong><span v-if="i < voiceCorrections.length - 1">, </span>
          </template>
        </v-alert>

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

        <div v-if="session" class="mt-8">
          <div class="account-row mb-2">
            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" size="small" variant="tonal" rounded="pill" class="acct-btn">
                  <span class="avatar">{{ session.email[0].toUpperCase() }}</span>
                  <span class="email">{{ session.email }}</span>
                </v-btn>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item :subtitle="session.email" title="Signed in" />
                <v-divider />
                <v-list-item title="Sign out" prepend-icon="mdi-logout" @click="doSignOut" />
              </v-list>
            </v-menu>
          </div>
          <MyHandle ref="myHandle" @loaded="alreadyHolds = $event" @released="alreadyHolds = null" />
        </div>

        <div v-else class="text-center mt-8">
          <v-btn size="small" variant="tonal" rounded="pill" prepend-icon="mdi-login" @click="showSignIn = true">
            Sign in
          </v-btn>
        </div>

        <Trending @stats="stats = $event" />

        <div class="text-center mt-6">
          <v-btn
            variant="text" size="small" prepend-icon="mdi-auto-fix"
            :loading="surprising" @click="surpriseMe"
          >Surprise me</v-btn>
        </div>

        <SignInDialog
          v-model="showSignIn"
          reason="Claiming a Yandle needs a verified email. We send a six-digit code."
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

.account-row { display: flex; justify-content: flex-end; }
.acct-btn { text-transform: none; letter-spacing: 0; }
.account .avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; margin-right: .45rem;
  background: rgb(var(--v-theme-primary)); color: #fff;
  font-size: .7rem; font-weight: 700;
}
.account .email {
  font-size: .78rem; max-width: 12rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (max-width: 600px) { .account .email { display: none; } }

footer a { color: rgb(var(--v-theme-on-surface)); opacity: 0.6; text-decoration: none; }
footer a:hover { opacity: 1; text-decoration: underline; }
.listening { animation: pulse 1.1s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(166, 58, 30, 0.18); } }
@media (prefers-reduced-motion: reduce) { .listening { animation: none; } }
</style>
