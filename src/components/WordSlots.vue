<script setup>
import { computed } from 'vue';

/**
 * The handle builder.
 *
 * A free-text box was the wrong primitive: the namespace is a closed set of
 * 100 words, and nothing on screen told anyone what they were. You cannot
 * type a handle you cannot discover. So the words are the interface — one
 * slot to start, up to four, each a searchable list grouped by category.
 *
 * Still typeable: v-autocomplete filters as you type, so someone who knows
 * the word is one keystroke away, while someone who doesn't can browse.
 */
const props = defineProps({
  slots: { type: Array, required: true },      // (string | null)[]
  config: { type: Object, required: true },
  maxWords: { type: Number, default: 4 },
});
const emit = defineEmits(['update:slots']);

/**
 * One flat, alphabetical list.
 *
 * Category headers ("OBJECTS", "LIFE") were internal taxonomy leaking into
 * the UI — nobody picking a word thinks in those terms, and they made the
 * list longer to scan for no benefit. Alphabetical is what someone hunting
 * for a specific word actually needs.
 */
const items = computed(() =>
  [...(props.config.words ?? [])]
    .sort((a, b) => a.localeCompare(b))
    .map((word) => ({ value: word, title: word })));

const canAdd = computed(() => props.slots.length < props.maxWords);
const filled = computed(() => props.slots.filter(Boolean).length);

function setSlot(i, value) {
  const next = [...props.slots];
  next[i] = value;
  emit('update:slots', next);
}
function addSlot() {
  if (canAdd.value) emit('update:slots', [...props.slots, null]);
}
function removeSlot(i) {
  emit('update:slots', props.slots.filter((_, idx) => idx !== i));
}
</script>

<template>
  <div class="slots">
    <div v-for="(slot, i) in slots" :key="i" class="slot">
      <v-autocomplete
        :model-value="slot"
        :items="items"
        :label="i === 0 ? 'First word' : `Word ${i + 1}`"
        :placeholder="i === 0 ? 'sky' : 'add another'"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        auto-select-first
        :menu-props="{ maxHeight: 340 }"
        @update:model-value="setSlot(i, $event)"
      >
        <template #selection="{ item }">
          {{ item.value }}
        </template>
      </v-autocomplete>

      <!-- The first slot is the handle; removing it would leave nothing. -->
      <v-btn
        v-if="slots.length > 1"
        icon="mdi-close"
        variant="text"
        size="small"
        density="comfortable"
        :aria-label="`Remove word ${i + 1}`"
        @click="removeSlot(i)"
      />
      <span v-else class="spacer" />
    </div>

    <div class="d-flex align-center ga-2 mt-1">
      <v-btn
        v-if="canAdd"
        variant="tonal"
        size="small"
        prepend-icon="mdi-plus"
        @click="addSlot"
      >Add a word</v-btn>
      <span class="text-caption text-medium-emphasis">
        {{ filled }} of {{ maxWords }} · fewer words cost more
      </span>
    </div>
  </div>
</template>

<style scoped>
.slots { display: flex; flex-direction: column; gap: 0.6rem; }
.slot { display: flex; align-items: center; gap: 0.25rem; }
.slot :deep(.v-input) { flex: 1; }
.spacer { width: 40px; flex: 0 0 40px; }
</style>
