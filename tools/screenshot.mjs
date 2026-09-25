// Dev tool: drive the game in headless Chromium and save screenshots.
// Usage: npm run dev (in another shell), then `node tools/screenshot.mjs [url]`.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = new URL('./out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await playwright.chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__paintland, null, { timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}00-title.png` });

const shots = (process.env.SHOTS ?? '20:morning,300:golden,420:noon,600:dusk,900:morning,1200:night,1500:noon,1800:golden,2350:morning,2440:noon,2800:dusk').split(',');
for (const shot of shots) {
  const [s, preset, rain] = shot.split(':');
  await page.evaluate(([s, p, r]) => window.__paintland.debugJump(Number(s), p, r === 'rain'), [s, preset, rain]);
  await page.waitForTimeout(Number(process.env.WAIT ?? 2500));
  const info = await page.evaluate(() => window.__paintland.debugInfo());
  logs.push(`[shot ${s}] ${JSON.stringify(info)}`);
  await page.screenshot({ path: `${out}s${String(s).padStart(4, '0')}-${preset}${rain ? '-rain' : ''}.png` });
}
if (process.env.WALK) {
  await page.evaluate(() => window.__paintland.debugWalk());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}walk-third.png` });
}
console.log(logs.filter((l) => !l.includes('[vite]')).join('\n'));
await browser.close();
