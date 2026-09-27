import { describe, expect, it } from 'vitest';
import { CEILING, CourseRun, Glider, courseInk, makeCourse, throughRing, type Airspace, type GliderEvent } from '../src/gameplay/Glider';
import { Hills } from '../src/world/Hills';
import { Hub } from '../src/world/Hub';
import { Village } from '../src/world/Village';
import { City } from '../src/world/City';
import type { FreeRoamArea } from '../src/world/FreeRoamArea';
import { validateState } from '../server/validate.mjs';
import { TROPHIES } from '../src/gameplay/Trophies';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const open = (water = false): Airspace => ({
  bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  resolve: () => null,
  ground: () => ({ y: water ? -1 : 0, water }),
});

function fly(g: Glider, space: Airspace, input: { pitch: number; roll: number; gust: boolean }, seconds: number, thermals = [] as { x: number; z: number; r: number; lift: number }[]): GliderEvent[] {
  const all: GliderEvent[] = [];
  for (let t = 0; t < seconds && g.flying; t += 1 / 60) all.push(...g.step(1 / 60, input, space, thermals));
  return all;
}

describe('paper plane', () => {
  it('glides a long way from a launch and lands gently when left alone', () => {
    const g = new Glider();
    g.launch(0, 28, 0, 0);
    const ev = fly(g, open(), { pitch: 0, roll: 0, gust: false }, 120);
    expect(ev).toContain('landed');
    expect(ev).not.toContain('crashed');
    // A glide ratio of about 10 : 1 or better.
    expect(Math.hypot(g.x, g.z)).toBeGreaterThan(200);
  });

  it('diving straight into the ground crumples it; water is a splash', () => {
    const g = new Glider();
    g.launch(0, 40, 0, 0);
    expect(fly(g, open(), { pitch: 1, roll: 0, gust: true }, 30)).toContain('crashed');
    g.launch(0, 40, 0, 0);
    expect(fly(g, open(true), { pitch: 1, roll: 0, gust: false }, 30)).toContain('splash');
  });

  it('pulling up too long stalls, and the nose drops to recover speed', () => {
    const g = new Glider();
    g.launch(0, 60, 0, 0);
    const ev = fly(g, open(), { pitch: -1, roll: 0, gust: false }, 6);
    expect(ev).toContain('stall');
    fly(g, open(), { pitch: 0, roll: 0, gust: false }, 4);
    expect(g.speed).toBeGreaterThan(8);
  });

  it('banks to turn, climbs in a thermal, and the gust meter drains and refills', () => {
    const g = new Glider();
    g.launch(0, 30, 0, 0);
    fly(g, open(), { pitch: 0, roll: 1, gust: false }, 1);
    expect(g.heading).toBeLessThan(-0.2); // bank right → turn right
    g.launch(0, 20, 0, 0, 12);
    const y0 = g.y;
    fly(g, open(), { pitch: 0, roll: 0.9, gust: false }, 5, [{ x: 0, z: -10, r: 40, lift: 7 }]);
    expect(g.y).toBeGreaterThan(y0);
    g.launch(0, 50, 0, 0);
    fly(g, open(), { pitch: 0, roll: 0, gust: true }, 2);
    expect(g.gust).toBeLessThan(0.5);
    const low = g.gust;
    fly(g, open(), { pitch: 0, roll: 0, gust: false }, 3);
    expect(g.gust).toBeGreaterThan(low);
  });

  it('never climbs above the ceiling or leaves the map', () => {
    const g = new Glider();
    const space = { ...open(), bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 } };
    g.launch(0, 60, 0, 0);
    for (let i = 0; i < 60 * 40 && g.flying; i++) {
      g.step(1 / 60, { pitch: -0.3, roll: 0, gust: true }, space, [{ x: 0, z: 0, r: 200, lift: 12 }]);
      expect(g.y).toBeLessThanOrEqual(CEILING + 1e-6);
      expect(Math.abs(g.x)).toBeLessThanOrEqual(50);
      expect(Math.abs(g.z)).toBeLessThanOrEqual(50);
    }
  });

  it('counts a ring only when you fly through the middle of it', () => {
    const ring = { x: 0, y: 20, z: 0, heading: 0, r: 5 };
    expect(throughRing(ring, { x: 1, y: 21, z: 2 }, { x: 1, y: 21, z: -2 })).toBe(true);
    expect(throughRing(ring, { x: 1, y: 21, z: -2 }, { x: 1, y: 21, z: 2 })).toBe(true);
    expect(throughRing(ring, { x: 7, y: 20, z: 2 }, { x: 7, y: 20, z: -2 })).toBe(false);
    expect(throughRing(ring, { x: 0, y: 20, z: 5 }, { x: 0, y: 20, z: 1 })).toBe(false);
    expect(courseInk(true, false)).toBeGreaterThan(courseInk(false, true));
    expect(courseInk(false, true)).toBeGreaterThan(courseInk(false, false));
  });

  const areas: Record<string, FreeRoamArea> = {
    harbour: new Hub(fakeEl() as unknown as HTMLElement),
    village: new Village(fakeEl() as unknown as HTMLElement),
    city: new City(fakeEl() as unknown as HTMLElement),
    hills: new Hills(fakeEl() as unknown as HTMLElement),
  };

  it('every town has a launch ring on open ground and a ring course inside the map', () => {
    for (const [id, area] of Object.entries(areas)) {
      const zone = area.zones.find((z) => z.kind === 'launch');
      expect(zone, id).toBeTruthy();
      expect(area.world.resolve({ x: zone!.x, z: zone!.z }, 0.5), id).toBeNull();
      for (const other of area.zones) if (other !== zone) expect(Math.hypot(other.x - zone!.x, other.z - zone!.z), `${id} ${other.label}`).toBeGreaterThan(other.r + zone!.r);
      const b = area.world.bounds;
      const course = makeCourse(b, zone!, id.length, id === 'city' ? 50 : 22);
      expect(course.rings).toHaveLength(10);
      for (const r of [...course.rings, ...course.thermals]) {
        expect(r.x, id).toBeGreaterThan(b.minX + 10);
        expect(r.x, id).toBeLessThan(b.maxX - 10);
        expect(r.z, id).toBeGreaterThan(b.minZ + 10);
        expect(r.z, id).toBeLessThan(b.maxZ - 10);
      }
      for (const r of course.rings) {
        expect(r.y, id).toBeGreaterThan(10);
        expect(r.y, id).toBeLessThan(CEILING - 10);
      }
    }
  });

  it('a simple autopilot can fly every town’s whole course from the launch ring', () => {
    for (const [id, area] of Object.entries(areas)) {
      const zone = area.zones.find((z) => z.kind === 'launch')!;
      const b = area.world.bounds;
      const course = makeCourse(b, zone, id.length, id === 'city' ? 50 : 22);
      const space: Airspace = { bounds: b, resolve: (p, r) => area.world.resolve(p, r), ground: () => ({ y: 0, water: false }), roof: id === 'city' ? 40 : undefined };
      const g = new Glider();
      const first = course.rings[0];
      g.launch(zone.x, id === 'city' ? 55 : 28, zone.z, Math.atan2(-(first.x - zone.x), -(first.z - zone.z)));
      const run = new CourseRun(course);
      let finished = false;
      for (let i = 0; i < 60 * 600 && g.flying && !finished; i++) {
        const ring = course.rings[run.next];
        const want = Math.atan2(-(ring.x - g.x), -(ring.z - g.z));
        const err = Math.atan2(Math.sin(want - g.heading), Math.cos(want - g.heading));
        const dist = Math.hypot(ring.x - g.x, ring.z - g.z);
        const climb = Math.atan2(ring.y - g.y, Math.max(dist, 1));
        const pitch = Math.max(-1, Math.min(1, (g.pitch - climb) * 3));
        g.step(1 / 60, { pitch, roll: Math.max(-1, Math.min(1, -err * 2)), gust: g.y < ring.y - 2 || g.speed < 12 }, space, course.thermals);
        for (const e of run.update(1 / 60, g)) if (e.kind === 'finish') finished = true;
      }
      expect(finished, `${id}: stopped at ring ${run.next}, flying ${g.flying}`).toBe(true);
    }
  });

  it('the relay accepts paper-plane states (and positions all over Tea Hills)', () => {
    expect(validateState({ chapter: 'hills', mode: 'fly', s: 1000, x: 110, h: 60, yaw: 0, v: 30 }, null, 0)).toEqual({ ok: true });
    expect(validateState({ chapter: 'hub', mode: 'fly', s: 1000, x: 10, h: 120, yaw: 0, v: 30 }, null, 0).ok).toBe(false);
    for (const id of ['paper-plane', 'ring-course', 'soft-landings', 'flown-10k']) expect(TROPHIES.some((t) => t.id === id), id).toBe(true);
  });
});
