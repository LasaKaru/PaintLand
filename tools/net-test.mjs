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
// 3 · Two separate windows over the relay, both in Harbour Town: p2 parks in front of p1.
await ctx.close();
const relay = spawn(process.execPath, ['server/relay.mjs'], { env: { ...process.env, PORT: '8797' } });
await new Promise((r) => setTimeout(r, 1000));
const w1 = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
const w2 = await (await browser.newContext({ viewport: { width: 640, height: 400 } })).newPage();
for (const p of [w1, w2]) {
  p.on('pageerror', (e) => console.log('[w pageerror]', e.message));
  await p.goto('http://localhost:5173/', { timeout: 120000 });
  await p.waitForFunction(() => window.__paintland, null, { timeout: 90000 });
}
await w1.evaluate(() => { window.__paintland.debugHub(0, 30, 0); window.__paintland.debugNet('hubroom', 'ws://localhost:8797'); });
await w2.evaluate(() => { window.__paintland.debugHub(0, 18, Math.PI); window.__paintland.debugNet('hubroom', 'ws://localhost:8797'); });
await w1.waitForFunction(() => window.__paintland.remotes.count() > 0, null, { timeout: 90000 }).catch(() => undefined);
await w1.waitForTimeout(8000);
const seen = await w1.evaluate(() => { const g = window.__paintland; const av = [...g.remotes.avatars.values()][0]; return av ? { count: g.remotes.count(), x: +av.vehicle.root.position.x.toFixed(1), y: +av.vehicle.root.position.y.toFixed(1), z: +av.vehicle.root.position.z.toFixed(1) } : null; });
console.log('debug', await w1.evaluate(() => { const g = window.__paintland; return JSON.stringify({ status: g.net.status, state: g.state, peers: [...g.net.peers.values()].map(p => ({ info: p.info?.chapter, snaps: p.snapshots.length, sample: g.net.sample(p)?.chapter })), t: g.time, count: g.remotes.count(), inHub: g.inHub }); }));
console.log('w2', await w2.evaluate(() => { const g = window.__paintland; return JSON.stringify({ state: g.state, inHub: g.inHub, t: g.time, info: g.playerInfo().chapter }); }));
console.log('hub: window 1 draws window 2 at', JSON.stringify(seen), '(expected about x 0, y 2, z 18)');
await w1.screenshot({ path: new URL('./out/net-hub.png', import.meta.url).pathname });
relay.kill();
await browser.close();
