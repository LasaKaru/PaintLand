import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FreeCar, FreeWorld } from '../src/gameplay/FreeRoam';
import { ROVER_TUNING } from '../src/gameplay/RoverController';
import { CATALOGUE, Profile } from '../src/gameplay/Profile';
import { openChest, rollRarity } from '../src/gameplay/Loot';
import { CITY_MISSIONS, FreeMissionTracker, missionUnlocked } from '../src/gameplay/CityMissions';
import { validateState } from '../server/validate.mjs';

const DT = 1 / 60;
const car = (): FreeCar => new FreeCar({ ...ROVER_TUNING });
const open = (): FreeWorld => new FreeWorld({ minX: -800, maxX: 800, minZ: -800, maxZ: 800 });
const drive = { throttle: 1, brake: 0, steer: 0, hop: false, boost: false };

/** A seeded generator so loot tests are repeatable. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('Free-roam fun: drift, pads, ramps', () => {
  it('holding drift through a fast turn charges a mini-turbo that fires on release', () => {
    const c = car();
    const w = open();
    let turbo = 0;
    c.onMiniTurbo = (charge) => (turbo = charge);
    for (let t = 0; t < 4; t += DT) c.step(DT, drive, w);
    for (let t = 0; t < 1.5; t += DT) c.step(DT, { ...drive, steer: 0.8, drift: true }, w);
    expect(c.drifting).toBe(true);
    expect(c.driftCharge).toBeGreaterThan(0.8);
    c.step(DT, { ...drive, steer: 0.8, drift: false }, w);
    expect(turbo).toBeGreaterThan(0.8);
    expect(c.burst).toBeGreaterThan(1);
    // The burst lets the car beat its normal top speed for a moment.
    for (let t = 0; t < 0.8; t += DT) c.step(DT, drive, w);
    expect(c.v).toBeGreaterThan(c.topSpeed);
  });

  it('a short tap of drift gives no turbo', () => {
    const c = car();
    const w = open();
    let turbos = 0;
    c.onMiniTurbo = () => turbos++;
    for (let t = 0; t < 4; t += DT) c.step(DT, drive, w);
    for (let t = 0; t < 0.2; t += DT) c.step(DT, { ...drive, steer: 0.8, drift: true }, w);
    c.step(DT, drive, w);
    expect(turbos).toBe(0);
  });

  it('boost pads fire once and then cool down', () => {
    const c = car();
    const w = open();
    w.pads.push({ x: 0, z: -40, r: 3 });
    let pads = 0;
    c.onPad = () => pads++;
    for (let t = 0; t < 5; t += DT) c.step(DT, drive, w);
    expect(pads).toBe(1);
  });

  it('a ramp launches a fast car in line with it, and the landing reports air time', () => {
    const c = car();
    const w = open();
    const ramp = { x: 0, z: -80, heading: 0, halfWidth: 4, halfLength: 3.5, power: 9, stunt: true };
    w.ramps.push(ramp);
    let launched = null as unknown;
    let air = 0;
    c.onRamp = (r) => (launched = r);
    c.onLand = (a) => (air = a);
    for (let t = 0; t < 8; t += DT) c.step(DT, drive, w);
    expect(launched).toBe(ramp);
    expect(air).toBeGreaterThan(0.8);
    expect(c.grounded).toBe(true);
  });

  it('aimed stunt ramps land a fast car on the target, and a slow one short of it', () => {
    const run = (speed: number): number => {
      const c = car();
      const w = open();
      w.ramps.push({ x: 0, z: -120, heading: 0, halfWidth: 4, halfLength: 3.5, power: 9, stunt: true, reach: 48 });
      let landedAt = NaN;
      c.onLand = () => (landedAt = c.z);
      // Hold the throttle only up to the chosen speed.
      for (let t = 0; t < 12 && Number.isNaN(landedAt); t += DT) c.step(DT, { ...drive, throttle: c.v < speed ? 1 : 0 }, w);
      return landedAt;
    };
    const fast = run(26);
    expect(Math.abs(fast - (-120 - 48))).toBeLessThan(9);
    const slow = run(15);
    expect(slow).toBeGreaterThan(-120 - 48 + 9);
  });

  it('a ramp approached sideways does nothing', () => {
    const c = car();
    const w = open();
    w.ramps.push({ x: 0, z: -80, heading: Math.PI / 2, halfWidth: 4, halfLength: 3.5, power: 9, stunt: true });
    let launches = 0;
    c.onRamp = () => launches++;
    for (let t = 0; t < 8; t += DT) c.step(DT, drive, w);
    expect(launches).toBe(0);
  });
});

describe('Loot chests', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
  });

  it('better chests roll better rarities', () => {
    const avg = (tier: number): number => {
      const r = seeded(tier + 1);
      let sum = 0;
      for (let i = 0; i < 4000; i++) sum += rollRarity(tier, r());
      return sum / 4000;
    };
    const a = [0, 1, 2, 3].map(avg);
    for (let i = 1; i < 4; i++) expect(a[i]).toBeGreaterThan(a[i - 1]);
    // Common chests are never legendary; legendary chests are never common.
    const r = seeded(9);
    for (let i = 0; i < 2000; i++) {
      expect(rollRarity(0, r())).toBeLessThan(3);
      expect(rollRarity(3, r())).toBeGreaterThan(0);
    }
  });

  it('opening a chest always pays out and records stats', () => {
    const p = new Profile();
    const r = seeded(42);
    for (let i = 0; i < 30; i++) {
      const ink0 = p.data.ink;
      const owned0 = p.data.owned.length;
      const loot = openChest(p, i % 4, r);
      expect(loot.ink).toBeGreaterThan(0);
      expect(p.data.ink).toBe(ink0 + loot.ink);
      if (loot.item) {
        expect(p.data.owned.length).toBe(owned0 + 1);
        expect(loot.item.rarity).toBe(loot.rarity);
      }
    }
    expect(p.stat('chests')).toBe(30);
  });

  it('never hands out an item the player already owns', () => {
    const p = new Profile();
    const r = seeded(7);
    for (let i = 0; i < 200; i++) openChest(p, 3, r);
    expect(new Set(p.data.owned).size).toBe(p.data.owned.length);
  });

  it('loot-only items exist for every rarity above common', () => {
    for (const rarity of [1, 2, 3]) expect(CATALOGUE.some((i) => i.loot && i.rarity === rarity), `rarity ${rarity}`).toBe(true);
  });
});

describe('City mission chains', () => {
  it('every mission has steps with targets, and chains unlock in order', () => {
    const ids = new Set(CITY_MISSIONS.map((m) => m.id));
    for (const m of CITY_MISSIONS) {
      expect(m.steps.length).toBeGreaterThan(0);
      for (const s of m.steps) expect(s.targets.length).toBeGreaterThan(0);
      if (m.requires) expect(ids.has(m.requires)).toBe(true);
      for (const s of m.steps) for (const t of s.targets) {
        expect(Math.abs(t.x)).toBeLessThanOrEqual(640);
        expect(t.z).toBeGreaterThanOrEqual(-600);
        expect(t.z).toBeLessThanOrEqual(650);
      }
      if (m.reward.item) expect(CATALOGUE.some((i) => i.id === m.reward.item), m.reward.item).toBe(true);
    }
    const tt2 = CITY_MISSIONS.find((m) => m.id === 'tt-2')!;
    expect(missionUnlocked(tt2, [])).toBe(false);
    expect(missionUnlocked(tt2, ['tt-1'])).toBe(true);
  });

  it('checkpoints must be taken in order and a delivery can run out of time', () => {
    const tr = new FreeMissionTracker();
    const m = CITY_MISSIONS.find((q) => q.id === 'tt-2')!;
    tr.start(m);
    const [a, b] = m.steps[0].targets;
    // Driving through the second checkpoint first does nothing.
    expect(tr.update(DT, b.x, b.z, false)).toEqual([]);
    expect(tr.update(DT, a.x, a.z, false)).toEqual(['target']);
    expect(tr.update(DT, b.x, b.z, false)).toEqual(['target']);
    const late = tr.update(200, 0, 0, false);
    expect(late).toContain('failed');
    expect(tr.mission).toBeNull();
  });

  it('runs a whole mission: pick-up, then delivery', () => {
    const tr = new FreeMissionTracker();
    const m = CITY_MISSIONS.find((q) => q.id === 'tt-1')!;
    tr.start(m);
    const pick = m.steps[0].targets[0];
    expect(tr.update(DT, pick.x, pick.z, false)).toEqual(['target', 'step']);
    const drop = m.steps[1].targets[0];
    expect(tr.update(DT, drop.x, drop.z, false)).toEqual(['target', 'complete']);
  });

  it('on-foot steps ignore the car; photo and stunt steps finish through their own events', () => {
    const tr = new FreeMissionTracker();
    const m = CITY_MISSIONS.find((q) => q.id === 'pp-2')!;
    tr.start(m);
    const walk = m.steps[0].targets[0];
    expect(tr.update(DT, walk.x, walk.z, false)).toEqual([]);
    expect(tr.update(DT, walk.x, walk.z, true)).toEqual(['target', 'step']);
    expect(tr.update(DT, walk.x, walk.z, true)).toEqual([]);
    expect(tr.onPhoto(900, 900)).toEqual([]);
    expect(tr.onPhoto(walk.x, walk.z)).toEqual(['complete']);

    const stunt = new FreeMissionTracker();
    stunt.start(CITY_MISSIONS.find((q) => q.id === 'ss-1')!);
    expect(stunt.onStunt('stunt-lake')).toEqual([]);
    expect(stunt.onStunt('stunt-bus')).toEqual(['complete']);
  });
});

describe('Multiplayer validation in Serendib City', () => {
  const state = (chapter: string, x: number, z: number, v = 10) => ({ chapter, mode: 'drive', s: z + 1000, x, h: 0, yaw: 0, v });
  it('accepts positions anywhere in the city but not beyond it', () => {
    expect(validateState(state('city', -620, -590), null, 0).ok).toBe(true);
    expect(validateState(state('city', 630, 540), null, 0).ok).toBe(true);
    expect(validateState(state('city', 700, 0), null, 0).ok).toBe(false);
    expect(validateState(state('hub', 200, 0), null, 0).ok).toBe(false);
    expect(validateState(state('city', 0, 0, 80), null, 0).ok).toBe(false);
  });
});
