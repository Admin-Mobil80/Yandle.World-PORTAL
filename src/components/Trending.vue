<script setup>
import { onMounted, ref } from 'vue';

/**
 * Most-visited handles.
 *
 * Public and unauthenticated, so it fetches directly rather than through the
 * command API. Renders nothing at all when empty — a "Top handles" heading
 * over an empty box on a new platform advertises that nobody is using it.
 */
const items = ref([]);

onMounted(async () => {
  try {
    const res = await fetch('/api/trending');
    const body = await res.json();
    items.value = body?.data?.items ?? [];
  } catch {
    items.value = [];   // silently absent is right for a nice-to-have
  }
});
</script>

<template>
  <div v-if="items.length" class="trending">
    <div class="text-overline text-medium-emphasis text-center mb-2">Most visited</div>
    <div class="d-flex flex-wrap justify-center ga-2">
      <a
        v-for="t in items" :key="t.handle"
        :href="`/${t.handle}`" class="pill"
      >
        <span class="name">{{ t.handle }}</span>
        <span class="count">{{ t.clicks.toLocaleString() }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.trending { margin-top: 2.5rem; }
.pill {
  display: inline-flex; align-items: center; gap: 0.5rem;
  border: 1px solid rgba(128, 128, 128, 0.3); border-radius: 999px;
  padding: 0.25rem 0.7rem; text-decoration: none;
  color: rgb(var(--v-theme-on-surface)); font-size: 0.85rem;
}
.pill:hover { border-color: rgb(var(--v-theme-primary)); }
.count {
  font-size: 0.75rem; opacity: 0.6;
  font-variant-numeric: tabular-nums;
}
</style>
