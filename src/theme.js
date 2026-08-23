/**
 * Yandle brand tokens.
 *
 * Warm paper and ink rather than the default cool grey, with a single clay
 * accent. The rationale is the product: the page a visitor lands on seconds
 * after hearing a handle read aloud should feel like a printed card, not a
 * dashboard. One accent, used sparingly, so the handle itself is the loudest
 * thing on screen.
 *
 * Every pair below is contrast-checked against its own surface at 4.5:1 for
 * body text and 3:1 for large text and UI edges.
 */

const brand = {
  clay:      '#B4451F',
  clayLight: '#F0885C',
  moss:      '#2F6B45',
  mossLight: '#74C795',
  amber:     '#9A6B00',
  amberLight:'#E8B44A',
  rust:      '#A32E22',
  rustLight: '#F0897C',
};

export const theme = {
  defaultTheme: 'light',
  themes: {
    light: {
      dark: false,
      colors: {
        background: '#FAF8F4',   // warm paper
        surface:    '#FFFFFF',
        'surface-variant': '#EFEBE3',
        'on-surface-variant': '#4A4438',
        primary:   brand.clay,
        secondary: '#4A4438',
        success:   brand.moss,
        warning:   brand.amber,
        error:     brand.rust,
        info:      '#31586E',
      },
      variables: {
        'border-color': '#1A160F',
        'border-opacity': 0.14,
        'theme-on-surface': '#17150F',
      },
    },
    dark: {
      dark: true,
      colors: {
        background: '#131109',   // warm near-black, not blue-black
        surface:    '#1C1911',
        'surface-variant': '#2A2519',
        'on-surface-variant': '#CFC7B5',
        primary:   brand.clayLight,
        secondary: '#CFC7B5',
        success:   brand.mossLight,
        warning:   brand.amberLight,
        error:     brand.rustLight,
        info:      '#8FB8D0',
      },
      variables: {
        'border-color': '#F5F0E4',
        'border-opacity': 0.16,
        'theme-on-surface': '#F5F0E4',
      },
    },
  },
};

export const BRAND = brand;
