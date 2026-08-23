<script setup>
import { ref } from 'vue';
import { useVersionCheck } from '../composables/useVersionCheck.js';

/**
 * Top-of-screen release notice.
 *
 * A bottom snackbar was the wrong place: it competes with the content people
 * are using and gets dismissed by reflex. A thin bar pinned to the top reads
 * as system chrome.
 *
 * Notes are collapsed by default. Someone who just wants the new version
 * should not have to read a changelog to find the button.
 */
const { updateAvailable, notes, reload } = useVersionCheck();
const expanded = ref(false);
</script>

<template>
  <transition name="drop">
    <div v-if="updateAvailable" class="wrap" role="status">
      <div class="bar">
        <span class="dot" aria-hidden="true" />
        <span class="msg">A new version of Yandle.world is available.</span>

        <button v-if="notes?.items?.length" class="link" type="button" @click="expanded = !expanded">
          {{ expanded ? 'Hide' : "What's new" }}
        </button>
        <button class="action" type="button" @click="reload">Refresh</button>
      </div>

      <transition name="expand">
        <div v-if="expanded && notes" class="notes">
          <p class="notes-title">{{ notes.title }}</p>
          <ul>
            <li v-for="(item, i) in notes.items" :key="i">{{ item }}</li>
          </ul>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.wrap {
  position: fixed; inset: 0 0 auto 0; z-index: 2400;
  background: rgb(var(--v-theme-primary)); color: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,.18);
}
.bar {
  display: flex; align-items: center; justify-content: center; gap: .75rem;
  padding: .6rem 1rem; font-size: .875rem;
}
.msg { font-weight: 500; }
.dot {
  width: 8px; height: 8px; border-radius: 50%; background: #fff;
  animation: blink 1.6s ease-in-out infinite; flex: 0 0 auto;
}
@keyframes blink { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .dot { animation: none; } }

.link {
  background: none; border: 0; color: #fff; font: inherit;
  text-decoration: underline; text-underline-offset: .2em; cursor: pointer; opacity: .9;
}
.link:hover { opacity: 1; }

.action {
  background: rgba(255,255,255,.18); color: #fff; border: 0;
  border-radius: 999px; padding: .25rem .85rem;
  font: inherit; font-weight: 600; cursor: pointer; flex: 0 0 auto;
}
.action:hover { background: rgba(255,255,255,.3); }

.notes {
  max-width: 640px; margin: 0 auto; padding: 0 1rem 1rem;
  border-top: 1px solid rgba(255,255,255,.2);
}
.notes-title { font-weight: 600; margin: .8rem 0 .4rem; font-size: .875rem; }
.notes ul { margin: 0; padding-left: 1.1rem; }
.notes li { font-size: .84rem; opacity: .92; margin-bottom: .25rem; }

.drop-enter-active, .drop-leave-active { transition: transform .25s ease, opacity .25s ease; }
.drop-enter-from, .drop-leave-to { transform: translateY(-100%); opacity: 0; }
.expand-enter-active, .expand-leave-active { transition: opacity .18s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; }

@media (max-width: 560px) {
  .bar { flex-wrap: wrap; gap: .45rem; }
  .msg { flex: 1 1 100%; text-align: center; }
}
</style>
