// Writes public/licenses.html: the licence of every open-source package the
// game ships (the web game's dependencies, plus Electron for the desktop app).
// Run it after changing dependencies:  node tools/licenses.mjs
// (tests/legal.test.ts fails when a dependency is missing from the page.)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function info(dir, name, part) {
  const pkgDir = join(dir, 'node_modules', name);
  const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
  const file = readdirSync(pkgDir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
  const text = file ? readFileSync(join(pkgDir, file), 'utf8').replace(/\r\n/g, '\n').trim() : `${pkg.license ?? 'See the package'} licence.`;
  const home = typeof pkg.homepage === 'string' ? pkg.homepage : '';
  return { name, version: pkg.version, license: typeof pkg.license === 'string' ? pkg.license : '', home, text, part };
}

const deps = [];
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
for (const name of Object.keys(rootPkg.dependencies ?? {}).sort()) deps.push(info(root, name, name === 'ws' ? 'Game server' : 'Game'));
const desktop = join(root, 'desktop');
if (existsSync(join(desktop, 'node_modules', 'electron', 'package.json'))) deps.push(info(desktop, 'electron', 'Desktop app'));
else deps.push({ name: 'electron', version: '', license: 'MIT', home: 'https://www.electronjs.org', text: 'MIT licence. The desktop app also includes Chromium; its notices are in LICENSES.chromium.html next to the app.', part: 'Desktop app' });

// steamworks.js is installed only for Steam builds (see desktop/steam.cjs).
if (existsSync(join(desktop, 'node_modules', 'steamworks.js', 'package.json'))) deps.push(info(desktop, 'steamworks.js', 'Desktop app (Steam)'));

// The same licence text (for example the SIL Open Font License of each font) is printed once.
const groups = new Map();
for (const d of deps) {
  const g = groups.get(d.text) ?? [];
  g.push(d);
  groups.set(d.text, g);
}

const rows = deps.map((d) => `<tr><td>${d.home ? `<a href="${esc(d.home)}" rel="noopener">${esc(d.name)}</a>` : esc(d.name)}</td><td>${esc(d.version)}</td><td>${esc(d.license)}</td><td>${esc(d.part)}</td></tr>`).join('\n');
const texts = [...groups.values()].map((g) => `<h3>${g.map((d) => esc(d.name)).join(', ')}</h3>\n<pre>${esc(g[0].text)}</pre>`).join('\n');

writeFileSync(
  join(root, 'public', 'licenses.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inkroads · Open-source licences</title>
<meta name="description" content="The open-source software and fonts Inkroads is built with, and their licences.">
<style>
  :root { --paper: #fbf6ea; --ink: #2b2622; --soft: #5e554c; --accent: #b0452a; --line: rgba(43, 38, 34, 0.16); }
  @media (prefers-color-scheme: dark) { :root { --paper: #1f1c19; --ink: #f1e9da; --soft: #c9bda9; --accent: #f08a5e; --line: rgba(241, 233, 218, 0.2); } }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.65 'Noto Sans', system-ui, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 34px; margin: 0 0 4px; }
  h2 { font-size: 21px; margin: 36px 0 8px; }
  h3 { font-size: 15px; margin: 24px 0 6px; overflow-wrap: anywhere; }
  a { color: var(--accent); }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  td, th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  pre { white-space: pre-wrap; font-size: 12px; line-height: 1.5; padding: 12px; border: 1px solid var(--line); border-radius: 8px; max-height: 320px; overflow: auto; }
  .muted { color: var(--soft); }
</style>
</head>
<body>
<main>
<h1>Open-source licences</h1>
<p class="muted">Inkroads is built with these open-source packages and fonts. Thank you to everyone who makes them.</p>
<table>
<thead><tr><th>Package</th><th>Version</th><th>Licence</th><th>Used in</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<h2>Licence texts</h2>
${texts}
</main>
</body>
</html>
`,
);
console.log(`public/licenses.html: ${deps.length} packages, ${groups.size} licence texts`);
