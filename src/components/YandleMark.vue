<script setup>
/**
 * The Yandle mark: four rounded bars in a voice-waveform rhythm.
 *
 * Four bars because a handle is one to four words, and a waveform because it
 * is spoken. It carries no letterform, so it stays legible at 16px in a
 * browser tab where a "Y" would turn to mush.
 *
 * `currentColor` throughout, so it inherits the theme instead of shipping two
 * hard-coded palettes.
 */
defineProps({
  size: { type: [Number, String], default: 28 },
  tile: { type: Boolean, default: false },   // filled rounded square, for favicons and app icons
});
</script>

<template>
  <svg
    :width="size" :height="size" viewBox="0 0 32 32"
    role="img" aria-label="Yandle" fill="none" xmlns="http://www.w3.org/2000/svg"
  >
    <rect v-if="tile" width="32" height="32" rx="8" fill="currentColor" />
    <g :fill="tile ? 'var(--v-theme-surface-token, #FAF8F4)' : 'currentColor'">
      <rect x="4"  y="12" width="4" height="8"  rx="2" />
      <rect x="11" y="6"  width="4" height="20" rx="2" />
      <rect x="18" y="9"  width="4" height="14" rx="2" />
      <rect x="25" y="14" width="4" height="4"  rx="2" />
    </g>
  </svg>
</template>
