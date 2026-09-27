// Render pieces of the game's own procedural score to WebM (Opus) files for
// the Inkroads Studio radio station, and write public/music/manifest.json.
//
//   node tools/render-music.mjs            (needs `npx vite` running on :5173)
//   SECONDS=5 ONLY=harbour-morning node tools/render-music.mjs
//
// These are placeholders made by the game's music engine. For release, add
// commissioned or licensed recordings to public/music/ and list them in the
// manifest with their real artist and licence (see docs/MUSIC.md).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const LICENSE = 'Original music made with the Inkroads music engine. © HelaO2. A placeholder until the commissioned soundtrack.';
const PIECES = [
  { id: 'harbour-morning', title: 'Harbour Morning', station: 1, chapter: 'sketch', district: 0 },
  { id: 'lotus-tower-lights', title: 'Lotus Tower Lights', station: 3, chapter: 'serendib', district: 1 },
  { id: 'rain-on-the-seine', title: 'Rain on the Seine', station: 6, chapter: 'citylights', district: 0 },
  { id: 'tea-country-raga', title: 'Tea Country Raga', station: 7, chapter: 'islandtrip', district: 2 },
];
const seconds = Number(process.env.SECONDS ?? 60);
const only = process.env.ONLY;
const out = new URL('../public/music/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.evaluate(() => window.__paintland.debugLook(undefined, 'low'));
const manifestFile = `${out}manifest.json`;
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { tracks: [] };
for (const p of PIECES) {
  if (only && p.id !== only) continue;
  const url = await page.evaluate(async ([p, secs]) => {
    const m = await import('/src/world/Chapters.ts');
    const def = m.chapterById(p.chapter).districts[p.district];
    return window.__paintland.debugRenderMusic(p.station, def, secs);
  }, [p, seconds]);
  if (!url) throw new Error(`no recording for ${p.id}`);
  const bytes = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  writeFileSync(`${out}${p.id}.webm`, bytes);
  const entry = { title: p.title, artist: 'Inkroads music engine', license: LICENSE, file: `music/${p.id}.webm`, seconds };
  manifest.tracks = [...manifest.tracks.filter((t) => t.file !== entry.file), entry];
  console.log(`${p.id}: ${(bytes.length / 1024).toFixed(0)} KB`);
}
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
await browser.close();
