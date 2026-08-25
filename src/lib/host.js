/**
 * The host this build is actually being served from.
 *
 * Every URL shown or copied used to be hardcoded to "yandle.world". On dev
 * that produced links pointing at PRODUCTION: claim a Yandle on
 * dev.yandle.world, hit copy, and you got a yandle.world URL for a handle
 * that only exists on dev — which then resolved to "not found".
 *
 * Reading it from the browser keeps dev links on dev and prod links on prod
 * with no build-time configuration at all.
 */
export function currentHost() {
  if (typeof window === 'undefined') return 'yandle.world';
  return window.location.host;
}

/** Full, absolute URL for a handle on THIS environment. */
export function handleUrl(handle) {
  const origin = typeof window === 'undefined'
    ? 'https://yandle.world'
    : window.location.origin;
  return `${origin}/${handle}`;
}
