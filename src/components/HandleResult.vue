<script setup>
defineEmits(['claim', 'go']);
defineProps({
  parsed: { type: Object, required: true },
  errors: { type: Object, required: true },
  availability: { type: Object, default: null },
  checking: { type: Boolean, default: false },
  formatPrice: { type: Function, required: true },
});
</script>

<template>
  <div class="result">
    <div v-if="!parsed.words.length" class="placeholder">
      <p class="text-body-2 text-medium-emphasis text-center mb-0">
        Pick a word to see what it costs.
      </p>
    </div>

    <v-alert
      v-else-if="parsed.error === errors.TOO_MANY_WORDS"
      type="error" variant="tonal" density="comfortable"
    >
      Handles are one to four words. That's {{ parsed.words.length }}.
    </v-alert>

    <v-card v-else-if="parsed.valid" variant="tonal" :color="availability?.available === false ? 'error' : 'success'">
      <v-card-text>
        <div v-if="parsed.chain.length" class="chain mb-3" aria-hidden="true">
          <span v-for="(link, i) in parsed.chain" :key="`${link.word}-${i}`" class="link">
            {{ link.emoji }} {{ link.word }}
          </span>
        </div>

        <p class="text-h6 mb-1">
          yandle.world/<strong>{{ parsed.handle }}</strong>
        </p>

        <p class="text-body-2 text-medium-emphasis mb-3">
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
          <template v-else-if="availability?.available === true">
            <v-icon icon="mdi-check-circle" size="18" />
            <span class="text-body-2 font-weight-medium">Available</span>
            <v-btn class="ml-auto" color="success" variant="flat" size="small" @click="$emit('claim')">
              Hold it free for {{ parsed.tier.holdLabel }}
            </v-btn>
          </template>
          <template v-else-if="availability?.available === false">
            <v-icon icon="mdi-arrow-right-circle" size="18" />
            <span class="text-body-2 font-weight-medium">Taken — this one is live</span>
            <!-- A claimed handle is the product working. Offer the visit, not
                 a dead end. -->
            <v-btn
              class="ml-auto" color="primary" variant="flat" size="small"
              append-icon="mdi-open-in-new" @click="$emit('go')"
            >Go</v-btn>
          </template>
          <template v-else>
            <span class="text-body-2 text-medium-emphasis">Valid handle</span>
          </template>
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
.result { min-height: 8rem; }
.placeholder { padding-top: 2rem; }
.chain { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chain .link {
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 0.5rem;
  padding: 0.1rem 0.5rem;
  font-size: 0.82rem;
}
</style>
