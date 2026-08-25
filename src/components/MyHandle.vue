<script setup>
import { currentHost } from '../lib/host.js';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../lib/api.js';
import CopyLink from './CopyLink.vue';
import ClaimDialog from './ClaimDialog.vue';
import TransferDialog from './TransferDialog.vue';
import { openRazorpay, openPaddle } from '../lib/checkout.js';

/**
 * The signed-in user's handle.
 *
 * One account holds one handle, so this is a single card rather than a list.
 * It exists because claiming used to have no visible result — the handle went
 * somewhere and the person who claimed it had no way to find it again.
 */
const emit = defineEmits(['loaded', 'released']);
const confirming = ref(false);
const releasing = ref(false);
const handle = ref(null);
const loading = ref(true);
const error = ref(null);
const tick = ref(Date.now());
const editing = ref(false);
const buying = ref(false);
const awaitingPayment = ref(false);
const transferring = ref(false);
const cancellingTransfer = ref(false);
const transferError = ref(null);
let timer;

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const data = await api.myHandles();
    handle.value = (data.items ?? [])[0] ?? null;
    emit('loaded', handle.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  timer = setInterval(() => { tick.value = Date.now(); }, 1000);
});
onUnmounted(() => clearInterval(timer));

const timeLeft = computed(() => {
  if (!handle.value?.expires_on) return null;
  const ms = handle.value.expires_on - tick.value;
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} day${d === 1 ? '' : 's'}, ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
});

// Under a day left is when it stops being informational and starts mattering.
const urgent = computed(() => handle.value?.expires_on
  && handle.value.expires_on - tick.value < 86_400_000);

/**
 * Hands off to whichever gateway the BMS has active. The amount is decided
 * server-side from the tier — never sent from here, or anyone could buy a
 * four-word Yandle for a penny by editing the request.
 */
async function makePermanent() {
  buying.value = true;
  error.value = null;
  try {
    const checkout = await api.startCheckout(handle.value.handle);
    if (checkout.gateway === 'RAZORPAY') {
      await openRazorpay(checkout);
    } else {
      await openPaddle(checkout);
    }
    // The gateway has taken the payment, but the record only flips when its
    // webhook reaches us. Say so plainly rather than showing "Claimed" on a
    // Yandle the server still lists as reserved.
    awaitingPayment.value = true;
    setTimeout(load, 4000);
  } catch (err) {
    // Closing the overlay is a decision, not a failure — do not shout at
    // someone who changed their mind.
    if (err.message !== 'Payment cancelled.') error.value = err.message;
  } finally {
    buying.value = false;
  }
}

/**
 * Releasing is destructive and not fully reversible: the handle returns to the
 * public pool immediately, anyone else can take it, and a cooldown stops this
 * account re-taking the same one straight away. So it asks first, and says
 * exactly what happens.
 */
async function release() {
  releasing.value = true;
  error.value = null;
  try {
    // A claimed Yandle is forfeited, not refunded — the server refuses
    // unless we say we have told them that, which the dialog does.
    await api.release(handle.value.handle, handle.value.status === 'OWNED');
    confirming.value = false;
    handle.value = null;
    emit('loaded', null);
    emit('released');
  } catch (err) {
    error.value = err.message;
  } finally {
    releasing.value = false;
  }
}

/** Either side of a pending transfer may cancel it any time before it finalises. */
async function cancelTransfer() {
  cancellingTransfer.value = true;
  transferError.value = null;
  try {
    await api.cancelTransfer(handle.value.handle);
    await load();
  } catch (err) {
    transferError.value = err.message;
  } finally {
    cancellingTransfer.value = false;
  }
}

defineExpose({ load });

const host = currentHost();
const pendingTransfer = computed(() => handle.value?.pending_transfer ?? null);
</script>

<style scoped>
.handle-link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 0, 0, .18);
}
.handle-link:hover { border-bottom-color: currentColor; }
</style>

