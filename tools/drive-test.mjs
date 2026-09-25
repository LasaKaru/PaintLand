// Dev tool: real keyboard driving + lap wrap check in headless Chromium.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(process.argv[2] ?? 'http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 60000 });
await page.waitForTimeout(2500);
const info = () => page.evaluate(() => window.__paintland.debugInfo());
// Splash -> main menu -> Play (the menu drives a demo behind it until then).
await page.evaluate(() => window.__paintland.debugMenu('main'));
await page.waitForTimeout(500);
await page.click('[data-play]');
await page.waitForTimeout(800);
console.log('started', JSON.stringify(await info()));
await page.keyboard.down('KeyW');
await page.waitForTimeout(4000);
console.log('after 4s throttle', JSON.stringify(await info()));
await page.keyboard.down('KeyA');
await page.waitForTimeout(800);
await page.keyboard.up('KeyA');
await page.keyboard.press('Space');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
await page.keyboard.down('KeyS');
await page.waitForTimeout(4000);
await page.keyboard.up('KeyS');
console.log('after braking', JSON.stringify(await info()));
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1500);
await page.keyboard.up('KeyW');
console.log('on foot', JSON.stringify(await info()));
await page.screenshot({ path: new URL('./out/drive-foot.png', import.meta.url).pathname });
await page.keyboard.press('KeyV');
await page.waitForTimeout(600);
await page.screenshot({ path: new URL('./out/drive-first-person.png', import.meta.url).pathname });
// Photo mode: P opens it (sim frozen), Esc leaves.
await page.keyboard.press('KeyF');
await page.waitForTimeout(300);
await page.keyboard.press('KeyP');
// Headless software GL is slow here: wait until the frame loop has taken the key.
await page.waitForFunction(() => window.__paintland.debugInfo().state === 'photo', null, { timeout: 15000 }).catch(() => undefined);
console.log('photo mode', JSON.stringify(await info()));
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__paintland.debugInfo().state === 'play', null, { timeout: 15000 }).catch(() => undefined);
// Realistic handling: accelerate through the gears.
await page.evaluate(() => window.__paintland.debugHandling('realistic'));
await page.keyboard.down('KeyW');
await page.waitForTimeout(12000);
await page.keyboard.up('KeyW');
console.log('realistic handling', JSON.stringify(await info()));
// Lap wrap.
await page.evaluate(() => window.__paintland.debugJump(3040));
await page.waitForTimeout(3000);
console.log('after lap wrap', JSON.stringify(await info()));
console.log(logs.join('\n') || 'no console errors');
await browser.close();
