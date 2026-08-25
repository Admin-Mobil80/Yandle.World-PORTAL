/**
 * Refuses a build that uses a local helper without importing it.
 *
 * This exists because `currentHost is not defined` reached production. Vite
 * happily bundles an undefined identifier — it looks like a global — so the
 * failure only appears when that line runs, which for a checkout helper meant
 * the moment a customer tried to pay.
 *
 * Not a substitute for a real linter. It checks one specific, repeated
 * mistake: referencing an export of src/lib/*.js from a file that never
 * imported it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const LIB = join(SRC, 'lib');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(js|vue)$/.test(full) ? [full] : [];
  });
}

// Every named export the lib modules offer.
const exported = new Map();          // identifier -> defining file
for (const file of readdirSync(LIB).filter((f) => f.endsWith('.js'))) {
  const src = readFileSync(join(LIB, file), 'utf8');
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    exported.set(m[1], basename(file));
  }
}

const problems = [];
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  // Strip comments so a name mentioned in prose is not treated as a call.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const [name, from] of exported) {
    // A module does not import its own export. Skipping the whole lib/
    // directory instead was the flaw that let this very bug through:
    // checkout.js lives in lib/ and imports currentHost from host.js.
    if (basename(file) === from) continue;
    // Used as a call or a JSX/template reference, and not merely a substring.
    if (!new RegExp(`\\b${name}\\s*\\(`).test(code)) continue;
    if (new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(code)) continue;
    // Locally defined with the same name is fine.
    if (new RegExp(`(?:function|const|let|class)\\s+${name}\\b`).test(code)) continue;
    // Declared as a prop, so it arrives from the parent rather than an
    // import — HandleResult takes formatPrice that way.
    if (new RegExp(`\\b${name}\\s*:\\s*\\{`).test(code)) continue;
    // Destructured out of something, e.g. const { foo } = useThing().
    if (new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=`).test(code)) continue;
    problems.push(`${relative(ROOT, file)} uses ${name}() but never imports it (from lib/${from})`);
  }
}

if (problems.length) {
  console.error('\nBuild refused — undefined identifiers would ship:\n');
  for (const p of problems) console.error('  ' + p);
  console.error('');
  process.exit(1);
}
console.log(`import check: ${exported.size} lib exports, no missing imports`);
