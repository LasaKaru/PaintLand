import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, createAdmin, maintenanceState, sanitizeConfig } from '../server/admin.mjs';
import { brand, setBrand, type MaintenanceInfo } from '../src/brand/Brand';
import { formatWait, maintState, SOON_MS, waitParts } from '../src/ui/Maintenance';

const HOUR = 3600_000;

describe('closing the game: the rules', () => {
  it('open, coming up, closed, and open again by itself at the set time', () => {
    const now = 1_800_000_000_000;
    expect(maintenanceState({ on: false }, now)).toEqual({ active: false, upcoming: false });
    expect(maintenanceState({ on: true, from: 0, until: 0 }, now).active).toBe(true);
    expect(maintenanceState({ on: true, from: now + HOUR, until: 0 }, now)).toEqual({ active: false, upcoming: true });
    expect(maintenanceState({ on: true, from: now - HOUR, until: now + HOUR }, now).active).toBe(true);
    expect(maintenanceState({ on: true, from: 0, until: now - 1 }, now)).toEqual({ active: false, upcoming: false });
  });

  it('checks what the admin panel sends', () => {
    const later = Date.now() + 2 * HOUR;
    const c = sanitizeConfig({ maintenance: { on: 1, mode: 'hacking', message: `<b>${'x'.repeat(400)}`, from: 'soon', until: later, offline: false, extra: 1 } }, structuredClone(DEFAULT_CONFIG));
    expect(c.maintenance).toEqual({ on: true, mode: 'maintenance', message: expect.any(String), from: 0, until: later, offline: false });
    expect(c.maintenance.message.length).toBeLessThanOrEqual(240);
    // "Back at" before the start makes no sense: it's dropped (no set time).
    expect(sanitizeConfig({ maintenance: { on: true, mode: 'development', from: later, until: later - HOUR } }, c).maintenance).toMatchObject({ mode: 'development', from: later, until: 0 });
    // Silly far-future times are refused; letting players play alone is on unless switched off.
    const far = sanitizeConfig({ maintenance: { on: true, until: Date.now() + 5 * 365 * 86400_000 } }, c).maintenance;
    expect(far.until).toBe(0);
    expect(far.offline).toBe(true);
  });
});

describe('closing the game: the server', () => {
  let server: Server;
  let base = '';
  let token = '';
  let admin: ReturnType<typeof createAdmin>;
  const dir = mkdtempSync(join(tmpdir(), 'inkroads-maint-'));
  const json = (path: string, method = 'GET', body?: unknown, auth = false) =>
    fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = 'test@example.com';
    process.env.ADMIN_PASSWORD = 'maintenance-test-password';
    admin = createAdmin({ dataDir: dir, live: () => ({ rooms: 0, online: 0, roomSizes: {} }) });
    server = createServer((req, res) => {
      void admin.handle(req, res, new URL(req.url ?? '/', 'http://x')).then((done: boolean) => done || (res.writeHead(404), res.end()));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
    token = (await json('/api/admin/login', 'POST', { email: 'test@example.com', password: 'maintenance-test-password' })).token;
  });

  afterAll(async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('only the admin can close the game', async () => {
    const r = await fetch(`${base}/api/admin/config`, { method: 'PUT', body: JSON.stringify({ maintenance: { on: true } }) });
    expect(r.status).toBe(401);
    expect(admin.closed()).toBe(false);
    expect((await json('/api/config')).maintenance).toBeUndefined();
  });

  it('players see it closed, with the note and when it opens; relays turn them away', async () => {
    const until = Date.now() + HOUR;
    await json('/api/admin/config', 'PUT', { maintenance: { on: true, mode: 'development', message: 'New chapter tonight!', until, offline: false } }, true);
    const pub = (await json('/api/config')).maintenance as MaintenanceInfo;
    expect(pub).toMatchObject({ mode: 'development', message: 'New chapter tonight!', until, offline: false, active: true });
    expect(Math.abs(pub.now - Date.now())).toBeLessThan(5000);
    expect(admin.closed()).toBe(true);
    expect(admin.reopens()).toBe(until);
  });

  it('a later start is announced ahead (not closed yet), and opening it clears everything', async () => {
    await json('/api/admin/config', 'PUT', { maintenance: { on: true, from: Date.now() + 10 * 60_000 } }, true);
    const pub = (await json('/api/config')).maintenance as MaintenanceInfo;
    expect(pub.active).toBe(false);
    expect(admin.closed()).toBe(false);
    await json('/api/admin/config', 'PUT', { maintenance: { on: false } }, true);
    expect((await json('/api/config')).maintenance).toBeUndefined();
  });
});

describe('closing the game: what players see', () => {
  const m = (o: Partial<MaintenanceInfo>): MaintenanceInfo => ({ mode: 'maintenance', message: '', from: 0, until: 0, offline: true, active: true, now: 0, ...o });
  const now = 1_800_000_000_000;

  it('closed, warned 15 minutes before, and open again at the set time even without the server', () => {
    expect(maintState(undefined, now)).toBe('open');
    expect(maintState(m({}), now)).toBe('closed');
    expect(maintState(m({ from: now + SOON_MS - 1000 }), now)).toBe('soon');
    expect(maintState(m({ from: now + SOON_MS + 60_000 }), now)).toBe('open');
    expect(maintState(m({ until: now + 1000 }), now)).toBe('closed');
    expect(maintState(m({ until: now }), now)).toBe('open');
  });

  it('counts down in the player’s language', () => {
    expect(waitParts(90_061_000)).toEqual({ d: 1, h: 1, m: 1, s: 1 });
    expect(waitParts(-5)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
    const en = formatWait(HOUR + 5 * 60_000, 'en');
    expect(en).toMatch(/1/);
    expect(en).toMatch(/5/);
    expect(formatWait(42_000, 'en')).toMatch(/42/);
    expect(formatWait(2 * 86400_000 + 3 * HOUR, 'en')).toMatch(/2.*3/);
    expect(formatWait(HOUR, 'ja')).not.toBe(formatWait(HOUR, 'en'));
  });

  it('a "closed" never sticks from the cache (offline players can always play on their own)', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage ??= { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
    const b = brand();
    setBrand({ ...b, maintenance: m({}) });
    expect(brand().maintenance).toBeDefined();
    const cached = JSON.parse(localStorage.getItem('paintland.brand') ?? '{}') as { maintenance?: unknown };
    expect(cached.maintenance).toBeUndefined();
    setBrand(b);
  });
});
