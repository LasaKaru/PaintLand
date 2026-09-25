// Dev tool (milestone 8): Colour the City (sketch wash, painting a district, fireworks), the paper map and
// minimap with fast travel, the night perahera, and the daily brushstrokes screen. Screenshots: tools/out/m8-*.png
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const out = new URL('./out/', import.meta.url).pathname;
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const browser = await playwright.chromium.launch({ args });
const logs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.waitForTimeout(2000);
const game = (fn, arg) => page.evaluate(fn, arg);
const until = (fn, arg, ms = 180000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
await game(() => window.__paintland.debugMenu('main'));

// 1. The city as a sketch, with the minimap.
await game(() => { window.__paintland.debugTime('morning'); window.__paintland.debugHub(-100, 470, 0, 'city'); });
await page.waitForTimeout(9000);
const districts = await game(() => window.__paintland.debugDistricts());
console.log('districts', JSON.stringify(districts));
await page.screenshot({ path: `${out}m8-sketch.png` });

// 2. Paint the district around the spawn: mark enough of its strokes done.
const tags = await game(() => window.__paintland.debugStrokes('south'));
const need = districts.find((d) => d.id === 'south').need;
await game((t) => window.__paintland.debugDistricts(t), tags.slice(0, need));
const painted = await until(() => window.__paintland.debugDistricts().find((d) => d.id === 'south').shown < 0.05, null, 240000);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}m8-painted.png` });
console.log('south painted:', painted, 'ink', (await game(() => window.__paintland.debugHubInfo())).ink);

// 3. The paper map; discover the Lotus Tower and fast-travel there from the map's side panel.
await game(() => window.__paintland.debugDistricts(['place:city:lotus']));
await game(() => window.__paintland.debugMap(true));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}m8-map.png` });
await page.click('[data-travel="lotus"]');
const travelled = await until(() => { const c = window.__paintland.debugHubInfo().car; return Math.hypot(c.x + 160, c.z + 130) < 30; }, null, 60000);
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}m8-travel.png` });
console.log('fast travel to the Lotus Tower:', travelled, JSON.stringify((await game(() => window.__paintland.debugHubInfo())).car));

// 4. Night: the perahera around Pettah.
await game(() => { window.__paintland.debugTime('night'); window.__paintland.debugHub(146, -262, 0, 'city'); });
const parade = await until(() => window.__paintland.debugPerahera().active, null, 60000);
await page.waitForTimeout(8000);
await page.keyboard.press('KeyU'); // hide the HUD so the title card does not cover the parade
await page.waitForTimeout(2000);
console.log('perahera:', parade, JSON.stringify(await game(() => window.__paintland.debugPerahera())));
await page.screenshot({ path: `${out}m8-perahera.png` });
await page.keyboard.press('KeyU');

// 5. Daily brushstrokes and photo hunt screen.
console.log('daily', JSON.stringify(await game(() => window.__paintland.debugDaily())));
await game(() => window.__paintland.debugMenu('daily'));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}m8-daily.png` });
console.log(logs.length ? logs.join('\n') : 'no page errors');
await browser.close();
