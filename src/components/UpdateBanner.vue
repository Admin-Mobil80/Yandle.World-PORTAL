<script setup>
import { useVersionCheck } from '../composables/useVersionCheck.js';

/**
 * Top-of-screen release notice.
 *
 * A bottom snackbar was the wrong place: it competes with the page content
 * people are actually using and gets dismissed by reflex. A thin bar pinned
 * to the top reads as system chrome rather than a notification.
 */
const { updateAvailable, reload } = useVersionCheck();
</script>

<template>
  <transition name="drop">
    <div v-if="updateAvailable" class="bar" role="status">
      <span class="dot" aria-hidden="true" />
      <span class="msg">A new version of Yandle.world is available.</span>
      <button class="action" type="button" @click="reload">Refresh</button>
    </div>
  </transition>
</template>

<style scoped>
.bar {
  position: fixed; inset: 0 0 auto 0; z-index: 2400;
  display: flex; align-items: center; justify-content: center; gap: .75rem;
  padding: .6rem 1rem;
  background: rgb(var(--v-theme-primary)); color: #fff;
  font-size: .875rem; box-shadow: 0 2px 12px rgba(0,0,0,.18);
}
.msg { font-weight: 500; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #fff;
  animation: blink 1.6s ease-in-out infinite;
}
@keyframes blink { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }

.action {
  background: rgba(255,255,255,.18); color: #fff; border: 0;
  border-radius: 999px; padding: .25rem .8rem;
  font: inherit; font-weight: 600; cursor: pointer;
}
.action:hover { background: rgba(255,255,255,.3); }

.drop-enter-active, .drop-leave-active { transition: transform .25s ease, opacity .25s ease; }
.drop-enter-from, .drop-leave-to { transform: translateY(-100%); opacity: 0; }

@media (max-width: 480px) {
  .bar { flex-wrap: wrap; gap: .4rem; }
  .msg { flex: 1 1 100%; text-align: center; }
}
</style>
