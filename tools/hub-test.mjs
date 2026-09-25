// Dev tool: drive and walk around Harbour Town with real keys, visit a zone, drive through a portal,
// then check the touch controls on a phone-sized touch screen.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const out = new URL('./out/', import.meta.url).pathname;
const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await playwright.chromium.launch({ args });
const logs = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.waitForTimeout(2000);
const info = () => page.evaluate(() => window.__paintland.debugHubInfo());
await page.evaluate(() => window.__paintland.debugMenu('main'));
await page.click('[data-nav="hub"]');
// First visit compiles the hub's shaders: wait for the frame rate to settle.
await page.waitForTimeout(6000);
console.log('entered', JSON.stringify(await info()));
// Software GL in CI renders ~1 frame a second: wait for outcomes, not wall-clock time.
await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__paintland.debugHubInfo().car.z < 20, null, { timeout: 120000 }).catch(() => undefined);
await page.keyboard.down('KeyD');
await page.waitForFunction(() => window.__paintland.debugHubInfo().car.x > 2, null, { timeout: 120000 }).catch(() => undefined);
await page.keyboard.up('KeyD');
await page.keyboard.up('KeyW');
console.log('drove', JSON.stringify(await info()));
await page.screenshot({ path: `${out}hub-drive.png` });
// Get out and walk to the garage ring.
await page.evaluate(() => window.__paintland.debugHub(21, -21, -0.8));
await page.waitForTimeout(800);
await page.waitForTimeout(2000);
await page.keyboard.press('KeyF');
await page.waitForFunction(() => window.__paintland.debugHubInfo().mode === 'foot', null, { timeout: 10000 }).catch(() => undefined);
console.log('on foot', JSON.stringify(await info()));
await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__paintland.debugHubInfo().zone !== null, null, { timeout: 120000 }).catch(() => undefined);
await page.keyboard.up('KeyW');
console.log('walked', JSON.stringify(await info()));
await page.keyboard.press('KeyE');
await page.waitForFunction(() => window.__paintland.debugHubInfo().menu !== 'none', null, { timeout: 60000 }).catch(() => undefined);
console.log('zone opened menu', JSON.stringify(await info()));
await page.screenshot({ path: `${out}hub-zone-menu.png` });
await page.click('[data-nav="main"]');
await page.click('[data-nav="resume"]');
await page.waitForFunction(() => window.__paintland.debugHubInfo().state === 'hub', null, { timeout: 60000 }).catch(() => undefined);
console.log('resumed', JSON.stringify(await info()));
await page.screenshot({ path: `${out}hub-walk.png` });
// Drive through the Serendib gate.
await page.evaluate(() => window.__paintland.debugHub(-90, 0, Math.PI / 2));
await page.waitForTimeout(800);
await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__paintland.debugHubInfo().state === 'play', null, { timeout: 30000 }).catch(() => undefined);
await page.keyboard.up('KeyW');
console.log('after gate', JSON.stringify(await page.evaluate(() => window.__paintland.debugInfo())));
await page.close();

// Phone: touch controls.
const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
phone.on('pageerror', (e) => logs.push(`[phone pageerror] ${e.message}`));
await phone.goto('http://localhost:5173/');
await phone.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await phone.waitForTimeout(1500);
await phone.evaluate(() => window.__paintland.debugHub());
await phone.touchscreen.tap(600, 200);
await phone.waitForTimeout(1500);
const touchVisible = await phone.evaluate(() => !document.querySelector('.touch')?.classList.contains('hidden'));
console.log('touch controls shown:', touchVisible);
await phone.screenshot({ path: `${out}phone-hub.png` });
console.log(logs.join('\n') || 'no errors');
await browser.close();
