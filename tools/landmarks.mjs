// Dev tool: crane shots of every landmark in a chapter → tools/out/lm-<chapter>-<i>.png
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const chapter = process.argv[2] ?? 'serendib';
const count = Number(process.argv[3] ?? 8);
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.waitForTimeout(2000);
for (let i = 0; i < count; i++) {
  const name = await page.evaluate(([c, i]) => window.__paintland.debugLandmark(c, i, 'morning'), [chapter, i]);
  if (name === '?') break;
  await page.waitForTimeout(3500);
  await page.screenshot({ path: new URL(`./out/lm-${chapter}-${i}.png`, import.meta.url).pathname });
  console.log(i, name);
}
console.log(errors.join('\n') || 'no page errors');
await browser.close();
