<script setup>
import { currentHost } from '../lib/host.js';
import { computed } from 'vue';
import CopyLink from './CopyLink.vue';
defineEmits(['claim', 'go', 'suggest']);
const props = defineProps({
  parsed: { type: Object, required: true },
  errors: { type: Object, required: true },
  availability: { type: Object, default: null },
  checking: { type: Boolean, default: false },
  formatPrice: { type: Function, required: true },
  alreadyHolds: { type: String, default: null },
  signedIn: { type: Boolean, default: false },
});

// Flattened once, so the template stays readable and we do not recompute it
// on every render tick.
const suggestionsFor = computed(() =>
  (props.parsed.unknownWords ?? []).flatMap((w) => props.parsed.suggestions?.[w] ?? []).slice(0, 4));

const host = currentHost();
</script>

<template>
  <div class="result">
    <!-- Nothing picked yet. The card below is empty, and a caption saying so
         only adds a line of text to an already empty screen. -->
    <div v-if="!parsed.words.length" class="placeholder" />

    <v-alert
      v-else-if="parsed.error === errors.TOO_MANY_WORDS"
      type="error" variant="tonal" density="comfortable"
    >
      A Yandle is one to four words. That's {{ parsed.words.length }}.
    </v-alert>

    <!-- Words outside the pool. This branch was missing, so a handle
         containing an unlisted word rendered NOTHING — the page simply went
         quiet and looked broken. -->
    <v-alert
      v-else-if="parsed.error === errors.NOT_IN_DICTIONARY"
      type="warning" variant="tonal" density="comfortable"
    >
      <p class="mb-2">
        <template v-for="(w, i) in parsed.unknownWords" :key="w">
          <code>{{ w }}</code><span v-if="i < parsed.unknownWords.length - 1">, </span>
        </template>
        {{ parsed.unknownWords.length > 1 ? ' are not' : ' is not' }} in the word list.
      </p>
      <div v-if="suggestionsFor.length" class="d-flex align-center ga-1 flex-wrap">
        <span class="text-caption">Try</span>
        <v-chip
          v-for="w in suggestionsFor" :key="w"
          size="small" variant="outlined" @click="$emit('suggest', w)"
        >{{ w }}</v-chip>
      </div>
    </v-alert>

    <!-- An outlined card for the holder's case rather than a tonal
         surface-variant one, which rendered as near-invisible grey-on-grey
         and made a perfectly normal result look like an error. -->
    <v-card
      v-else-if="parsed.valid"
      :variant="availability?.available === true && alreadyHolds ? 'outlined' : 'tonal'"
      :color="availability?.available === false
        ? 'error'
        : (availability?.available === true && alreadyHolds ? undefined : 'success')"
    >
      <v-card-text>
        <p class="text-h6 mb-1 d-flex align-center ga-1">
          <span>{{ host }}/<strong>{{ parsed.handle }}</strong></span>
          <!-- Nothing to copy yet when signed out: the Yandle is not theirs
               and the link resolves to nothing. -->
          <CopyLink v-if="signedIn" :handle="parsed.handle" />
        </p>

        <p v-if="!alreadyHolds" class="text-body-2 text-medium-emphasis mb-3">
          {{ parsed.tier.label }} ·
          {{ formatPrice(parsed.tier.buyoutCents) }} to own ·
          {{ parsed.tier.holdLabel }} free hold
        </p>

        <!-- Local validity is instant; only the server knows if it is taken. -->
        <div class="d-flex align-center ga-2">
          <template v-if="checking">
            <v-progress-circular indeterminate size="16" width="2" />
            <span class="text-body-2">Checking availability…</span>
          </template>
          <!-- Free, but this account already holds one. Say that it is
               free (good news, and true), then explain the one thing
               standing in the way and how to get past it — rather than
               "nothing to visit", which reads as a failure and offers no
               way forward. -->
          <template v-else-if="availability?.available === true && alreadyHolds">
            <v-icon icon="mdi-tag-outline" size="18" color="primary" />
            <span class="text-body-2 font-weight-medium">Free — nobody has claimed it</span>
          </template>
          <template v-else-if="availability?.available === true">
            <v-icon icon="mdi-check-circle" size="18" />
            <span class="text-body-2 font-weight-medium">Available</span>
            <v-btn
              class="ml-auto" color="success" variant="flat" size="small"
              @click="$emit('claim')"
            >Reserve for {{ parsed.tier.holdLabel }}</v-btn>
          </template>
          <template v-else-if="availability?.available === false">
            <v-icon icon="mdi-arrow-right-circle" size="18" />
            <span class="text-body-2 font-weight-medium">
              {{ alreadyHolds ? 'This one is live' : 'Taken — this one is live' }}
            </span>
            <!-- A claimed handle is the product working. Offer the visit, not
                 a dead end. -->
            <v-btn
              class="ml-auto" color="primary" variant="flat" size="small"
              append-icon="mdi-open-in-new" @click="$emit('go')"
            >Go</v-btn>
          </template>
          <!-- The server has not answered (offline, slow, or it errored).
               The handle is locally valid, so offer the claim anyway rather
               than leaving a card with no way forward — reserving re-checks
               server-side, so an unavailable one still cannot slip through. -->
          <template v-else>
            <v-icon icon="mdi-help-circle-outline" size="18" />
            <span class="text-body-2 text-medium-emphasis">Could not check availability</span>
            <v-btn
              v-if="!alreadyHolds"
              class="ml-auto" color="success" variant="flat" size="small"
              @click="$emit('claim')"
            >Reserve for {{ parsed.tier.holdLabel }}</v-btn>
          </template>
        </div>

        <div
          v-if="availability?.available === true && alreadyHolds"
          class="held-note mt-3"
        >
          <v-icon icon="mdi-information-outline" size="16" class="mr-1" />
          <span>
            One account holds one Yandle, and yours is
            <strong>{{ alreadyHolds }}</strong>. Release it below to take
            <strong>{{ parsed.handle }}</strong> instead.
          </span>
        </div>

        <!-- The mishearing guard. Only the server knows which neighbours are
             claimed, so this appears only once it has answered. -->
        <div v-if="availability?.sounds_like?.length" class="mt-3">
          <span class="text-caption text-medium-emphasis">Careful — sounds like</span>
          <v-chip
            v-for="h in availability.sounds_like.slice(0, 3)" :key="h"
            class="ml-1" size="x-small" variant="outlined"
          >{{ h }}</v-chip>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.result { min-height: 2rem; }
.held-note {
  display: flex; align-items: flex-start;
  font-size: .82rem; line-height: 1.5; opacity: .85;
  padding: .6rem .7rem; border-radius: 8px;
  background: rgba(128, 128, 128, .08);
}
</style>
