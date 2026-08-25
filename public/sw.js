/**
 * Offline fallback for the app shell.
 *
 * NETWORK FIRST, and that is the whole point of this file.
 *
 * The previous version was cache-first on '/' and '/index.html' with a cache
 * name that never changed. index.html references a content-hashed bundle
 * (/assets/index-ABC123.js) and every deploy publishes a new hash and deletes
 * the old file. So a returning visitor got the CACHED index.html, which asked
 * for a bundle that no longer existed, and the page rendered nothing at all.
 *
 * Safari surfaced it first because it holds service worker caches hardest,
 * but every browser was one cache hit away from the same blank page.
 *
 * Network first means a working deploy is always what people get. The cache
 * is now only what it should have been: a fallback for when the network is
 * genuinely unavailable.
 */
const CACHE = 'yandle-shell-v2';   // v2 evicts every poisoned v1 cache
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShell = event.request.mode === 'navigate'
    ? url.pathname === '/'
    : SHELL.includes(url.pathname);

  // Handle lookups, API calls and hashed assets always go straight to the
  // network. A cached redirect would keep sending people to a destination the
  // owner has changed or we have blocked.
  if (!isShell) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Only a good response replaces the fallback. Caching a 404 would
        // reintroduce exactly the failure this file exists to prevent.
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((hit) => hit ?? Response.error())),
  );
});
