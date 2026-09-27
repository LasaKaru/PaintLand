import { describe, expect, it } from 'vitest';
import { WorldsEnd, EDGE_Z } from '../src/world/WorldsEnd';
import { Hub } from '../src/world/Hub';
import { Hills } from '../src/world/Hills';
import { Village } from '../src/world/Village';
import { validateState } from '../server/validate.mjs';
import en from '../src/core/locales/en';
import type { FreeRoamArea } from '../src/world/FreeRoamArea';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

describe("World's End and the viewpoints", () => {
  const we = new WorldsEnd(fakeEl() as unknown as HTMLElement);
  const areas: FreeRoamArea[] = [we, new Hub(fakeEl() as unknown as HTMLElement), new Hills(fakeEl() as unknown as HTMLElement), new Village(fakeEl() as unknown as HTMLElement)];

  it('is a calm place: the road home, a paper plane, four viewpoints, secrets and places, no shops', () => {
    const kinds = we.zones.map((z) => z.kind);
    expect(kinds.filter((k) => k === 'viewpoint')).toHaveLength(4);
    expect(kinds).toContain('launch');
    expect(we.zones.find((z) => z.kind === 'area')?.area).toBe('harbour');
    for (const k of ['garage', 'shop', 'missions', 'portal']) expect(kinds).not.toContain(k);
    expect(we.secrets.length).toBe(3);
    expect(we.places.length).toBeGreaterThanOrEqual(5);
    expect(we.dynamicBodies()).toEqual([]);
    // Harbour Town has the road there.
    expect(areas[1].zones.some((z) => z.kind === 'area' && z.area === 'worldsend')).toBe(true);
  });

  it('everything you walk to is on open ground and on the island', () => {
    for (const area of areas) {
      // (Older towns hide some secrets out at sea, reached by boat: check their rings only.)
      for (const p of area === we ? [area.spawn, ...area.zones, ...area.secrets, ...area.chests] : [area.spawn, ...area.zones]) {
        expect(area.world.resolve({ x: p.x, z: p.z }, 0.5), `${area.id} ${p.x},${p.z}`).toBeNull();
      }
    }
    for (const p of [...we.zones, ...we.secrets, ...we.chests]) expect(p.z).toBeLessThan(EDGE_Z);
  });

  it('seven viewpoints, each with a unique id, a name in English, a mood and a sensible view', () => {
    const views = areas.flatMap((a) => a.zones.filter((z) => z.kind === 'viewpoint').map((z) => z.view!));
    expect(views).toHaveLength(7);
    expect(new Set(views.map((v) => v.id)).size).toBe(7);
    for (const v of views) {
      expect((en as Record<string, string>)[`view.${v.id}`], v.id).toBeTruthy();
      expect(['calm', 'dream', 'moonlight', 'golden', 'cinema', 'vintage', 'vivid', 'ink', 'none']).toContain(v.lut);
      expect(Math.abs(v.pitch)).toBeLessThan(0.8);
    }
  });

  it('the relay accepts players all over the island', () => {
    expect(validateState({ chapter: 'worldsend', mode: 'foot', s: 1090, x: -108, h: 0, yaw: 0, v: 1 }, null, 0)).toEqual({ ok: true });
  });
});
