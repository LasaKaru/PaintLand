import { describe, expect, it } from 'vitest';
import { Hills } from '../src/world/Hills';
import { Hub } from '../src/world/Hub';
import { Village } from '../src/world/Village';
import { City } from '../src/world/City';
import { CHAINS, CITY_MISSIONS, missionArea } from '../src/gameplay/CityMissions';
import type { FreeRoamArea } from '../src/world/FreeRoamArea';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

describe('Tea Hills and the free-roam mission chains', () => {
  const areas: Record<string, FreeRoamArea> = {
    hills: new Hills(fakeEl() as unknown as HTMLElement),
    harbour: new Hub(fakeEl() as unknown as HTMLElement),
    village: new Village(fakeEl() as unknown as HTMLElement),
    city: new City(fakeEl() as unknown as HTMLElement),
  };

  it('is a full town: services, a chapter gate, the road home, secrets and places', () => {
    const h = areas.hills;
    const kinds = h.zones.map((z) => z.kind);
    for (const k of ['garage', 'wardrobe', 'shop', 'missions', 'portal', 'area']) expect(kinds, k).toContain(k);
    expect(h.zones.find((z) => z.kind === 'portal')?.chapter).toBe('islandtrip');
    expect(h.secrets.length).toBe(3);
    expect(h.places.length).toBeGreaterThanOrEqual(5);
    // Harbour Town has a road to it.
    expect(areas.harbour.zones.some((z) => z.kind === 'area' && z.area === 'hills')).toBe(true);
    // The spawn point, zones and secrets are on open ground.
    for (const p of [h.spawn, ...h.zones, ...h.secrets]) expect(h.world.resolve({ x: p.x, z: p.z }, 0.5), `${p.x},${p.z}`).toBeNull();
  });

  it('every chain has three missions in its own town, and every target can be reached', () => {
    for (const c of CHAINS) expect(CITY_MISSIONS.filter((m) => m.chain === c.id), c.id).toHaveLength(3);
    expect(CITY_MISSIONS.length).toBe(24);
    for (const m of CITY_MISSIONS) {
      const area = areas[missionArea(m)];
      const b = (area.world as unknown as { bounds: { minX: number; maxX: number; minZ: number; maxZ: number } }).bounds;
      for (const s of m.steps) {
        if (s.stunt) expect(area.stunts.map((x) => x.id), `${m.id} stunt`).toContain(s.stunt);
        for (const tg of s.targets) {
          expect(tg.x >= b.minX && tg.x <= b.maxX && tg.z >= b.minZ && tg.z <= b.maxZ, `${m.id} ${tg.x},${tg.z} in bounds`).toBe(true);
          if (s.kind === 'photo' || s.kind === 'stunt') continue;
          // A car or walker can stand somewhere inside the target circle.
          const p = { x: tg.x, z: tg.z };
          area.world.resolve(p, 0.6);
          expect(Math.hypot(p.x - tg.x, p.z - tg.z), `${m.id} target ${tg.x},${tg.z}`).toBeLessThan(tg.r);
        }
      }
    }
  });
});
