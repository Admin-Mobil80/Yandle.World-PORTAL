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
const poolChanged = ref([]);
// Matches the slot labels in WordSlots, so the warning names the same field
// the person is looking at.
const ORDINAL_NAMES = ['first', 'second', 'third', 'fourth'];
const checking = ref(false);

onMounted(async () => {
  // The callback fires when the server's pool differs from the cached one,
  // so a word added in the BMS shows up without a hard refresh.
  config.value = await loadConfig((fresh) => {
    config.value = fresh;
    // The pool changed under an open tab. Any slot holding a word that is
    // gone would render a handle the server rejects, with no clue why — so
    // drop exactly those and leave the rest of their selection alone.
    const stale = slots.value.filter((w) => w && !fresh.words.includes(w));
    if (stale.length) {
      slots.value = slots.value.map((w) => (w && fresh.words.includes(w) ? w : null));
      poolChanged.value = stale;
    }
  });

  // Arrived from a not-found page's "Claim it for $X" button, which links to
  // /?claim=almond-bloom. Pre-fill the builder so they carry straight on
  // instead of retyping the Yandle they just tried to open.
  prefillFromQuery();

  // Arrived from a transfer-invite email, which links to
  // /transfer/<handle>?token=<token> (see initiateTransfer's accept_url).
  detectTransferLink();
});

/** Populate the accept-transfer state from the URL, then take it out of the address bar. */
function detectTransferLink() {
  const match = window.location.pathname.match(/\/transfer\/([^/?]+)/);
  const token = new URLSearchParams(window.location.search).get('token');
  if (!match || !token) return;

  transferHandle.value = decodeURIComponent(match[1]);
  transferToken.value = token;
  if (!session.value) showSignIn.value = true;
  else acceptTransferNow();

  window.history.replaceState({}, '', '/');
}

const transferHandle = ref(null);
const transferToken = ref(null);
const acceptingTransfer = ref(false);
const transferAcceptError = ref(null);
const transferAccepted = ref(null);

async function acceptTransferNow() {
  if (!transferHandle.value || !transferToken.value) return;
  acceptingTransfer.value = true;
  transferAcceptError.value = null;
  try {
    const data = await api.acceptTransfer(transferHandle.value, transferToken.value);
    transferAccepted.value = data;
  } catch (err) {
    transferAcceptError.value = err.message;
  } finally {
    acceptingTransfer.value = false;
  }
}

/** Populate the slots from ?claim=, then take it out of the address bar. */
function prefillFromQuery() {
  const wanted = new URLSearchParams(window.location.search).get('claim');
  if (!wanted) return;

  const picked = wanted.toLowerCase().split('-').filter(Boolean);
  // Only words the live pool actually has. A stale link from before a pool
  // change would otherwise fill the builder with words the server rejects.
  if (!picked.length || picked.length > config.value.maxWords) return;
  if (!picked.every((w) => config.value.words.includes(w))) return;

  slots.value = picked;
  // Reserving needs an account, so send them through sign-in first rather
  // than letting them fill in the whole profile and hit a wall at the end.
  pendingClaim.value = true;
  if (!session.value) showSignIn.value = true;
  else showClaim.value = true;

  // Cleaned so a refresh — or a shared link — does not reopen the dialog.
  window.history.replaceState({}, '', window.location.pathname);
}

const words = computed(() => slots.value.filter(Boolean));

/**
 * An empty slot with a filled one after it.
 *
 * filter(Boolean) silently closes the gap, so [empty, "anchor"] became the
 * one-word handle "anchor" — the $1,000 Premium tier — while the screen
 * showed someone half-way through picking two words at $100. They could have
 * reserved, and been charged for, a tier they never chose. Blocked outright
 * rather than auto-collapsed: we cannot know which word they meant to drop.
 */
const gapIndex = computed(() => {
  const firstEmpty = slots.value.findIndex((w) => !w);
  if (firstEmpty === -1) return -1;
  return slots.value.slice(firstEmpty).some(Boolean) ? firstEmpty : -1;
});
const hasGap = computed(() => gapIndex.value !== -1);
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
// One account, one Yandle — so once they hold one, the builder is a dead end
// for claiming. It stays reachable behind a link because it is also the only
// way to look up someone else's Yandle.
const showBuilder = ref(false);
const builderOpen = computed(() => !alreadyHolds.value || showBuilder.value);

const pendingClaim = ref(false);

