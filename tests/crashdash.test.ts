// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAdmin, crashId, crashSignature } from '../server/admin.mjs';

/** The crash and performance dashboard (admin → 🩺 Crashes & speed). */
describe('crash and performance dashboard', () => {
  let server: Server;
  let base = '';
  let token = '';
  const dir = mkdtempSync(join(tmpdir(), 'inkroads-crash-'));

  const post = (path: string, body: unknown, auth = false) =>
    fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }).then((r) => r.json());
  const health = () => fetch(`${base}/api/admin/health`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
  const send = (pid: string, sid: string, events: { type: string; data?: Record<string, unknown> }[]) => post('/api/analytics', { pid, sid, events });

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = 'test@example.com';
    process.env.ADMIN_PASSWORD = 'crash-test-password';
    const admin = createAdmin({ dataDir: dir, live: () => ({ rooms: 0, online: 0, roomSizes: {} }) });
    server = createServer((req, res) => {
      void admin.handle(req, res, new URL(req.url ?? '/', 'http://x')).then((done: boolean) => done || (res.writeHead(404), res.end()));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
    token = (await post('/api/admin/login', { email: 'test@example.com', password: 'crash-test-password' })).token;
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('groups the same bug across builds (hashes and line numbers ignored)', () => {
    const a = crashSignature('x is undefined', 'at Game.tick (index-AbC12345.js:1:2345)');
    const b = crashSignature('x is undefined', 'at Game.tick (index-Zz998877.js:1:9999)');
    expect(a).toBe(b);
    expect(crashId('x is undefined', 'at Game.tick (index-AbC12345.js:1:2345)')).toBe(crashId('x is undefined', 'at Game.tick (index-Zz998877.js:1:9999)'));
    expect(crashId('x is undefined', 'at Hub.step (index-AbC12345.js:1:2345)')).not.toBe(crashId('x is undefined', 'at Game.tick (index-AbC12345.js:1:2345)'));
  });

  it('needs the admin login', async () => {
    const r = await fetch(`${base}/api/admin/health`);
    expect(r.status).toBe(401);
    const c = await fetch(`${base}/api/admin/crash`, { method: 'POST', body: '{}' });
    expect(c.status).toBe(401);
  });

  it('counts crash-free sessions, groups errors, and tracks builds, devices and places', async () => {
    const session = (ver: string, device = 'desktop', platform = 'web') => ({ type: 'session', data: { lang: 'en', device, quality: 'medium', tz: 'UTC', ver, platform } });
    const err = (place: string, fatal = true) => ({ type: 'error', data: { msg: 'Cannot read properties of undefined', where: 'frame', top: 'at Game.tick (index-Abcd1234.js:1:500)', fatal, place } });
    await send('player-aaaa-0001', 's1', [session('0.1.10'), err('serendib')]);
    await send('player-aaaa-0002', 's2', [session('0.1.10', 'touch'), err('hub'), err('hub')]);
    await send('player-aaaa-0003', 's3', [session('0.1.10', 'desktop', 'desktop'), { type: 'error', data: { msg: 'Menu slip', where: 'menu:settings', top: '', fatal: false } }]);
    await send('player-aaaa-0004', 's4', [session('0.1.10')]);
    const h = await health();
    expect(h.crashFree7.sessions).toBe(4);
    expect(h.crashFree7.crashed).toBe(2); // one crash counted per session; the non-fatal one doesn't count
    expect(h.crashFree7.rate).toBe(50);
    const g = h.groups.find((x: { msg: string }) => x.msg === 'Cannot read properties of undefined');
    expect(g.count).toBe(3);
    expect(g.week).toBe(3);
    expect(g.trend.at(-1)).toBe(3);
    expect(g.status).toBe('open');
    expect(g.versions).toEqual([{ key: '0.1.10', value: 3 }]);
    expect(g.places[0]).toEqual({ key: 'hub', value: 2 });
    expect(g.devices.map((d: { key: string }) => d.key).sort()).toEqual(['web/desktop', 'web/touch']);
    const slip = h.groups.find((x: { msg: string }) => x.msg === 'Menu slip');
    expect(slip.fatal).toBe(0);
    const v = h.versions.find((x: { ver: string }) => x.ver === '0.1.10');
    expect(v).toMatchObject({ sessions: 4, crashed: 2, crashFree: 50 });
    expect(h.open).toBe(2);
  });

  it('averages frame rates by place, quality, device and build, and counts slow minutes', async () => {
    const beat = (fps: number, where: string, q = 'medium') => ({ type: 'beat', data: { sec: 60, fps, where, q } });
    await send('player-aaaa-0001', 's1', [beat(60, 'serendib'), beat(20, 'serendib'), beat(50, 'hub', 'high')]);
    await send('player-aaaa-0002', 's2', [beat(24, 'hub', 'low')]);
    const { perf, versions, days } = await health();
    expect(perf.minutes).toBe(4);
    expect(perf.fps).toBe(38.5);
    expect(perf.slow).toBe(50); // 20 and 24 fps are under 30
    const place = (k: string) => perf.places.find((r: { key: string }) => r.key === k);
    expect(place('serendib')).toMatchObject({ minutes: 2, fps: 40, slow: 50 });
    expect(place('hub')).toMatchObject({ minutes: 2, fps: 37, slow: 50 });
    expect(perf.places[0].fps).toBeLessThanOrEqual(perf.places[1].fps); // slowest first
    expect(perf.quality.find((r: { key: string }) => r.key === 'low')).toMatchObject({ minutes: 1, fps: 24, slow: 100 });
    expect(perf.devices.find((r: { key: string }) => r.key === 'touch')).toMatchObject({ minutes: 1 });
    expect(versions[0]).toMatchObject({ ver: '0.1.10', minutes: 4, fps: 38.5 });
    expect(days.at(-1).fps).toBe(38.5);
  });

  it('resolve hides an error until a newer build sends it again; ignore and reopen', async () => {
    let h = await health();
    const g = h.groups.find((x: { msg: string }) => x.msg === 'Cannot read properties of undefined');
    expect((await post('/api/admin/crash', { id: g.id, action: 'resolve' }, true)).ok).toBe(true);
    h = await health();
    expect(h.groups.find((x: { id: string }) => x.id === g.id).status).toBe('resolved');
    expect(h.open).toBe(1);

    // An old build still in players' hands sends it again: still fixed.
    await send('player-aaaa-0005', 's5', [{ type: 'session', data: { ver: '0.1.10' } }, { type: 'error', data: { msg: g.msg, top: 'at Game.tick (index-Abcd1234.js:1:500)' } }]);
    h = await health();
    expect(h.groups.find((x: { id: string }) => x.id === g.id).status).toBe('resolved');

    // A build released after the fix sends it: it regressed.
    await new Promise((r) => setTimeout(r, 5));
    await send('player-aaaa-0006', 's6', [{ type: 'session', data: { ver: '0.1.11' } }, { type: 'error', data: { msg: g.msg, top: 'at Game.tick (index-Newb5678.js:1:777)' } }]);
    h = await health();
    const again = h.groups.find((x: { id: string }) => x.id === g.id);
    expect(again.status).toBe('regressed');
    expect(h.regressed).toBe(1);
    expect(h.groups[0].id).toBe(g.id); // regressed errors are listed first

    expect((await post('/api/admin/crash', { id: g.id, action: 'ignore' }, true)).ok).toBe(true);
    expect((await health()).groups.find((x: { id: string }) => x.id === g.id).status).toBe('ignored');
    expect((await post('/api/admin/crash', { id: g.id, action: 'reopen' }, true)).ok).toBe(true);
    expect((await health()).groups.find((x: { id: string }) => x.id === g.id).status).toBe('open');
    expect((await post('/api/admin/crash', { id: 'nope', action: 'resolve' }, true)).ok).toBe(false);
    expect((await post('/api/admin/crash', { id: g.id, action: 'delete-everything' }, true)).ok).toBe(false);
  });

  it('the main dashboard still shows the crash-free tile and the top open errors', async () => {
    const s = await fetch(`${base}/api/admin/stats`, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());
    expect(s.health.sessions7).toBeGreaterThan(0);
    expect(s.health.errors.length).toBeGreaterThan(0);
    expect(s.health.errors.length).toBeLessThanOrEqual(5);
  });
});
