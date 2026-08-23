<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../lib/api.js';

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
 * Releasing is destructive and not fully reversible: the handle returns to the
 * public pool immediately, anyone else can take it, and a cooldown stops this
 * account re-taking the same one straight away. So it asks first, and says
 * exactly what happens.
 */
async function release() {
  releasing.value = true;
  error.value = null;
  try {
    await api.release(handle.value.handle);
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

defineExpose({ load });
</script>

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
            <div class="text-overline text-medium-emphasis" style="line-height:1">Your handle</div>
            <p class="text-h6 mb-0">yandle.world/<strong>{{ handle.handle }}</strong></p>
          </div>
          <v-chip
            :color="handle.status === 'OWNED' ? 'success' : 'warning'"
            size="small" variant="tonal"
          >{{ handle.status === 'OWNED' ? 'Yours' : 'On hold' }}</v-chip>
        </div>

        <p v-if="handle.status === 'RESERVED' && timeLeft" class="text-body-2 mb-3"
           :class="urgent ? 'text-error font-weight-medium' : 'text-medium-emphasis'">
          <v-icon icon="mdi-clock-outline" size="16" class="mr-1" />
          {{ timeLeft === 'expired' ? 'Your hold has ended' : `${timeLeft} left on your free hold` }}
        </p>
        <p v-else-if="handle.status === 'OWNED'" class="text-body-2 text-medium-emphasis mb-3">
          Yours permanently. No renewal, nothing to cancel.
        </p>

        <div class="d-flex ga-2 flex-wrap">
          <v-btn size="small" variant="flat" color="primary" append-icon="mdi-open-in-new"
                 :href="`/${handle.handle}`">Visit</v-btn>
          <v-btn v-if="handle.status === 'RESERVED'" size="small" variant="tonal" color="success">
            Keep it for {{ handle.price_label }}
          </v-btn>
          <v-btn size="small" variant="text" @click="load">Refresh</v-btn>
          <v-btn size="small" variant="text" color="error" @click="confirming = true">Release</v-btn>
        </div>

        <v-dialog v-model="confirming" max-width="420">
          <v-card>
            <v-card-title class="text-subtitle-1 pt-5 px-5">
              Release {{ handle.handle }}?
            </v-card-title>
            <v-card-text class="px-5">
              <p class="text-body-2 mb-2">
                It returns to the public pool straight away and anyone else can claim it.
              </p>
              <p class="text-body-2 text-medium-emphasis mb-0">
                You will not be able to re-claim this same handle for a cooldown period,
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
      You haven't claimed a handle yet. Pick one above.
    </p>
  </div>
</template>