function startClaim() {
  // Belt to the braces on the result card: nothing may start a claim while
  // the slots have a hole in them.
  if (hasGap.value) return;
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
  if (pendingClaim.value) { showClaim.value = true; pendingClaim.value = false; return; }
  // Likewise, a transfer accept-link is only carried forward when that is
  // what brought them here.
  if (transferHandle.value && transferToken.value) acceptTransferNow();
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

/**
 * How many words a surprise should produce: however many slots are open.
 *
 * Offered for three and four words only. One- and two-word Yandles are the
 * $1,000 and $100 tiers and there are very few of them — generating those at
 * random burns scarce inventory on nobody in particular, and the person
 * paying that much has a specific phrase in mind anyway.
 */
const SURPRISE_TIERS = [3, 4];
const surpriseWords = computed(() => slots.value.length);
const canSurprise = computed(() => SURPRISE_TIERS.includes(surpriseWords.value));

async function surpriseMe() {
  if (!canSurprise.value) return;
  const want = surpriseWords.value;
  surprising.value = true;
  try {
    // The server composes it and guarantees the result is unclaimed and made
    // only of live pool words; it falls back to random if the model is down.
    const res = await fetch(`/api/surprise?words=${want}`, { cache: 'no-store' });
    const body = await res.json();
    const words = String(body?.data?.handle ?? '').split('-').filter(Boolean);
    if (words.length === want) { slots.value = words; return; }
    throw new Error('no suggestion');
  } catch {
    const pool = config.value.words;
    const words = [];
    while (words.length < want) {
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

        <v-card v-if="transferHandle" variant="outlined" class="pa-4 pa-sm-5 mb-6">
          <div v-if="acceptingTransfer" class="text-center py-2">
            <v-progress-circular indeterminate size="22" width="2" class="mb-2" />
            <p class="text-body-2 text-medium-emphasis mb-0">Accepting the transfer…</p>
          </div>
          <template v-else-if="transferAccepted">
            <v-icon icon="mdi-check-circle" color="success" size="28" class="mb-2" />
            <div class="text-subtitle-1 font-weight-medium mb-1">Transfer accepted</div>
            <p class="text-body-2 text-medium-emphasis mb-0">
              <strong>{{ transferHandle }}</strong> moves to you on
              <strong>{{ new Date(transferAccepted.effective_on).toLocaleString() }}</strong>.
              Nothing else to do — it will show up here automatically once it completes.
            </p>
          </template>
          <template v-else-if="transferAcceptError">
            <v-icon icon="mdi-alert-circle" color="error" size="28" class="mb-2" />
            <div class="text-subtitle-1 font-weight-medium mb-1">Could not accept the transfer</div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ transferAcceptError }}</p>
          </template>
          <template v-else-if="!session">
            <p class="text-body-2 text-medium-emphasis mb-0">
              Sign in with the email <strong>{{ transferHandle }}</strong> was sent to, to accept its transfer.
            </p>
          </template>
        </v-card>

        <v-card v-if="!builderOpen" variant="outlined" class="pa-4 pa-sm-5 text-center lookup-card"
                @click="showBuilder = true">
          <v-icon icon="mdi-magnify" size="28" color="primary" class="mb-2" />
          <div class="text-subtitle-1 font-weight-medium mb-1">Look up a Yandle</div>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Say or pick the words to find someone. You already hold yours —
            one account, one Yandle.
          </p>
        </v-card>

        <v-card v-if="builderOpen" variant="outlined" class="pa-4 pa-sm-5">
          <div class="d-flex justify-space-between align-center mb-3">
            <span class="text-subtitle-2">
              {{ alreadyHolds ? 'Search Yandle' : 'Search / Reserve Yandle' }}
            </span>
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

          <!-- Centred, and it now says what it DOES. "Surprise me" tucked in
               the right corner as small grey text read as a footnote; nothing
               told anyone it fills the slots for you, which is the way in for
               someone who has no idea what words are even available. -->
          <!-- Hidden, not disabled, below three words. A greyed control with
               a note explaining why it is greyed is two pieces of furniture
               earning nothing; the offer simply appears once it applies. -->
          <div v-if="canSurprise" class="surprise-row">
            <span class="surprise-rule" aria-hidden="true" />
            <v-btn
              class="surprise-btn"
              variant="tonal"
              size="default"
              prepend-icon="mdi-shimmer"
              :loading="surprising"
              @click="surpriseMe"
            >Surprise me — pick {{ surpriseWords }} words for me</v-btn>
            <span class="surprise-rule" aria-hidden="true" />
          </div>

          <p v-if="!voice.supported" class="text-caption text-medium-emphasis mt-3 mb-0">
            Voice needs Chrome or Safari. The dropdowns work everywhere.
          </p>
        </v-card>

        <v-alert
          v-if="poolChanged.length" type="info" variant="tonal"
          density="compact" class="mt-3" closable
          @click:close="poolChanged = []"
        >
          The word list was updated.
          <strong>{{ poolChanged.join(', ') }}</strong>
          {{ poolChanged.length > 1 ? 'are' : 'is' }} no longer available, so
          {{ poolChanged.length > 1 ? 'those slots have' : 'that slot has' }} been cleared.
        </v-alert>

        <v-alert
          v-if="builderOpen && hasGap"
          type="warning" variant="tonal" density="comfortable" class="mt-4"
        >
          Fill in the <strong>{{ ORDINAL_NAMES[gapIndex] || `word ${gapIndex + 1}` }}</strong>
          slot, or remove it with the ✕ — a gap would change which tier you are buying.
        </v-alert>

        <HandleResult
          v-else-if="builderOpen"
          class="mt-5"
          :parsed="parsed"
          :errors="ERRORS"
          :availability="availability"
          :checking="checking"
          :format-price="formatPrice"
          :already-holds="alreadyHolds?.handle ?? null"
          :signed-in="!!session"
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
          <!-- Sign out was behind a dropdown on the address chip, which is
               not somewhere anyone looks for it. It is a visible button now. -->
          <div class="account-row mb-2">
            <span class="acct-chip">
              <span class="avatar">{{ session.email[0].toUpperCase() }}</span>
              <span class="email">{{ session.email }}</span>
            </span>
            <v-btn size="small" variant="text" prepend-icon="mdi-logout"
                   class="acct-btn" @click="doSignOut">Sign out</v-btn>
          </div>
          <MyHandle ref="myHandle" @loaded="alreadyHolds = $event" @released="alreadyHolds = null" />
        </div>

        <div v-else class="text-center mt-8">
          <v-btn size="small" variant="tonal" rounded="pill" prepend-icon="mdi-login" @click="showSignIn = true">
            Sign in
          </v-btn>
        </div>

        <Trending @stats="stats = $event" />

        <SignInDialog
          v-model="showSignIn"
          :reason="transferHandle
            ? `Sign in with the email ${transferHandle} was sent to accept its transfer. We send a six-digit code.`
            : 'Claiming a Yandle needs a verified email. We send a six-digit code.'"
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
.surprise-row {
  display: flex; align-items: center; gap: .75rem; margin-top: 1rem;
}
/* Hairlines either side so it reads as an alternative to choosing words
   yourself, rather than as another step in the same sequence. */
.surprise-rule {
  flex: 1; height: 1px; background: rgba(128, 128, 128, .25);
}
.surprise-btn {
  text-transform: none; letter-spacing: 0; font-weight: 600; flex: none;
}
@media (max-width: 520px) {
  .surprise-rule { display: none; }
  .surprise-btn { flex: 1; }
}

.lookup-card { cursor: pointer; transition: border-color .15s, background-color .15s; }
.lookup-card:hover { border-color: rgb(var(--v-theme-primary)); background: rgba(0,0,0,.015); }

.page { padding-top: 6vh; }

.account-row { display: flex; align-items: center; justify-content: center; gap: .25rem; }
.acct-chip {
  display: inline-flex; align-items: center;
  padding: .2rem .6rem .2rem .25rem; border-radius: 999px;
  background: rgba(127, 127, 127, .12);
}
.acct-btn { text-transform: none; letter-spacing: 0; }
/* Was .account .avatar — the wrapper was renamed to .account-row when this
   moved out of the top bar, so the rule stopped matching and the initial
   rendered as a bare letter jammed against the address. */
.account-row .avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%; margin-right: .45rem;
  background: rgb(var(--v-theme-primary)); color: #fff;
  font-size: .7rem; font-weight: 700;
}
.account-row .email {
  font-size: .78rem; max-width: 12rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

footer a { color: rgb(var(--v-theme-on-surface)); opacity: 0.6; text-decoration: none; }
footer a:hover { opacity: 1; text-decoration: underline; }
.listening { animation: pulse 1.1s ease-in-out infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(166, 58, 30, 0.18); } }
@media (prefers-reduced-motion: reduce) { .listening { animation: none; } }
</style>
