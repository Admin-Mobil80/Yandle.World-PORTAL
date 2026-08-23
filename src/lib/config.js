/**
 * Runtime config: the word pool, tier prices and emoji, fetched from the
 * backend.
 *
 * These are NOT bundled. The pool is editable from the BMS, so baking it into
 * a build would mean a word added at 10am is invisible until the next deploy —
 * and worse, the two frontends could disagree with each other and with the
 * backend about what a valid handle is.
 *
 * The seed below is a *fallback only*, so first paint and the offline PWA
 * shell have something to validate against. It is always replaced by the
 * server's answer as soon as one arrives.
 */

import { SEED } from './seed.js';

const CACHE_KEY = 'yandle.config.v1';
const MAX_AGE_MS = 60 * 60 * 1000;

let inFlight = null;

/** Cached-then-revalidated config. Never throws; degrades to the seed. */
export async function loadConfig() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.config;

  inFlight ??= fetchConfig()
    .then((config) => {
      writeCache(config);
      return config;
    })
    .catch(() => cached?.config ?? SEED)
    .finally(() => { inFlight = null; });

  // Serve something usable immediately; the fetch updates the cache behind it.
  return cached?.config ?? inFlight;
}

async function fetchConfig() {
  const res = await fetch('/api/config', { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`config ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body.words) || body.words.length === 0) {
    throw new Error('config missing words');
  }
  return body;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(config) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), config }));
  } catch {
    /* private mode, quota — the seed still works */
  }
}
