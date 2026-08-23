/**
 * What changed, newest first.
 *
 * The top entry is what the update banner shows when a new build lands.
 * Written for the person using the site, not for the person who wrote the
 * code: "voice works in Firefox" rather than "added MediaRecorder fallback".
 *
 * Add a new entry at the top when shipping something worth interrupting
 * someone for. Cosmetic tweaks do not need one — the banner still appears,
 * it just shows the most recent notes.
 */
export const RELEASE_NOTES = [
  {
    title: 'Voice everywhere, and a fixed word list',
    items: [
      'Voice search now works in every browser, not just Chrome and Safari.',
      'Misheard words snap to the closest real word instead of being dropped.',
      'Surprise me now composes a genuinely unclaimed, more interesting combination.',
      'Copy button next to every Yandle link.',
      'Your Yandle now shows a live countdown, and you can release it.',
    ],
  },
  {
    title: 'Profile pages',
    items: [
      'Claimed Yandles get a real page with your logo, description, map and WhatsApp link.',
      'Share a Yandle straight from its page.',
    ],
  },
];