<template>
  <div>
    <div v-if="loading" class="text-center py-4">
      <v-progress-circular indeterminate size="22" width="2" />
    </div>

    <v-alert v-else-if="error" type="warning" variant="tonal" density="compact">
      {{ error }}
    </v-alert>

    <v-card v-else-if="handle" variant="outlined">
      <v-card-text>
        <div class="d-flex justify-space-between align-start ga-3 mb-2">
          <div>
            <div class="text-overline text-medium-emphasis" style="line-height:1">Your Yandle</div>
            <p class="text-h6 mb-0 d-flex align-center ga-1">
              <!-- The address itself is the link, so there is no separate
                   Visit button. The copy icon sits outside the anchor: a tap
                   meant for it must not navigate away. -->
              <a :href="`/${handle.handle}`" class="handle-link">
                {{ host }}/<strong>{{ handle.handle }}</strong>
              </a>
              <CopyLink :handle="handle.handle" />
            </p>
          </div>
          <v-chip
            :color="handle.status === 'OWNED' ? 'success' : 'warning'"
            size="small" variant="tonal"
          >{{ handle.status === 'OWNED' ? 'Claimed' : 'Reserved' }}</v-chip>
        </div>

        <p v-if="handle.status === 'RESERVED' && timeLeft && !awaitingPayment" class="text-body-2 mb-3"
           :class="urgent ? 'text-error font-weight-medium' : 'text-medium-emphasis'">
          <v-icon icon="mdi-clock-outline" size="16" class="mr-1" />
          {{ timeLeft === 'expired' ? 'Your hold has ended' : `${timeLeft} left on your reservation` }}
        </p>
        <v-alert v-if="awaitingPayment" type="info" variant="tonal" density="compact" class="mb-3">
          Payment received. We are confirming it with the gateway — this page
          will show <strong>Claimed</strong> within a minute, and you will get
          an email either way.
        </v-alert>

        <p v-else-if="handle.status === 'OWNED'" class="text-body-2 text-medium-emphasis mb-3">
          Yours permanently. No renewal, nothing to cancel.
        </p>

        <!-- A transfer in flight replaces the normal action row: nothing
             else about the handle can meaningfully change while ownership
             is mid-handoff, so this is the one thing shown. -->
        <template v-if="pendingTransfer">
          <v-alert
            :type="pendingTransfer.status === 'ACCEPTED_PENDING' ? 'success' : 'info'"
            variant="tonal" density="comfortable" class="mb-3"
          >
            <template v-if="pendingTransfer.status === 'ACCEPTED_PENDING'">
              <strong>{{ pendingTransfer.to_contact }}</strong> accepted.
              Transfer completes on <strong>{{ new Date(pendingTransfer.effective_on).toLocaleString() }}</strong>.
            </template>
            <template v-else>
              Waiting for <strong>{{ pendingTransfer.to_contact }}</strong> to accept the transfer invite.
            </template>
          </v-alert>
          <v-alert v-if="transferError" type="error" variant="tonal" density="compact" class="mb-3">
            {{ transferError }}
          </v-alert>
          <div class="d-flex ga-2 flex-wrap">
            <v-btn size="small" variant="text" color="error" :loading="cancellingTransfer"
                   @click="cancelTransfer">Cancel transfer</v-btn>
          </div>
        </template>

        <div v-else class="d-flex ga-2 flex-wrap">
          <v-btn v-if="handle.status === 'RESERVED' && !awaitingPayment" size="small" variant="flat" color="success"
                 :loading="buying" @click="makePermanent">
            Make it permanent — {{ handle.price_label }}
          </v-btn>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil"
                 @click="editing = true">Edit details</v-btn>
          <v-btn size="small" variant="tonal" prepend-icon="mdi-account-arrow-right-outline"
                 @click="transferring = true">Transfer</v-btn>
          <v-btn size="small" variant="text" color="error" @click="confirming = true">Release</v-btn>
        </div>

        <ClaimDialog
          v-model="editing"
          :handle="handle.handle"
          :profile="handle.profile ?? {}"
          @saved="load"
        />

        <TransferDialog
          v-model="transferring"
          :handle="handle.handle"
          @started="load"
        />

        <v-dialog v-model="confirming" max-width="420">
          <v-card>
            <v-card-title class="text-subtitle-1 pt-5 px-5">
              Release {{ handle.handle }}?
            </v-card-title>
            <v-card-text class="px-5">
              <v-alert
                v-if="handle.status === 'OWNED'"
                type="warning" variant="tonal" density="compact" class="mb-3"
              >
                You paid for this Yandle. Releasing it gives it up for good —
                <strong>no refund</strong>, and anyone else can then claim it.
              </v-alert>
              <p class="text-body-2 mb-2">
                It returns to the public pool straight away and anyone else can claim it.
              </p>
              <p class="text-body-2 text-medium-emphasis mb-0">
                You will not be able to re-claim this same Yandle for a cooldown period,
                and any traffic pointed at it stops working.
              </p>
            </v-card-text>
            <v-card-actions class="px-5 pb-4">
              <v-spacer />
              <v-btn variant="text" :disabled="releasing" @click="confirming = false">Keep it</v-btn>
              <v-btn color="error" variant="flat" :loading="releasing" @click="release">Release</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-card-text>
    </v-card>

    <!-- One account, one handle — so an empty state is "you have none yet",
         not "you have no handles matching this filter". -->
    <p v-else class="text-body-2 text-medium-emphasis text-center mb-0">
      You haven't claimed a Yandle yet. Pick one above.
    </p>
  </div>
</template>
