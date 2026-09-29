/// <reference types="node" />
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccounts } from '../server/accounts.mjs';
import { createFishing } from '../server/fishing.mjs';
import { CONTEST_ROTATION, FISH_SIZES, checkCatch, contestFish } from '../server/fishrules.mjs';
import { DEFAULT_CONFIG, sanitizeConfig } from '../server/admin.mjs';
import { weekOf } from '../server/gallery.mjs';
import { FISH, FISHING_SPOTS, ReelGame, contestFishFor, fishHere, fishInk, recordCatch, rollFish, rollSize, sizeRange, speciesCaught, type FishBook } from '../src/gameplay/Fishing';
import { REST_RULES, addRest, cleanRest, newRest, restBonus, restedMinutes, wakeHour, waterPlants } from '../src/gameplay/Rest';
import { checkParty, lightLevel, newParty, pulsesPerSecond } from '../src/gameplay/Party';
import { DEFAULT_FEATURES } from '../src/brand/Brand';
import { TROPHIES } from '../src/gameplay/Trophies';

/** A seeded random 0..1. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('fishing', () => {
  it('has a size range for every fish (shared with the server) and something to catch at every spot, day and night, all year', () => {
    for (const f of FISH) expect(FISH_SIZES[f.id], f.id).toBeDefined();
    for (const id of CONTEST_ROTATION) expect(FISH.find((f) => f.id === id), id).toBeDefined();
    for (const s of FISHING_SPOTS)
      for (const hour of [3, 9, 14, 21])
        for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
          const here = fishHere({ water: s.water, area: s.area, hour, season });
          expect(here.filter((f) => !f.junk).length, `${s.id} ${hour}h ${season}`).toBeGreaterThan(0);
        }
  });

  it('every fish can be caught somewhere, at some time', () => {
    for (const f of FISH) {
      const ok = FISHING_SPOTS.some((s) => [3, 12].some((hour) => (['spring', 'summer', 'autumn', 'winter'] as const).some((season) => fishHere({ water: s.water, area: s.area, hour, season }).includes(f))));
      expect(ok, f.id).toBe(true);
    }
  });

  it('rolls mostly common fish, sometimes rare ones; sizes stay in range and bigger is worth more', () => {
    const r = seeded(7);
    const count: Record<number, number> = {};
    for (let i = 0; i < 4000; i++) {
      const f = rollFish({ water: 'sea', area: 'city', hour: 10, season: 'summer' }, r());
      count[f.rarity] = (count[f.rarity] ?? 0) + 1;
      const cm = rollSize(f.id, r());
      const [lo, hi] = sizeRange(f.id);
      expect(cm).toBeGreaterThanOrEqual(lo);
      expect(cm).toBeLessThanOrEqual(hi);
      expect(checkCatch(f.id, cm)).toBe(cm);
    }
    expect(count[0]).toBeGreaterThan(count[1]);
    expect(count[1]).toBeGreaterThan(count[2]);
    expect(count[3] ?? 0).toBeGreaterThan(0);
    const seer = FISH.find((f) => f.id === 'seer')!;
    expect(fishInk(seer, 139)).toBeGreaterThan(fishInk(seer, 51));
  });

  it('the reel game: strike in time to hook, keep the fish in the bar to land it', () => {
    const koi = FISH.find((f) => f.id === 'koi')!;
    // Too slow: nothing pressed after the bite.
    const slow = new ReelGame(koi, seeded(3));
    let t = 0;
    while (slow.phase !== 'lost' && t < 20) {
      slow.step(1 / 30, false, false);
      t += 1 / 30;
    }
    expect(slow.phase).toBe('lost');
    expect(slow.why.escaped).toBe('slow');
    // A good angler: strikes on the bite, then keeps the bar under the fish.
    for (const easy of [false, true]) {
      const g = new ReelGame(koi, seeded(11), easy);
      for (let i = 0; i < 3000 && g.phase !== 'caught' && g.phase !== 'lost'; i++) {
        const press = g.phase === 'bite';
        const hold = g.phase === 'reel' && g.fish > g.bar + g.barSize * 0.5;
        g.step(1 / 60, press, hold);
      }
      expect(g.phase, easy ? 'easy' : 'normal').toBe('caught');
    }
    // Doing nothing while reeling loses the fish.
    const lazy = new ReelGame(FISH.find((f) => f.id === 'tuna')!, seeded(5));
    for (let i = 0; i < 3000 && lazy.phase !== 'lost' && lazy.phase !== 'caught'; i++) lazy.step(1 / 60, lazy.phase === 'bite', false);
    expect(lazy.phase).toBe('lost');
  });

  it('nobody lands a fish without reeling, and a steady hand lands most', () => {
    let idle = 0;
    let skilled = 0;
    let n = 0;
    for (const f of FISH)
      for (let seed = 1; seed <= 20; seed++) {
        const a = new ReelGame(f, seeded(seed * 7919));
        for (let i = 0; i < 5000 && a.phase !== 'caught' && a.phase !== 'lost'; i++) a.step(1 / 60, a.phase === 'bite', false);
        if (a.phase === 'caught') idle++;
        const b = new ReelGame(f, seeded(seed * 104729));
        for (let i = 0; i < 5000 && b.phase !== 'caught' && b.phase !== 'lost'; i++) b.step(1 / 60, b.phase === 'bite', b.phase === 'reel' && b.fish > b.bar + b.barSize * 0.5);
        if (b.phase === 'caught') skilled++;
        n++;
      }
    expect(idle).toBe(0);
    expect(skilled / n).toBeGreaterThan(0.75);
  });

  it('easy fishing is gentler: a wider bar and more time to strike', () => {
    const f = FISH.find((x) => x.id === 'sailfish')!;
    const hard = new ReelGame(f, seeded(1));
    const easy = new ReelGame(f, seeded(1), true);
    expect(easy.barSize).toBeGreaterThan(hard.barSize);
    expect(easy.window).toBeGreaterThan(hard.window);
  });

  it('keeps a fish book of counts and records', () => {
    const book: FishBook = {};
    expect(recordCatch(book, 'koi', 40)).toEqual({ first: true, record: false });
    expect(recordCatch(book, 'koi', 35)).toEqual({ first: false, record: false });
    expect(recordCatch(book, 'koi', 61)).toEqual({ first: false, record: true });
    recordCatch(book, 'boot', 30);
    expect(book.koi).toEqual({ n: 3, best: 61 });
    expect(speciesCaught(book)).toBe(1); // a boot is not a species
  });

  it('the contest fish is the same on the game and the server, and changes each week', () => {
    const t = Date.UTC(2026, 8, 30, 10);
    expect(contestFishFor(t)).toBe(contestFish(weekOf(t).index));
    expect(contestFishFor(t + 7 * 86400_000)).not.toBe(contestFishFor(t));
    expect(checkCatch('koi', 999)).toBeNull();
    expect(checkCatch('nessie', 50)).toBeNull();
    expect(checkCatch('koi', '50')).toBeNull();
  });
});

describe('resting at home', () => {
  it('banks rest up to a cap and gives a small ink bonus while it lasts', () => {
    const s = newRest();
    const now = 1_000_000;
    expect(restBonus(s, now)).toBe(1);
    addRest(s, REST_RULES.minutes.sofa, now);
    expect(restedMinutes(s, now)).toBeCloseTo(15);
    expect(restBonus(s, now)).toBeCloseTo(1 + REST_RULES.bonus);
    addRest(s, 100, now);
    expect(restedMinutes(s, now)).toBe(REST_RULES.maxMinutes);
    expect(restBonus(s, now + REST_RULES.maxMinutes * 60000 + 1)).toBe(1);
  });

  it('plants take water once a day, grow every two days and bloom', () => {
    const s = newRest();
    expect(waterPlants(s, '2026-10-01').ok).toBe(true);
    expect(waterPlants(s, '2026-10-01').ok).toBe(false);
    const days = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];
    const results = days.map((d) => waterPlants(s, d));
    expect(s.plants.stage).toBe(3);
    expect(results.some((r) => r.grew)).toBe(true);
    expect(results[results.length - 1].bloomInk).toBe(REST_RULES.bloomInk);
  });

  it('sleep: after dark until morning, in the day until evening; damaged saves are tidied', () => {
    expect(wakeHour(22)).toBe(7);
    expect(wakeHour(2)).toBe(7);
    expect(wakeHour(11)).toBe(19);
    expect(cleanRest({ until: 'soon', plants: { stage: 9, days: -3, watered: 5 } })).toEqual({ until: 0, plants: { watered: '', stage: 3, days: 0 } });
    expect(cleanRest(null)).toEqual(newRest());
  });
});

describe('DJ parties', () => {
  it('lights never pulse faster than 3 times a second, and are a slow glow when calm', () => {
    for (const bpm of [60, 90, 120, 150, 180, 200, 240, 400]) expect(pulsesPerSecond(bpm, false), String(bpm)).toBeLessThanOrEqual(3);
    expect(pulsesPerSecond(120, true)).toBeLessThan(0.5);
    // Soft: the level never jumps by more than a little between two frames at 60 fps.
    let prev = lightLevel(0, 180, false);
    for (let i = 1; i < 600; i++) {
      const tm = i / 60;
      const lv = lightLevel(tm, 180, false);
      expect(Math.abs(lv - prev), `t=${tm}`).toBeLessThan(0.5);
      expect(lv).toBeGreaterThanOrEqual(0.3);
      prev = lv;
    }
  });

  it('checks party messages from other players', () => {
    const p = newParty('city-beach', 2, 3);
    expect(checkParty({ a: 'state', ...p })).toEqual({ a: 'state', ...p });
    expect(checkParty({ a: 'end', stage: 'city-beach' })).toEqual({ a: 'end', stage: 'city-beach' });
    expect(checkParty({ a: 'state', ...p, filter: 5 })).toBeNull();
    expect(checkParty({ a: 'state', ...p, stage: '<script>' })).toBeNull();
    expect(checkParty({ a: 'state', ...p, station: 1.5 })).toBeNull();
    expect(checkParty({ a: 'dance' })).toBeNull();
    expect(checkParty('party')).toBeNull();
  });
});

describe('owner switches and trophies', () => {
  it('the admin can switch the fishing contest and party mode off', () => {
    expect(Object.keys(DEFAULT_CONFIG.features).sort()).toEqual(Object.keys(DEFAULT_FEATURES).sort());
    const c = sanitizeConfig({ features: { fishingContest: false, party: 0, sneaky: true } }, structuredClone(DEFAULT_CONFIG));
    expect(c.features).toEqual({ fishingContest: false, party: false });
  });

  it('has trophies for fishing, home and parties, each reachable', () => {
    const ids = TROPHIES.map((t) => t.id);
    for (const id of ['first-fish', 'fishbook-all', 'legend-fish', 'cosy', 'sleep', 'green-thumb', 'dj-1', 'dance-60']) expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ————— the weekly fishing contest on the server —————

let server: Server;
let base = '';
let dir = '';
let clock = Date.UTC(2026, 8, 28, 12); // a Monday
let contestOn = true;
let fishing: ReturnType<typeof createFishing>;

beforeAll(async () => {
  process.env.TRUST_PROXY = '1';
  dir = mkdtempSync(join(tmpdir(), 'inkroads-fishing-'));
  const accounts = createAccounts({ dataDir: dir, isBanned: () => false, now: () => clock, onDelete: (uid) => fishing.forget(uid) });
  fishing = createFishing({ dataDir: dir, userForToken: (t) => accounts.userForToken(t), isBanned: () => false, enabled: () => contestOn, now: () => clock });
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    void accounts.handle(req, res, url).then((h) => h || fishing.handle(req, res, url)).then((h) => {
      if (!h) {
        res.writeHead(404);
        res.end();
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const a = server.address();
  base = `http://127.0.0.1:${typeof a === 'object' && a ? a.port : 0}`;
});

afterAll(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

let ipN = 1;
async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${ipN++ % 250}.1`, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const register = async (name: string) => (await call('POST', '/api/account/register', { name, password: 'lotus-pond-42' })).body.token as string;

describe('weekly fishing contest', () => {
  it('keeps each angler’s biggest catch of the week’s fish, checks sizes, and crowns last week’s winner', async () => {
    const fish = contestFish(weekOf(clock).index);
    const [lo, hi] = FISH_SIZES[fish];
    const [ana, bo] = [await register('AnaFish'), await register('BoFish')];
    expect((await call('POST', '/api/fishing/catch', { fish, cm: lo + 1 })).status).toBe(401);
    expect((await call('POST', '/api/fishing/catch', { fish, cm: hi + 50 }, ana)).status).toBe(400);
    clock += 10_000;
    const other = CONTEST_ROTATION.find((f) => f !== fish)!;
    expect((await call('POST', '/api/fishing/catch', { fish: other, cm: FISH_SIZES[other][0] + 1 }, ana)).status).toBe(400);
    clock += 10_000;
    expect((await call('POST', '/api/fishing/catch', { fish, cm: lo + 2 }, ana)).body).toMatchObject({ ok: true, better: true, rank: 1 });
    // Too fast after the last one.
    expect((await call('POST', '/api/fishing/catch', { fish, cm: lo + 3 }, ana)).status).toBe(429);
    clock += 10_000;
    expect((await call('POST', '/api/fishing/catch', { fish, cm: lo + 1 }, ana)).body).toMatchObject({ ok: true, better: false, best: lo + 2 });
    clock += 10_000;
    expect((await call('POST', '/api/fishing/catch', { fish, cm: hi - 1 }, bo)).body).toMatchObject({ ok: true, rank: 1 });
    const board = (await call('GET', '/api/fishing', undefined, ana)).body;
    expect(board).toMatchObject({ on: true, fish, mine: lo + 2 });
    expect(board.top.map((e: { name: string }) => e.name)).toEqual(['BoFish', 'AnaFish']);
    // Next week: a new fish, and last week's winner.
    clock += 7 * 86400_000;
    const next = (await call('GET', '/api/fishing')).body;
    expect(next.fish).not.toBe(fish);
    expect(next.last).toEqual({ fish, name: 'BoFish', cm: hi - 1 });
    // The owner can switch it off.
    contestOn = false;
    expect((await call('GET', '/api/fishing')).body).toEqual({ ok: true, on: false });
    contestOn = true;
  });
});
