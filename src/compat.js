/**
 * Runtime polyfills for methods our dependencies call.
 *
 * Vite's `build.target` transpiles SYNTAX; it does not add missing methods.
 * Vuetify calls Array.prototype.toSorted, toReversed and findLast, which
 * arrived in Safari 16.4, 16.4 and 15.4 — on anything older they throw a
 * TypeError mid-render and the app paints nothing.
 *
 * Imported first in main.js so they exist before any component runs.
 */
if (!Array.prototype.toSorted) {
  Object.defineProperty(Array.prototype, 'toSorted', {
    configurable: true, writable: true,
    value(compare) { return [...this].sort(compare); },
  });
}

if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    configurable: true, writable: true,
    value() { return [...this].reverse(); },
  });
}

if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    configurable: true, writable: true,
    value(fn, thisArg) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (fn.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    },
  });
}

if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true, writable: true,
    value(fn, thisArg) {
      for (let i = this.length - 1; i >= 0; i--) {
        if (fn.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    },
  });
}

if (!Object.hasOwn) {
  Object.defineProperty(Object, 'hasOwn', {
    configurable: true, writable: true,
    value: (obj, key) => Object.prototype.hasOwnProperty.call(obj, key),
  });
}
