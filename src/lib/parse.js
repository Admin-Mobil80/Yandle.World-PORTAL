/**
 * Handle parsing for the search bar.
 *
 * A deliberate copy in both frontends, ~90 lines, no dependencies. It exists
 * so the search bar can validate as you type and keep working offline in the
 * PWA. It is pure logic only — it holds NO word list and NO prices. Those
 * come from the backend (`lib/config.js`), because they are editable from the
 * BMS and must never be baked into a bundle.
 *
 * If you change this file, change it in the other frontend too. The backend
 * copy in Yandle.World-BACKEND/src/rules/ is the authority: it is what
 * actually decides whether a claim succeeds and what it costs.
 */

export const ERRORS = {
  EMPTY: 'EMPTY',
  TOO_MANY_WORDS: 'TOO_MANY_WORDS',
  NOT_IN_DICTIONARY: 'NOT_IN_DICTIONARY',
};

const SPOKEN_FILLER = new Set([
  'um', 'uh', 'er', 'the', 'a', 'an', 'and', 'please', 'okay', 'ok',
  'go', 'to', 'find', 'me', 'at', 'dot', 'com', 'world', 'yandle',
]);

const tokenize = (input) =>
  String(input ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean);

/**
 * @param {string} input raw typed or spoken text
 * @param {{words: string[], emoji: Record<string,string>, tiers: object, maxWords: number}} config
 * @param {{stripFiller?: boolean}} [opts] filler stripping is for the voice path only
 */
export function parseHandle(input, config, opts = {}) {
  const pool = new Set(config?.words ?? []);
  const maxWords = config?.maxWords ?? 4;

  let tokens = tokenize(input);
  if (opts.stripFiller) {
    const stripped = tokens.filter((t) => !SPOKEN_FILLER.has(t));
    if (stripped.length > 0) tokens = stripped;   // a lone "gold" is a real handle
  }

  const base = {
    valid: false, handle: null, words: tokens, tier: null,
    error: null, unknownWords: [], suggestions: {}, chain: [],
  };

  if (tokens.length === 0) return { ...base, error: ERRORS.EMPTY };
  if (tokens.length > maxWords) return { ...base, error: ERRORS.TOO_MANY_WORDS };

  const unknown = tokens.filter((t) => !pool.has(t));
  if (unknown.length > 0) {
    return {
      ...base,
      error: ERRORS.NOT_IN_DICTIONARY,
      unknownWords: unknown,
      suggestions: Object.fromEntries(
        unknown.map((w) => [w, suggest(w, config?.words ?? [])]),
      ),
    };
  }

  return {
    ...base,
    valid: true,
    handle: tokens.join('-'),
    tier: config?.tiers?.[tokens.length] ?? null,
    chain: tokens.map((word) => ({ word, emoji: config?.emoji?.[word] ?? '' })),
  };
}

/** Nearest in-pool words for a typo, by edit distance. */
export function suggest(word, pool, limit = 3) {
  const w = String(word ?? '').toLowerCase();
  if (!w) return [];
  return pool
    .map((candidate) => ({ candidate, d: editDistance(w, candidate) }))
    .filter(({ d }) => d <= Math.max(1, Math.floor(w.length / 2)))
    .sort((a, b) => a.d - b.d || a.candidate.localeCompare(b.candidate))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function formatPrice(cents) {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Snaps a heard word onto the closest word in the pool.
 *
 * The recogniser is a general-purpose engine with no idea that only ~120
 * words exist, so it happily returns "red" or "flag" — real English words
 * that are not claimable. Every such token used to be dropped, which is why
 * speaking a handle so often produced nothing.
 *
 * Two passes, cheapest first:
 *   1. Phonetic skeleton — collapses vowel quality and doubled consonants, so
 *      "gold"/"cold" and "warm"/"worm" land on the same key. This is where
 *      most mishearings live.
 *   2. Edit distance, capped — catches "birdd", "flatt", clipped endings.
 *
 * Returns null rather than a bad guess when nothing is close. Silently
 * substituting a distant word would put someone on a handle they never said.
 */
export function snapToPool(word, pool) {
  const w = String(word ?? '').toLowerCase();
  if (!w) return null;
  if (pool.includes(w)) return w;

  const key = skeleton(w);
  const phonetic = pool.filter((p) => skeleton(p) === key);
  if (phonetic.length === 1) return phonetic[0];
  // Two pool words sharing a skeleton is a known confusable pair; guessing
  // between them is exactly the misrouting the product must not do.
  if (phonetic.length > 1) return null;

  let best = null;
  let bestDistance = Infinity;
  for (const p of pool) {
    const d = editDistance(w, p);
    if (d < bestDistance) { bestDistance = d; best = p; }
  }
  // One edit for short words, two for longer ones. Beyond that it is a
  // different word, not a mishearing.
  const limit = w.length <= 4 ? 1 : 2;
  return bestDistance <= limit ? best : null;
}

/** Vowel-quality-insensitive skeleton. Mirrors the backend's wordpool.js. */
function skeleton(word) {
  return String(word ?? '')
    .toLowerCase()
    .replace(/^kn/, 'n')
    .replace(/^wr/, 'r')
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/[aeiouy]+/g, 'V')
    .replace(/(.)\1+/g, '$1');
}
