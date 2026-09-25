// Dev tool (run from the repo root with `npm run dev` running): a live race between two
// browser windows over the relay. Window 1 starts the race, both drive the lap at
// simulation speed, and both should see two finishes, verified by server re-simulation.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const PORT = '8796';
const relay = spawn(process.execPath, ['server/relay.mjs'], { env: { ...process.env, PORT, DATA_DIR: '/tmp/paintland-race-test' } });
relay.stdout.on('data', (d) => process.stdout.write(`[relay] ${d}`));
await new Promise((r) => setTimeout(r, 1200));
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const open = async () => {
  const p = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://localhost:5173/', { timeout: 120000 });
  await p.waitForFunction(() => window.__paintland, null, { timeout: 120000 });
  await p.evaluate((port) => { const g = window.__paintland; g.debugMenu('main'); g.debugNet('raceroom', `ws://localhost:${port}`); }, PORT);
  return p;
};
const w1 = await open();
const w2 = await open();
await w1.waitForFunction(() => window.__paintland.net.peers.size > 0 && [...window.__paintland.net.peers.values()][0].info, null, { timeout: 60000 });
await w1.evaluate(() => window.__paintland.debugRace('sketch'));
await w2.waitForFunction(() => !!window.__paintland.race, null, { timeout: 60000 });
console.log('w2 got the race:', await w2.evaluate(() => window.__paintland.race.chapter));
// Drive both laps (different lines so the times differ).
const drive = (page, steerBias) => page.evaluate((bias) => {
  const g = window.__paintland;
  g.raceCountdown = 0;
  g.input.touch.throttle = 1;
  let i = 0;
  while (g.trial && i < 60 * 400) {
    g.input.touch.moveX = Math.max(-1, Math.min(1, bias - g.rover.x * 0.1));
    g.trialStep(1 / 60);
    i++;
  }
  g.input.touch.throttle = 0;
  g.input.touch.moveX = 0;
  return i;
}, steerBias);
console.log('w1 steps', await drive(w1, 0.0), '· w2 steps', await drive(w2, 0.35));
const board = (p) => p.waitForFunction(() => (document.querySelector('.race-board')?.textContent ?? '').split('✓').length > 2, null, { timeout: 60000 }).then(() => p.evaluate(() => document.querySelector('.race-board').innerText.replace(/\n+/g, ' | ')), () => p.evaluate(() => document.querySelector('.race-board')?.innerText ?? 'none'));
console.log('w1 board:', await board(w1));
console.log('w2 board:', await board(w2));
await w1.screenshot({ path: new URL('./out/race-w1.png', import.meta.url).pathname });
console.log(errors.join('\n') || 'no page errors');
await browser.close();
relay.kill();
