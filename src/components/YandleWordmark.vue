<script setup>
import YandleMark from './YandleMark.vue';

defineProps({
  size: { type: String, default: 'default' },   // 'small' | 'default' | 'large'
  suffix: { type: String, default: '' },        // e.g. 'BMS'
});

const scale = { small: 20, default: 26, large: 34 };
</script>

<template>
  <span class="wordmark" :class="`wordmark--${size}`">
    <YandleMark :size="scale[size]" class="mark" />
    <span class="text">
      Yandle<span class="tld">.world</span><span v-if="suffix" class="suffix">{{ suffix }}</span>
    </span>
  </span>
</template>

<style scoped>
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(var(--v-theme-primary));
  letter-spacing: -0.025em;
  line-height: 1;
}
.text {
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}
.wordmark--small .text  { font-size: 1rem; }
.wordmark--default .text { font-size: 1.25rem; }
.wordmark--large .text  { font-size: clamp(1.75rem, 6vw, 2.25rem); }

.tld {
  font-weight: 400;
  opacity: 0.55;
}
.suffix {
  font-weight: 600;
  margin-left: 0.4rem;
  padding-left: 0.4rem;
  border-left: 1px solid currentColor;
  opacity: 0.75;
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
