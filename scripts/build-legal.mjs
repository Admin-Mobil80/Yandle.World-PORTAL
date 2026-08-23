#!/usr/bin/env node
/**
 * Renders the legal pages to real static HTML in dist/.
 *
 * They are static documents, and Paddle's domain checker fetches the raw
 * page. A client-rendered policy is an empty page to a crawler, which fails
 * domain approval for "no terms of service" while looking perfect in a
 * browser. Plain HTML also loads instantly and works with JS disabled.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from '../src/pages/content.js';
import { COMPANY, COMPANY_ADDRESS } from '../src/pages/legal.js';

const NAV = [
  ['/pricing', 'Pricing'], ['/terms', 'Terms'],
  ['/privacy', 'Privacy'], ['/refunds', 'Refunds'],
];

const shell = (slug, page) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title} · ${COMPANY.tradingName}</title>
<meta name="description" content="${page.subtitle || page.title} — ${COMPANY.tradingName}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root { --bg:#FAF8F4; --fg:#17150F; --muted:#6B6250; --line:#E2DED4; --brand:#B4451F; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#131109; --fg:#F5F0E4; --muted:#A79E8B; --line:#2B2618; --brand:#F0885C; }
}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
  font:16px/1.7 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased; }
.wrap { max-width:760px; margin:0 auto; padding:4rem 1.25rem 6rem; }
.brand { display:inline-flex; align-items:center; gap:.5rem; text-decoration:none;
  color:var(--fg); font-weight:700; letter-spacing:-.02em; margin-bottom:2.5rem; }
.brand .tld { font-weight:400; opacity:.55; }
h1 { font-size:2rem; letter-spacing:-.025em; margin:0 0 .35rem; }
.sub { color:var(--muted); margin:0 0 .5rem; }
.updated { color:var(--muted); font-size:.8rem; margin:0 0 2.5rem; }
h2 { font-size:1.15rem; margin:2.25rem 0 .75rem; letter-spacing:-.01em; }
p, li { margin:0 0 1rem; }
ul { margin:0 0 1rem 1.25rem; }
li { margin-bottom:.4rem; }
code { background:rgba(128,128,128,.16); padding:.05rem .35rem; border-radius:.25rem; font-size:.9em; }
table { width:100%; border-collapse:collapse; margin:1.5rem 0; }
th, td { text-align:left; padding:.6rem .7rem; border-bottom:1px solid var(--line); }
th { font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
a { color:var(--brand); }
footer { border-top:1px solid var(--line); margin-top:3rem; padding-top:1.5rem;
  color:var(--muted); font-size:.875rem; }
footer nav { display:flex; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; }
footer p { margin:0 0 .25rem; }
</style>
</head>
<body>
<div class="wrap">
<a class="brand" href="/">
  <svg width="22" height="22" viewBox="0 0 32 32" fill="var(--brand)" aria-hidden="true">
    <rect x="4" y="12" width="4" height="8" rx="2"/><rect x="11" y="6" width="4" height="20" rx="2"/>
    <rect x="18" y="9" width="4" height="14" rx="2"/><rect x="25" y="14" width="4" height="4" rx="2"/>
  </svg>
  Yandle<span class="tld">.world</span>
</a>
<h1>${page.title}</h1>
${page.subtitle ? `<p class="sub">${page.subtitle}</p>` : ''}
<p class="updated">Last updated ${COMPANY.effectiveDate}</p>
${page.body.trim()}
<footer>
  <nav>${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
  <p><strong>${COMPANY.legalName}</strong></p>
  <p>${COMPANY_ADDRESS}</p>
  <p>Contact: <a href="mailto:${COMPANY.supportEmail}">${COMPANY.supportEmail}</a></p>
</footer>
</div>
</body>
</html>`;

const out = join(process.cwd(), 'dist');
mkdirSync(out, { recursive: true });
for (const [slug, page] of Object.entries(PAGES)) {
  const html = shell(slug, page);
  writeFileSync(join(out, `${slug}.html`), html);
  console.log(`wrote dist/${slug}.html (${(html.length / 1024).toFixed(1)} kB, no JS required)`);
}
