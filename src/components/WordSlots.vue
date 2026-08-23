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

// v-autocomplete wants a flat list; subheaders give it the category structure
// back so browsing 100 words is not a wall of text.
const items = computed(() => {
  const out = [];
  for (const [category, words] of Object.entries(props.config.categories || {})) {
    out.push({ type: 'subheader', title: category.toUpperCase() });
    for (const word of [...words].sort()) {
      out.push({ value: word, title: word, emoji: props.config.emoji?.[word] ?? '' });
    }
  }
  return out;
});

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
        <template #item="{ props: itemProps, item }">
          <v-list-subheader v-if="item.raw.type === 'subheader'" class="text-caption">
            {{ item.raw.title }}
          </v-list-subheader>
          <v-list-item v-else v-bind="itemProps" :title="undefined">
            <template #prepend><span class="glyph">{{ item.raw.emoji }}</span></template>
            <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
          </v-list-item>
        </template>

        <template #selection="{ item }">
          <span class="glyph mr-1">{{ config.emoji?.[item.value] }}</span>{{ item.value }}
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
.glyph { font-size: 1.05rem; }
</style>
