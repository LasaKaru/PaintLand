import { describe, expect, it } from 'vitest';
import { REGIONS, personOf, regionFor, type RegionId } from '../src/world/Peoples';
import { FAITH_HATS, FAITH_TOPS, HumanModel } from '../src/models/Human';
import { CATALOGUE } from '../src/gameplay/Profile';
import { CHAPTERS, chapterById } from '../src/world/Chapters';
import { Population } from '../src/gameplay/Population';
import { Decorator } from '../src/world/Decorator';
import { City } from '../src/world/City';
import { Hills } from '../src/world/Hills';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe('the people of each place', () => {
  it.each(Object.keys(REGIONS) as RegionId[])('%s: a real mix of people — skin tones, ages, builds, wheelchair users', (id) => {
    const r = seeded(id.length * 97 + 11);
    const people = Array.from({ length: 600 }, () => personOf(id, r));
    expect(new Set(people.map((p) => p.look.skin)).size, 'skin tones').toBeGreaterThanOrEqual(5);
    expect(people.filter((p) => p.age === 'child').length).toBeGreaterThan(20);
    expect(people.filter((p) => p.age === 'elder').length).toBeGreaterThan(15);
    expect(people.some((p) => p.look.aid === 'cane')).toBe(true);
    expect(people.some((p) => p.look.aid === 'wheelchair')).toBe(true);
    const builds = people.map((p) => p.look.build ?? 1);
    expect(Math.max(...builds) - Math.min(...builds)).toBeGreaterThan(0.2);
    // Children never wear faith dress chosen for them here, and never use the adults' aids.
    for (const p of people.filter((q) => q.age === 'child')) {
      expect(p.faith).toBeNull();
      expect(p.look.aid ?? 'none').not.toBe('wheelchair');
    }
  });

  it('faith dress is part of everyday life, in believable shares — never the whole crowd', () => {
    for (const id of Object.keys(REGIONS) as RegionId[]) {
      const r = seeded(7 + id.length);
      const people = Array.from({ length: 2000 }, () => personOf(id, r));
      const share = people.filter((p) => p.faith).length / people.length;
      expect(share, id).toBeGreaterThan(0);
      expect(share, id).toBeLessThan(0.5);
      for (const p of people.filter((q) => q.faith === 'monk')) {
        expect(p.look.topStyle).toBe('robe');
        expect(p.look.hairStyle).toBe('bald');
      }
      for (const p of people.filter((q) => q.faith === 'hijab')) expect(p.look.hat).toBe('hijab');
    }
  });

  it('faith dress is never for sale, loot or a costume', () => {
    for (const item of CATALOGUE) {
      if (item.category === 'hat') expect(FAITH_HATS, item.id).not.toContain(item.value);
      if (item.category === 'top') expect(FAITH_TOPS, item.id).not.toContain(item.value);
    }
  });

  it('every district of every chapter has its people (only the Sketch is a mix of everywhere)', () => {
    for (const c of CHAPTERS)
      for (const d of c.districts) {
        const region = regionFor(c.id, d.id);
        if (c.id === 'sketch') expect(region).toBe('mixed');
        else expect(region, `${c.id}/${d.id}`).not.toBe('mixed');
      }
    expect(regionFor('city')).toBe('lanka');
    expect(regionFor('village')).toBe('japan');
  });

  it('every kind of person can be built', () => {
    for (const id of Object.keys(REGIONS) as RegionId[]) {
      const r = seeded(3 + id.length);
      for (let i = 0; i < 40; i++) {
        const m = new HumanModel(personOf(id, r).look);
        m.animate(1 / 60, i % 2 ? 'walk' : 'idle', 1, i);
        expect(m.root.children.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('crowds along the routes', () => {
  it('fill every district, stay within a budget, and are built only when you come near', () => {
    for (const id of ['serendib', 'india', 'britain', 'citylights']) {
      const c = chapterById(id);
      const path = c.buildRoute();
      const pop = new Population(path, c.id, c.districts.map((d) => d.id));
      const walkers = pop.walkers;
      expect(walkers.length, id).toBeGreaterThanOrEqual(c.districts.length * 3);
      expect(walkers.length, id).toBeLessThanOrEqual(Population.MAX_WALKERS);
      for (let i = 0; i < c.districts.length; i++) {
        const sp = path.spanOf(i)!;
        expect(walkers.some((w) => w.s >= sp.start && w.s <= sp.end), `${id} district ${i}`).toBe(true);
      }
      expect(walkers.every((w) => w.model === null)).toBe(true);
      pop.update(1 / 60, 0, walkers[0].s, 0, 1);
      const built = walkers.filter((w) => w.model).length;
      expect(built).toBeGreaterThan(0);
      expect(built).toBeLessThan(walkers.length);
      // Companions walk beside the one they came with.
      const pair = walkers.find((w) => w.lead && w.model);
      if (pair) expect(Math.abs(pair.s - pair.lead!.s)).toBeLessThan(1);
    }
  });
});

describe('places of worship', () => {
  it('Serendib City has a mosque, a kovil, a church and a temple, clear of everything to find', () => {
    const city = new City(fakeEl() as unknown as HTMLElement);
    for (const k of ['mosque', 'kovil', 'church', 'temple']) expect(city.places.map((p) => p.id)).toContain(`faith-${k}`);
    // Nothing to find, and no ring, is inside the blocks now given to them.
    const blocks = city.places.filter((q) => q.id.startsWith('faith-')).map((q) => ({ x: q.x, z: q.z - 40 }));
    for (const p of [...city.secrets, ...city.chests, ...city.zones, ...city.pockets, city.spawn, ...city.places.filter((q) => !q.id.startsWith('faith-'))])
      for (const b of blocks) if (Math.hypot(p.x - b.x, p.z - b.z) < 60) expect(city.world.resolve({ x: p.x, z: p.z }, 0.5), `${p.x},${p.z}`).toBeNull();
    for (const p of city.places.filter((q) => q.id.startsWith('faith-'))) expect(city.world.resolve({ x: p.x, z: p.z }, 0.5), p.id).toBeNull();
  });

  it('Tea Hills has a kovil and a stone church, and nothing to find is shut inside them', () => {
    const h = new Hills(fakeEl() as unknown as HTMLElement);
    expect(h.places.map((p) => p.id)).toEqual(expect.arrayContaining(['hills-kovil', 'hills-church']));
    for (const p of [...h.secrets, ...h.chests, ...h.zones, ...h.pockets, h.spawn, ...h.places.filter((q) => q.id === 'hills-kovil' || q.id === 'hills-church')]) expect(h.world.resolve({ x: p.x, z: p.z }, 0.5), `${p.x},${p.z}`).toBeNull();
  });

  it.each([
    ['india', 'Gurudwara Bangla Sahib'],
    ['india', 'The Jama Masjid'],
    ['germany', 'The New Synagogue'],
    ['korea', 'Myeongdong Cathedral'],
  ])('%s: %s stands beside the road', (chapter, name) => {
    const c = chapterById(chapter);
    const d = new Decorator(c.buildRoute(), c);
    d.build();
    expect(d.landmarks.map((l) => l.name)).toContain(name);
  });
});
