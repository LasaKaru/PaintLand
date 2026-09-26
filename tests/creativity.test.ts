import { describe, expect, it } from 'vitest';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };
const { Hub } = await import('../src/world/Hub');
const { Village } = await import('../src/world/Village');
const { City } = await import('../src/world/City');
const { MURAL_SPOTS, ALL_MURALS } = await import('../src/world/Murals');
const { stickerPages, pageDone } = await import('../src/gameplay/Stickers');
const { Profile } = await import('../src/gameplay/Profile');

describe('Mural walls', () => {
  const areas = [new Hub(fakeEl() as unknown as HTMLElement), new Village(fakeEl() as unknown as HTMLElement), new City(fakeEl() as unknown as HTMLElement)];

  it('every area has its boards, each with a reachable ring that isn’t inside anything', () => {
    for (const area of areas) {
      const spots = MURAL_SPOTS[area.id];
      expect(spots?.length, area.id).toBeGreaterThan(0);
      expect(area.murals.map((m) => m.id)).toEqual(spots.map((s) => s.id));
      for (const s of spots) {
        const zone = area.zones.find((z) => z.kind === 'mural' && z.mural === s.id);
        expect(zone, s.id).toBeDefined();
        // A walker standing in the ring isn't pushed out by any collider.
        const p = { x: zone!.x, z: zone!.z };
        expect(area.world.resolve(p, 0.4), s.id).toBeNull();
        // Rings don't overlap other rings (so E always opens the right thing).
        for (const other of area.zones) if (other !== zone) expect(Math.hypot(other.x - zone!.x, other.z - zone!.z), `${s.id} vs ${other.kind}`).toBeGreaterThan(other.r + zone!.r);
      }
    }
  });

  it('boards are solid', () => {
    const hub = areas[0];
    const s = MURAL_SPOTS.harbour[0];
    expect(hub.world.resolve({ x: s.x, z: s.z }, 0.4)).not.toBeNull();
  });

  it('mural ids are unique', () => {
    expect(new Set(ALL_MURALS).size).toBe(ALL_MURALS.length);
  });

  it('sticker pages fill in from progress and pay out once a page is full', () => {
    const p = new Profile();
    const hub = areas[0];
    const list = [{ id: hub.id, name: 'Harbour Town', places: hub.places, secrets: hub.secrets }];
    let pages = stickerPages(p.data, list, {}, { secret: 'Secret', mural: 'Mural' });
    const harbour = pages.find((x) => x.id === 'harbour')!;
    expect(harbour.locked).toBe(false);
    expect(harbour.stickers.length).toBe(hub.places.length + hub.secrets.length + MURAL_SPOTS.harbour.length);
    expect(pages.find((x) => x.id === 'city')!.locked).toBe(true);
    expect(pageDone(harbour)).toBe(false);
    for (const pl of hub.places) p.data.seen.push(`place:harbour:${pl.id}`);
    for (const s of hub.secrets) p.data.seen.push(`secret:${s.id}`);
    p.data.murals = Object.fromEntries(MURAL_SPOTS.harbour.map((m) => [m.id, 'L1.x']));
    pages = stickerPages(p.data, list, {}, { secret: 'Secret', mural: 'Mural' });
    expect(pageDone(pages.find((x) => x.id === 'harbour')!)).toBe(true);
    // The garage page counts vehicles you own.
    expect(pages.find((x) => x.id === 'garage')!.stickers.filter((s) => s.got).length).toBe(1);
  });
});

describe('Festival decorations', async () => {
  const { buildFestivalDecor } = await import('../src/world/FestivalDecor');
  it('stand on open ground in every area, for every festival', () => {
    const areas = [new Hub(fakeEl() as unknown as HTMLElement), new Village(fakeEl() as unknown as HTMLElement), new City(fakeEl() as unknown as HTMLElement)];
    for (const area of areas)
      for (const f of ['vesak', 'avurudu', 'diwali'] as const) {
        const g = buildFestivalDecor(f, area);
        expect(g.children.length, `${area.id} ${f}`).toBeGreaterThan(8);
        for (const m of g.children) expect(area.world.resolve({ x: m.position.x, z: m.position.z }, 0.8), `${area.id} ${f}`).toBeNull();
      }
  });
});
