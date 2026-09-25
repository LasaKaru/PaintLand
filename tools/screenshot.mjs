// Dev tool: render the game in headless Chromium and save screenshots to tools/out/.
// Usage: npm run dev (in another shell), then:
//   node tools/screenshot.mjs                       # default shot list
//   SHOTS="sketch:20:morning,serendib:900:golden" node tools/screenshot.mjs
//   MENUS="main,wardrobe,garage" node tools/screenshot.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = new URL('./out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const wait = Number(process.env.WAIT ?? 2500);

const browser = await playwright.chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}00-splash.png` });
// STYLE=realistic|illustrated|watercolour, QUALITY=low|medium|high|ultra
if (process.env.STYLE || process.env.QUALITY) await page.evaluate(([st, q]) => window.__paintland.debugLook(st, q), [process.env.STYLE, process.env.QUALITY]);
const tag = process.env.STYLE ? `-${process.env.STYLE}` : '';

for (const entry of (process.env.MENUS ?? '').split(',').filter(Boolean)) {
  // "settings/controls" opens a settings tab.
  const [screen, tab] = entry.split('/');
  await page.evaluate((s) => window.__paintland.debugMenu(s), screen);
  if (tab) await page.click(`[data-stab="${tab}"]`);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}menu-${screen}${tab ? `-${tab}` : ''}${tag}.png` });
}
if (process.env.INTRO) {
  await page.evaluate(() => window.__paintland.debugIntro());
  await page.waitForTimeout(wait * 2);
  await page.screenshot({ path: `${out}intro.png` });
}
const defaults = 'sketch:20:morning,sketch:650:golden';
for (const shot of (process.env.SHOTS ?? defaults).split(',').filter(Boolean)) {
  const [chapter, s, preset, rain] = shot.split(':');
  await page.evaluate(([c, s, p, r]) => window.__paintland.debugJump(Number(s), p, r || 'clear', c), [chapter, s, preset, rain]);
  await page.waitForTimeout(wait);
  const info = await page.evaluate(() => window.__paintland.debugInfo());
  logs.push(`[shot ${shot}] ${JSON.stringify(info)}`);
  await page.screenshot({ path: `${out}${chapter}-${String(s).padStart(4, '0')}-${preset}${rain ? `-${rain}` : ''}${tag}.png` });
}
if (process.env.HUB) {
  // HUB="x,z,heading;x,z,heading" — views of Harbour Town (default: the spawn).
  const spots = process.env.HUB === '1' ? [''] : process.env.HUB.split(';');
  for (const [i, spot] of spots.entries()) {
    const [x, z, h] = spot ? spot.split(',').map(Number) : [];
    await page.evaluate(([x, z, h]) => window.__paintland.debugHub(x, z, h), [x, z, h]);
    await page.waitForTimeout(wait + 1500);
    await page.screenshot({ path: `${out}hub-${i}${tag}.png` });
  }
  const info = await page.evaluate(() => window.__paintland.debugInfo());
  logs.push(`[hub] ${JSON.stringify(info)}`);
}
if (process.env.PHOTO) {
  await page.evaluate(() => window.__paintland.debugPhoto());
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}photo${tag}.png` });
}
if (process.env.WALK) {
  await page.evaluate(() => window.__paintland.debugWalk());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}walk-third.png` });
}
if (process.env.MISSION) {
  await page.evaluate((id) => window.__paintland.debugMission(id), process.env.MISSION);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}mission-${process.env.MISSION}.png` });
}
console.log(logs.join('\n') || 'no console errors');
await browser.close();
