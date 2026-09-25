import { describe, expect, it } from 'vitest';
import { validateState } from '../server/validate.mjs';
import { brandSpotsFor } from '../src/brand/BrandSpots';
import { PHOTO_SUBJECTS } from '../src/gameplay/PhotoHunt';
import { CHAPTERS } from '../src/world/Chapters';

// The areas add floating labels to the page; a tiny stand-in is enough here.
const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const { Village } = await import('../src/world/Village');
const { Hub } = await import('../src/world/Hub');

const clear = (world: { resolve(p: { x: number; z: number }, r: number): unknown }, x: number, z: number, r = 1.2): boolean => world.resolve({ x, z }, r) === null;

describe('Lantern Village (Hub 3)', () => {
  const village = new Village(fakeEl() as unknown as HTMLElement);
  const hub = new Hub(fakeEl() as unknown as HTMLElement);

  it('has a gate to Lantern Roads and a road back to Harbour Town', () => {
    expect(CHAPTERS.map((c) => c.id)).toContain('lanterns');
    const portal = village.zones.find((z) => z.kind === 'portal');
    expect(portal?.chapter).toBe('lanterns');
    expect(village.zones.find((z) => z.kind === 'area')?.area).toBe('harbour');
    expect(hub.zones.find((z) => z.area === 'village')).toBeTruthy();
    for (const k of ['garage', 'wardrobe', 'shop', 'missions']) expect(village.zones.some((z) => z.kind === k)).toBe(true);
  });

  it('keeps the spawn, zone centres and pickups free of walls', () => {
    expect(clear(village.world, village.spawn.x, village.spawn.z)).toBe(true);
    for (const z of village.zones) expect(clear(village.world, z.x, z.z), z.label).toBe(true);
    for (const s of village.secrets) expect(clear(village.world, s.x, s.z, 0.6), s.id).toBe(true);
    for (const c of village.chests) expect(clear(village.world, c.x, c.z, 0.8), c.id).toBe(true);
    const zb = hub.zones.find((z) => z.area === 'village')!;
    expect(clear(hub.world, zb.x, zb.z)).toBe(true);
  });

  it('has a stunt jump, brand boards and photo subjects', () => {
    expect(village.stunts.length).toBeGreaterThan(0);
    const spots = brandSpotsFor('village');
    expect(spots.length).toBeGreaterThanOrEqual(4);
    for (const s of spots) expect(clear(village.world, s.x, s.z, 0.4), `${s.x},${s.z}`).toBe(true);
    expect(PHOTO_SUBJECTS.filter((p) => p.area === 'village').length).toBeGreaterThanOrEqual(2);
  });

  it('the server accepts village positions inside its bounds only', () => {
    const state = (x: number, z: number, v = 10) => ({ chapter: 'village', mode: 'drive', s: z + 1000, x, h: 0, yaw: 0, v });
    expect(validateState(state(100, -100), null, 0).ok).toBe(true);
    expect(validateState(state(200, 0), null, 0).ok).toBe(false);
  });
});
