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
// Title -> intro -> start with Space.
await page.keyboard.press('Space');
await page.waitForTimeout(400);
await page.keyboard.press('Space');
await page.waitForTimeout(500);
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
// Lap wrap.
await page.evaluate(() => window.__paintland.debugJump(3040));
await page.waitForTimeout(3000);
console.log('after lap wrap', JSON.stringify(await info()));
console.log(logs.join('\n') || 'no console errors');
await browser.close();
