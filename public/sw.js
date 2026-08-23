/**
 * Precaches the shell so the search page opens instantly on a bad connection.
 *
 * Deliberately narrow: the app shell only. Handle resolution must NEVER be
 * served from cache — a cached redirect would keep sending people to a
 * destination the owner has since changed or that we have since blocked.
 */
const CACHE = 'yandle-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShell = event.request.mode === 'navigate' && url.pathname === '/';

  // Everything else — handle lookups, API calls — goes to the network, always.
  if (!isShell && !SHELL.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((hit) => hit ?? fetch(event.request)),
  );
});
