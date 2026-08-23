import { onMounted, onUnmounted, ref } from 'vue';

/**
 * Notices when a newer build has been deployed.
 *
 * Checks on an interval and whenever the tab regains focus — the common case
 * is a tab left open for hours, which no interval alone catches promptly
 * after a laptop wakes.
 *
 * Never reloads on its own. Someone mid-way through a claim form would lose
 * what they typed, so this only offers.
 */
export function useVersionCheck({ intervalMs = 5 * 60 * 1000 } = {}) {
  const updateAvailable = ref(false);
  let current = null;
  let timer;

  async function check() {
    if (updateAvailable.value) return;   // already told them; stop polling noise
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { version } = await res.json();
      if (!version) return;
      if (current === null) { current = version; return; }
      if (version !== current) updateAvailable.value = true;
    } catch { /* offline or mid-deploy — try again next tick */ }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') check();
  }

  async function reload() {
    // Clear the service worker cache first, or the shell is served from cache
    // and the "new version" they just accepted is the old one again.
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
      await Promise.all(regs.map((r) => r.update()));
      const keys = await caches?.keys?.() ?? [];
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* best effort */ }
    window.location.reload();
  }

  onMounted(() => {
    check();
    timer = setInterval(check, intervalMs);
    document.addEventListener('visibilitychange', onVisible);
  });
  onUnmounted(() => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  });

  return { updateAvailable, reload };
}
