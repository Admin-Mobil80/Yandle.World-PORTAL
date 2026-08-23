<script setup>
import YandleWordmark from '../components/YandleWordmark.vue';
import { COMPANY } from './legal.js';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  updated: { type: Boolean, default: true },
});

const LINKS = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/refunds', label: 'Refunds' },
];
</script>

<template>
  <v-container class="legal" max-width="760">
    <header class="mb-8">
      <a href="/" class="d-inline-block mb-6 text-decoration-none">
        <YandleWordmark size="small" />
      </a>
      <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
      <p v-if="subtitle" class="text-medium-emphasis mt-1 mb-0">{{ subtitle }}</p>
      <p v-if="updated" class="text-caption text-medium-emphasis mt-2 mb-0">
        Last updated {{ COMPANY.effectiveDate }}
      </p>
    </header>

    <div class="prose"><slot /></div>

    <v-divider class="my-8" />
    <footer class="text-body-2 text-medium-emphasis">
      <nav class="mb-4 d-flex ga-4 flex-wrap">
        <a v-for="l in LINKS" :key="l.href" :href="l.href">{{ l.label }}</a>
      </nav>
      <p class="mb-1">{{ COMPANY.legalName }}, {{ COMPANY.country }}</p>
      <p class="mb-0">
        Questions: <a :href="`mailto:${COMPANY.supportEmail}`">{{ COMPANY.supportEmail }}</a>
      </p>
    </footer>
  </v-container>
</template>

<style scoped>
.legal { padding-top: 5vh; padding-bottom: 6rem; }
.prose :deep(h2) {
  font-size: 1.15rem; font-weight: 600;
  margin: 2.25rem 0 0.75rem; letter-spacing: -0.01em;
}
.prose :deep(p) { margin: 0 0 1rem; line-height: 1.7; }
.prose :deep(ul), .prose :deep(ol) { margin: 0 0 1rem 1.25rem; line-height: 1.7; }
.prose :deep(li) { margin-bottom: 0.4rem; }
.prose :deep(code) {
  background: rgba(128,128,128,0.15); padding: 0.05rem 0.35rem;
  border-radius: 0.25rem; font-size: 0.9em;
}
a { color: rgb(var(--v-theme-primary)); }
</style>
