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

describe('Livery painter', async () => {
  const L = await import('../src/gameplay/Livery');
  it('round-trips pictures through short share codes', () => {
    const px = L.presetLivery('number', 7);
    const code = L.encodeLivery(px);
    expect(code.startsWith('L1.')).toBe(true);
    expect(code.length).toBeLessThan(200);
    expect(L.decodeLivery(code)).toEqual(px);
    expect(L.encodeLivery(L.emptyLivery())).toBe('');
    // A worst-case picture (no two neighbours alike) still fits the limit.
    const noisy = L.emptyLivery().map((_, i) => (i * 7 + (i >> 5)) % 16);
    const big = L.encodeLivery(noisy);
    expect(big.length).toBeLessThanOrEqual(L.LIVERY_MAX_CODE);
    expect(L.decodeLivery(big)).toEqual(noisy);
  });

  it('rejects bad or hostile codes', () => {
    for (const bad of [null, 42, '', 'L2.AAAA', 'L1.!!!!', 'L1.A', 'L1.' + 'A'.repeat(800), 'L1.8A', { toString: () => 'L1.' }]) expect(L.decodeLivery(bad)).toBeNull();
    // Too short (does not fill the picture) and too long (overflows it).
    expect(L.decodeLivery(L.encodeLivery(L.presetLivery('racer')).slice(0, 12))).toBeNull();
    expect(L.decodeLivery(L.encodeLivery(L.presetLivery('racer')) + 'AAAA')).toBeNull();
  });

  it('fills, stamps and keeps colours in the paint box', () => {
    const px = L.emptyLivery();
    L.fillLivery(px, 0, 0, 5);
    expect(px.every((v) => v === 5)).toBe(true);
    L.stampLivery(px, 'heart', 16, 8);
    expect(px.some((v) => v === 3)).toBe(true);
    for (const s of L.LIVERY_STAMPS) {
      const q = L.emptyLivery();
      L.stampLivery(q, s, 16, 8);
      expect(L.isEmptyLivery(q), s).toBe(false);
      expect(Math.max(...q)).toBeLessThan(L.LIVERY_PALETTE.length);
    }
  });
});

describe('More character customisation', async () => {
  const { CATALOGUE } = await import('../src/gameplay/Profile');
  const { HumanModel } = await import('../src/models/Human');
  it('offers eyes, mouths, face details and accessories, some free and some to find', () => {
    for (const cat of ['eyes', 'mouth', 'facial', 'acc'] as const) {
      const items = CATALOGUE.filter((i) => i.category === cat);
      expect(items.length, cat).toBeGreaterThanOrEqual(5);
      expect(items.some((i) => i.price === 0 && !i.loot), cat).toBe(true);
    }
    expect(CATALOGUE.filter((i) => i.loot && ['eyes', 'acc', 'hat'].includes(i.category)).length).toBeGreaterThanOrEqual(4);
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
  });

  it('builds every face, detail, accessory and new hat', () => {
    const base = { skin: '#f0c7a6', hair: '#2b2622', hairStyle: 'bob', top: '#d8463a', bottom: '#3e6fa8', shoes: '#2b2622', scarf: null } as const;
    for (const i of CATALOGUE.filter((c) => ['eyes', 'mouth', 'facial', 'acc', 'hat', 'back'].includes(c.category))) {
      const field = i.category === 'facial' ? 'face' : i.category;
      expect(() => new HumanModel({ ...base, hat: 'none', [field]: i.value } as never), i.id).not.toThrow();
    }
  });
});
