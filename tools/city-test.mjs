// Dev tool: Serendib City — travel from Harbour Town, a stunt jump, a loot chest, a secret,
// a drift mini-turbo, a mission with its compass, and the city mission board.
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
const info = () => page.evaluate(() => window.__paintland.debugHubInfo());
const until = (fn, arg, ms = 180000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true).catch(() => false);
await page.evaluate(() => window.__paintland.debugMenu('main'));

// 1. Harbour Town → drive through the road sign to the city.
await page.evaluate(() => window.__paintland.debugHub(104, 60, 0, 'harbour'));
await page.waitForTimeout(4000);
await page.keyboard.down('KeyW');
const travelled = await until(() => window.__paintland.debugHubInfo().area === 'city');
await page.keyboard.up('KeyW');
console.log('travel harbour → city:', travelled, JSON.stringify(await info()));
await page.waitForTimeout(8000);
await page.screenshot({ path: `${out}city-spawn.png` });

// 2. Loot chest by the spawn.
const before = await info();
await page.evaluate(() => window.__paintland.debugHub(-40, 482, 0, 'city'));
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
const opened = await until((n) => window.__paintland.debugHubInfo().stats.chests > n, before.stats.chests);
await page.keyboard.up('KeyW');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}city-loot.png` });
console.log('chest opened:', opened, 'ink', before.ink, '→', (await info()).ink);

// 3. A secret pot beside the Lotus Tower (walk-in by car).
await page.evaluate(() => window.__paintland.debugHub(-160, -118, 0, 'city'));
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
const secret = await until((n) => window.__paintland.debugHubInfo().stats.secrets > n, before.stats.secrets, 60000);
await page.keyboard.up('KeyW');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}city-secret.png` });
console.log('secret found:', secret);

// 4. Stunt: "Over the bus" (ramp at -520, 420 facing −Z, land at -520, 300).
await page.evaluate(() => window.__paintland.debugHub(-520, 520, 0, 'city'));
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
const air = await until(() => window.__paintland.debugHubInfo().car.y > 3, null);
if (air) await page.screenshot({ path: `${out}city-stunt-air.png` });
const landed = await until((n) => window.__paintland.debugHubInfo().stats.stunts > n, before.stats.stunts);
await page.keyboard.up('KeyW');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}city-stunt.png` });
console.log('stunt: airborne', air, 'landed', landed, JSON.stringify(await info()));

// 5. Drift mini-turbo on the beach road.
const mt0 = (await info()).stats.miniTurbos;
await page.evaluate(() => window.__paintland.debugHub(-300, 470, Math.PI / 2, 'city'));
await page.waitForTimeout(1500);
await page.keyboard.down('KeyW');
await until(() => Math.abs(window.__paintland.debugHubInfo().car.v) > 16, null);
await page.keyboard.down('KeyA');
await page.keyboard.down('ControlLeft');
await until(() => window.__paintland.debugHubInfo().car.drifting, null, 60000);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}city-drift.png` });
await page.keyboard.up('ControlLeft');
await page.keyboard.up('KeyA');
const turbo = await until((n) => window.__paintland.debugHubInfo().stats.miniTurbos > n, mt0, 60000);
await page.keyboard.up('KeyW');
console.log('mini-turbo:', turbo);

// 6. A mission with objective card, compass and beacon.
await page.evaluate(() => window.__paintland.debugCityMission('tt-1'));
await page.waitForTimeout(5000);
await page.screenshot({ path: `${out}city-mission.png` });
console.log('mission', JSON.stringify((await info()).mission));

// 7. The mission board.
await page.evaluate(() => window.__paintland.debugMenu('citymissions'));
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}city-board.png` });
console.log('final', JSON.stringify(await info()));
console.log(logs.length ? logs.join('\n') : 'no page errors');
await browser.close();
