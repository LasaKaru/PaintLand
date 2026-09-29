import { describe, expect, it } from 'vitest';
import { Hub } from '../src/world/Hub';
import { Village } from '../src/world/Village';
import { City } from '../src/world/City';
import { Hills } from '../src/world/Hills';
import { WorldsEnd } from '../src/world/WorldsEnd';
import type { FreeRoamArea } from '../src/world/FreeRoamArea';
import { FISHING_SPOTS, floatAt } from '../src/gameplay/Fishing';
import { DJ_STAGES, danceFloor, djPlace, restPlace, REST_KINDS } from '../src/world/Leisure';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const areas: Record<string, FreeRoamArea> = {
  harbour: new Hub(fakeEl() as unknown as HTMLElement),
  village: new Village(fakeEl() as unknown as HTMLElement),
  city: new City(fakeEl() as unknown as HTMLElement),
  hills: new Hills(fakeEl() as unknown as HTMLElement),
  worldsend: new WorldsEnd(fakeEl() as unknown as HTMLElement),
};

/** Still water that is not the sea: centre and radius of the water itself. */
const PONDS: Record<string, { x: number; z: number; r: number }> = {
  'vl-koi': { x: 80, z: -80, r: 7.5 },
  'ct-lake': { x: 500, z: -300, r: 68 },
  'we-lake': { x: -50, z: -24, r: 23 },
};

/** Where each town's ground ends toward the sea (its ground box). */
const GROUND_EDGE: Record<string, number> = { harbour: 76, village: 76, hills: 76, city: 554 };

describe('leisure places in the towns', () => {
  it('every fishing spot is on open ground at the water’s edge, and the float lands in water', () => {
    for (const s of FISHING_SPOTS) {
      const a = areas[s.area];
      expect(a.world.resolve({ x: s.x, z: s.z }, 0.45), `${s.id} free`).toBeNull();
      const f = floatAt(s);
      const pond = PONDS[s.id];
      if (pond) expect(Math.hypot(f.x - pond.x, f.z - pond.z), `${s.id} float in the pond`).toBeLessThan(pond.r);
      else {
        expect(a.seaZ, `${s.id} has a sea`).toBeDefined();
        expect(s.z, `${s.id} on land`).toBeLessThan(a.seaZ!);
        // Past where the ground itself ends (the grass runs a little beyond the quay wall).
        expect(f.z, `${s.id} float at sea`).toBeGreaterThan(GROUND_EDGE[s.area] + 2);
      }
    }
  });

  it('adds a ring for every spot, and no ring overlaps another', () => {
    for (const [id, a] of Object.entries(areas)) {
      const leisure = a.zones.filter((z) => z.kind === 'fishing' || z.kind === 'rest' || z.kind === 'dj');
      expect(leisure.filter((z) => z.kind === 'fishing').length, id).toBe(FISHING_SPOTS.filter((s) => s.area === id).length);
      for (const z of leisure)
        for (const o of a.zones) {
          if (o === z) continue;
          expect(Math.hypot(z.x - o.x, z.z - o.z), `${id}: ${z.kind}:${z.spot} vs ${o.kind}:${o.spot ?? o.label}`).toBeGreaterThanOrEqual(z.r + o.r - 0.05);
        }
    }
  });

  it('home activities are inside the house, reachable from its open front', () => {
    const hub = areas.harbour;
    expect(hub.zones.filter((z) => z.kind === 'rest').map((z) => z.spot).sort()).toEqual([...REST_KINDS].sort());
    for (const k of REST_KINDS) {
      const p = restPlace(k);
      expect(hub.world.resolve({ x: p.ring.x, z: p.ring.z }, 0.4), k).toBeNull();
    }
  });

  it('DJ stages have room: the DJ spot and the dance floor are open ground', () => {
    for (const d of DJ_STAGES) {
      const a = areas[d.area];
      const dj = djPlace(d.id)!;
      const floor = danceFloor(d.id)!;
      expect(a.world.resolve({ x: dj.x, z: dj.z }, 0.4), `${d.id} DJ`).toBeNull();
      for (const [dx, dz] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) expect(a.world.resolve({ x: floor.x + dx, z: floor.z + dz }, 0.5), `${d.id} floor ${dx},${dz}`).toBeNull();
      const ring = a.zones.find((z) => z.kind === 'dj' && z.spot === d.id)!;
      expect(a.world.resolve({ x: ring.x, z: ring.z }, 0.4), `${d.id} ring`).toBeNull();
    }
  });
});
