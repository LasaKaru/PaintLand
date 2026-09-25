// Dev tool: two players in one browser (BroadcastChannel) + a relay server round trip.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { WebSocket } = await import('ws');

// 1 · Relay server: two raw clients in a room.
const server = spawn(process.execPath, ['server/relay.mjs'], { env: { ...process.env, PORT: '8799' } });
await new Promise((r) => setTimeout(r, 800));
const got = [];
const a = new WebSocket('ws://localhost:8799/?room=test');
const b = new WebSocket('ws://localhost:8799/?room=test');
b.on('message', (m) => got.push(JSON.parse(String(m))));
await new Promise((r) => setTimeout(r, 500));
a.send(JSON.stringify({ t: 'chat', text: 'hello from a', id: 'spoofed' }));
a.send(JSON.stringify({ t: 'evil', text: 'dropped' }));
await new Promise((r) => setTimeout(r, 400));
const chat = got.find((m) => m.t === 'chat');
console.log('relay chat received:', !!chat, 'id rewritten:', chat && chat.id !== 'spoofed', 'unknown type dropped:', !got.some((m) => m.t === 'evil'));
// Physically impossible states are dropped by the server.
a.send(JSON.stringify({ t: 'state', chapter: 'sketch', mode: 'drive', s: 100, x: 0, h: 0, yaw: 0, v: 30, time: 1 }));
a.send(JSON.stringify({ t: 'state', chapter: 'sketch', mode: 'drive', s: 100, x: 0, h: 0, yaw: 0, v: 900, time: 2 }));
a.send(JSON.stringify({ t: 'state', chapter: 'sketch', mode: 'drive', s: 2900, x: 0, h: 0, yaw: 0, v: 30, time: 3 }));
await new Promise((r) => setTimeout(r, 400));
const states = got.filter((m) => m.t === 'state');
console.log('valid state relayed:', states.length === 1, 'speed hack and teleport dropped:', states.every((m) => m.v === 30 && m.s === 100));
a.close();
await new Promise((r) => setTimeout(r, 300));
console.log('bye relayed:', got.some((m) => m.t === 'bye'));
b.close();
server.kill();

// 2 · Two browser pages in the same room over BroadcastChannel.
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 600 } });
const p1 = await ctx.newPage();
const p2 = await ctx.newPage();
for (const p of [p1, p2]) {
  await p.goto('http://localhost:5173/');
  await p.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
}
await p1.waitForTimeout(2000);
for (const p of [p1, p2]) {
  await p.evaluate(() => { window.__paintland.debugMenu('main'); window.__paintland.debugNet('tabroom'); window.__paintland.debugJump(30, 'morning', false, 'sketch'); });
}
await p2.evaluate(() => window.__paintland.debugJump(40, 'morning', false, 'sketch'));
await p1.waitForTimeout(5000);
console.log('p1 sees peers:', (await p1.evaluate(() => window.__paintland.debugInfo())).peers);
console.log('p2 sees peers:', (await p2.evaluate(() => window.__paintland.debugInfo())).peers);
await p1.screenshot({ path: new URL('./out/net-p1.png', import.meta.url).pathname });
await browser.close();
