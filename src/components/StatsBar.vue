<script setup>
/**
 * Thin live-stats bar above the hero.
 *
 * Sits at the very top rather than at the bottom of the page: the numbers are
 * social proof, and proof that arrives after someone has already decided to
 * leave is worth nothing. Renders only once there is something to show — "0
 * Yandles claimed" on a new platform is anti-proof.
 */
defineProps({ stats: { type: Object, default: null } });
const n = (v) => (v ?? 0).toLocaleString();
</script>

<template>
  <!--
    `claimed` from the API counts reserved holds AND paid Yandles. Saying
    "2 claimed" when both are unpaid free holds contradicts the rest of the
    product, where Claimed now means paid and Reserved means held. Counted
    separately, and only shown when there is something in each.
  -->
  <div v-if="stats?.claimed" class="bar">
    <span class="dot" aria-hidden="true" />
    <span v-if="stats.owned">
      <strong>{{ n(stats.owned) }}</strong> claimed
    </span>
    <span v-if="stats.owned && stats.held" class="sep">·</span>
    <span v-if="stats.held">
      <strong>{{ n(stats.held) }}</strong> reserved
    </span>
    <span class="sep">·</span>
    <span><strong>{{ n(stats.redirects) }}</strong> visits sent</span>
  </div>
</template>

<style scoped>
.bar {
  display: inline-flex; align-items: center; gap: 0.45rem;
  border: 1px solid rgba(128,128,128,0.25); border-radius: 999px;
  padding: 0.3rem 0.9rem; font-size: 0.8rem;
  background: rgba(128,128,128,0.06);
}
.bar strong { font-variant-numeric: tabular-nums; }
.sep { opacity: 0.35; }
.dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 0 rgba(47,107,69,.6);
  animation: pulse 2.4s ease-out infinite;
}
@keyframes pulse { 70% { box-shadow: 0 0 0 7px rgba(47,107,69,0); } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }
</style>
