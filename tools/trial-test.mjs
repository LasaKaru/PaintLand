// Dev tool (run from the repo root, with `npm run dev` running):
// starts the relay with the run verifier, drives a full time-trial lap in the browser game,
// lets it submit, and checks the server re-simulated and ranked it. Also tries a cheat.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const server = spawn(process.execPath, ['server/relay.mjs'], { env: { ...process.env, PORT: '8787', DATA_DIR: '/tmp/paintland-trial-test' } });
server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
await new Promise((r) => setTimeout(r, 1500));
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__paintland.debugTrial('sketch'));
await page.waitForTimeout(1000);
// Drive the lap at simulation speed: hold GO (touch throttle) and step the sim directly.
const result = await page.evaluate(() => {
  const g = window.__paintland;
  g.input.touch.throttle = 1;
  g.raceCountdown = 0;
  let steps = 0;
  while (g.trial && steps < 60 * 400) {
    g.trialStep(1 / 60);
    steps++;
  }
  g.input.touch.throttle = 0;
  return { steps, trialOver: !g.trial, best: g.profile.data.trialBest };
});
console.log('lap driven', JSON.stringify(result));
await page.waitForFunction(() => /Verified|did not accept|offline/.test(document.querySelector('.lap-banner')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => undefined);
console.log('banner:', await page.evaluate(() => document.querySelector('.lap-banner')?.textContent));
const board = await (await fetch('http://localhost:8787/leaderboard?chapter=sketch&handling=arcade')).json();
console.log('leaderboard:', JSON.stringify(board.entries));
// A cheater claims 10 seconds with no inputs.
const cheat = await (await fetch('http://localhost:8787/submit', { method: 'POST', body: JSON.stringify({ name: 'Cheater', chapter: 'sketch', vehicle: 'rover', handling: 'arcade', gearbox: 'auto', autoCruise: true, time: 10, inputs: '', version: 1 }) })).json();
console.log('cheat rejected:', JSON.stringify(cheat));
await page.evaluate(() => window.__paintland.debugMenu('trials'));
await page.waitForTimeout(3000);
await page.screenshot({ path: new URL('./out/menu-trials.png', import.meta.url).pathname });
console.log(errors.join('\n') || 'no page errors');
await browser.close();
server.kill();
