<script setup>
import { computed, ref } from 'vue';

/**
 * The handle builder.
 *
 * A free-text box was the wrong primitive: the namespace is a closed set of
 * 100 words, and nothing on screen told anyone what they were. You cannot
 * type a handle you cannot discover. So the words are the interface — one
 * slot to start, up to four, each a searchable list grouped by category.
 *
 * Searchable, but not free text.
 *
 * A plain select made finding a word in a hundred painful. A plain
 * autocomplete let people leave junk sitting in the field ("arm jjjkkkkkkkk"
 * over a "No data available" menu), which looks broken and can never resolve
 * to a Yandle.
 *
 * So: type to filter, but the typed text is never a value. Anything not
 * chosen from the list is discarded the moment the field loses focus, so the
 * field only ever shows a real pool word or nothing.
 */
const props = defineProps({
  slots: { type: Array, required: true },      // (string | null)[]
  config: { type: Object, required: true },
  maxWords: { type: Number, default: 4 },
});
const emit = defineEmits(['update:slots']);

// Spoken words, to match a product whose whole premise is being said aloud.
// "Word 2" reads like a form field; "Second word" reads like a sentence.
// Falls back to the numeric form past the fourth, which the pool does not
// allow today but would not break if maxWords ever moved.
const ORDINALS = ['First', 'Second', 'Third', 'Fourth'];
const slotLabel = (i) => (ORDINALS[i] ? `${ORDINALS[i]} word` : `Word ${i + 1}`);

// Per-slot search text, kept out of the model on purpose. Clearing it on
// blur is what stops a half-typed non-word from lingering in the field.
const search = ref({});

function onPick(i, value) {
  search.value[i] = '';
  setSlot(i, value);
}

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

// Room left AND nothing empty already. Without the second half, tapping Add
// four times produced a column of greyed-out boxes that could not be typed
// into — the control created slots the sequence rule then refused to unlock.
const canAdd = computed(() =>
  props.slots.length < props.maxWords && props.slots.every(Boolean));
const filled = computed(() => props.slots.filter(Boolean).length);

/**
 * A slot is locked until every slot before it has a word.
 *
 * Words are positional — they become the URL in order — so a hole between
 * them is never what anyone meant. Leaving all four open let someone fill the
 * second and leave the first empty, which collapsed to a ONE-word handle: the
 * $1,000 tier, reached while they thought they were building a $100 one.
 * Enforcing the order stops that being expressible at all.
 *
 * A slot that already holds a word is never locked, so clearing and changing
 * an earlier choice still works.
 */
const isLocked = (i) => !props.slots[i] && props.slots.slice(0, i).some((w) => !w);

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
        :search="search[i] ?? ''"
        :items="items"
        :label="slotLabel(i)"
        :placeholder="isLocked(i) ? '' : (i === 0 ? 'type to search' : 'add another')"
        :disabled="isLocked(i)"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        auto-select-first
        :no-data-text="`Not in the word list`"
        :menu-props="{ maxHeight: 340 }"
        @update:search="search[i] = $event"
        @update:model-value="onPick(i, $event)"
        @blur="search[i] = ''"
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

    <!-- Adding words is the main verb of this card, and a small grey tonal
         button read as a disabled afterthought sitting next to grey caption
         text. Full width, outlined in the brand colour, dashed so it reads as
         "another slot goes here" rather than as a submit. -->
    <v-btn
      v-if="canAdd"
      class="add-word-btn mt-2"
      variant="outlined"
      color="primary"
      size="large"
      block
      prepend-icon="mdi-plus-circle"
      @click="addSlot"
    >Add a word</v-btn>

    <div class="text-caption text-medium-emphasis mt-2 text-center">
      {{ filled }} of {{ maxWords }} · fewer words cost more
    </div>
  </div>
</template>

<style scoped>
.slots { display: flex; flex-direction: column; gap: 0.6rem; }
.slot { display: flex; align-items: center; gap: 0.25rem; }
.slot :deep(.v-input) { flex: 1; }
.spacer { width: 40px; flex: 0 0 40px; }
.add-word-btn {
  border-style: dashed;
  border-width: 2px;
  letter-spacing: 0;
  text-transform: none;
  font-weight: 600;
}
.add-word-btn:hover { border-style: solid; }
</style>
