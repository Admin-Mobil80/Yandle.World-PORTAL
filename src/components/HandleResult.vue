<script setup>
const props = defineProps({
  parsed: { type: Object, required: true },
  errors: { type: Object, required: true },
  purchase: { type: Object, default: null },
  formatPrice: { type: Function, required: true },
});
defineEmits(['pick']);

const suggestionsFor = (p) => p.unknownWords.flatMap((w) => p.suggestions[w] ?? []);
</script>

<template>
  <div class="result">
    <!-- nothing typed yet -->
    <div v-if="!parsed.words.length" class="placeholder" />

    <v-alert
      v-else-if="parsed.error === errors.TOO_MANY_WORDS"
      type="error" variant="tonal" density="comfortable"
    >
      Handles are one to four words. That's {{ parsed.words.length }}.
    </v-alert>

    <v-alert
      v-else-if="parsed.error === errors.NOT_IN_DICTIONARY"
      type="error" variant="tonal" density="comfortable"
    >
      <span v-for="w in parsed.unknownWords" :key="w">
        <code>{{ w }}</code>
      </span>
      {{ parsed.unknownWords.length > 1 ? 'are not' : 'is not' }} in the 100-word list.

      <div v-if="suggestionsFor(parsed).length" class="mt-2">
        <span class="text-caption">Did you mean</span>
        <v-chip
          v-for="w in suggestionsFor(parsed)" :key="w"
          class="ml-1" size="small" variant="outlined"
          @click="$emit('pick', w)"
        >{{ w }}</v-chip>
      </div>
    </v-alert>

    <v-card v-else-if="parsed.valid" variant="tonal" color="success">
      <v-card-text>
        <div v-if="parsed.chain.length" class="chain mb-3" aria-hidden="true">
          <span v-for="(link, i) in parsed.chain" :key="`${link.word}-${i}`" class="link">
            {{ link.emoji }} {{ link.word }}
          </span>
        </div>

        <p class="text-h6 mb-1">
          yandle.world/<strong>{{ parsed.handle }}</strong>
        </p>

        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ parsed.tier.label }} ·
          {{ formatPrice(parsed.tier.buyoutCents) }} to own ·
          {{ parsed.tier.holdLabel }} free hold
          <template v-if="purchase?.path === 'CREDIT_PACK'">
            (bought with credits)
          </template>
        </p>

        <!-- The mishearing guard lives server-side now: the resolver checks
             confusable neighbours because only it knows which are claimed. -->
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.result { min-height: 8rem; }
.placeholder { height: 8rem; }
.chain { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chain .link {
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 0.5rem;
  padding: 0.1rem 0.5rem;
  font-size: 0.82rem;
}
code {
  background: rgba(128, 128, 128, 0.18);
  padding: 0.05rem 0.3rem;
  border-radius: 0.25rem;
  margin-right: 0.2rem;
}
</style>
