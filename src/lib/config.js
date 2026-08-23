import { SEED } from './seed.js';

/**
 * Runtime config: the word pool, tier prices and emoji, fetched from the
 * backend.
 *
 * Stale-while-revalidate. The previous version returned a cached copy and did
 * NOT refetch while it was under an hour old, so a word added in the BMS took
 * up to an hour to appear in the picker — it looked like the addition had
 * silently failed. Now the cache paints instantly AND a refresh always runs,
 * with `onFresh` firing if the server's copy differs.
 */

const CACHE_KEY = 'yandle.config.v2';   // v2: v1 entries were written by the never-revalidating version
const MAX_AGE_MS = 60 * 60 * 1000;      // hard expiry; the revalidate below is what keeps it current

let inFlight = null;

export async function loadConfig(onFresh) {
  const cached = readCache();

  // Always revalidate, even on a fresh cache. This is the whole fix.
  const refresh = (inFlight ??= fetchConfig()
    .then((config) => { writeCache(config); return config; })
    .catch(() => null)
    .finally(() => { inFlight = null; }));

  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) {
    refresh.then((fresh) => {
      // Only notify on a real change, so we do not re-render for nothing.
      if (fresh && onFresh && JSON.stringify(fresh.words) !== JSON.stringify(cached.config.words)) {
        onFresh(fresh);
      }
    });
    return cached.config;
  }

  return (await refresh) ?? cached?.config ?? SEED;
}

async function fetchConfig() {
  const res = await fetch('/api/config', { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`config ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.words) || body.words.length === 0) throw new Error('config missing words');
  return body;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(config) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), config }));
  } catch { /* private mode, quota — the seed still works */ }
}
