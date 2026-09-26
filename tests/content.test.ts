import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };
const { Hub } = await import('../src/world/Hub');
const { Village } = await import('../src/world/Village');
const { City } = await import('../src/world/City');
const { POCKETS, POCKET_REACH, roadGap } = await import('../src/world/Pockets');
const { STATIONS, TRACK_COUNT } = await import('../src/audio/AudioEngine');
const { TROPHIES } = await import('../src/gameplay/Trophies');
const { CATALOGUE, Profile } = await import('../src/gameplay/Profile');
const { PRINTS, printKind, Pattern } = await import('../src/models/ModelKit');
const { HumanModel, DEFAULT_HUMAN_LOOK } = await import('../src/models/Human');
const { VEHICLES, VehicleModel } = await import('../src/models/Vehicles');
const { ENGINE_PROFILES, HORN_PROFILES } = await import('../src/audio/VehicleSounds');
const { englishStrings } = await import('../src/core/i18n');

const OUTFIT = ['hair', 'hat', 'top', 'bottom', 'glasses', 'back', 'eyes', 'mouth', 'facial', 'acc', 'pet', 'pack', 'print', 'bprint'];
const CAR = ['vehicle', 'roof', 'decal', 'spoiler', 'glow', 'finish', 'wheels', 'exhaust', 'engine', 'horn', 'wrap'];

describe('Hidden pockets', () => {
  const areas = [new Hub(fakeEl() as unknown as HTMLElement), new Village(fakeEl() as unknown as HTMLElement), new City(fakeEl() as unknown as HTMLElement)];

  it('there are 20, spread over the three towns, with unique ids', () => {
    expect(POCKETS.length).toBe(20);
    expect(new Set(POCKETS.map((p) => p.id)).size).toBe(20);
    for (const a of areas) expect(a.pockets.length, a.id).toBe(POCKETS.filter((p) => p.area === a.id).length);
  });

  it('each sits on open ground inside the town, off the roads, clear of every ring and away from the others', () => {
    for (const a of areas) {
      const b = a.world.bounds;
      for (const p of a.pockets) {
        expect(a.world.resolve({ x: p.x, z: p.z }, 2.5), p.def.id).toBeNull();
        expect(p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ, p.def.id).toBe(true);
        if (a.seaZ !== undefined) expect(p.z, `${p.def.id} in the sea`).toBeLessThan(a.seaZ);
        for (const r of a.mapInfo(() => 0).roads) expect(roadGap(p.x, p.z, r), `${p.def.id} on a road`).toBeGreaterThan(3);
        for (const z of a.zones) expect(Math.hypot(z.x - p.x, z.z - p.z), `${p.def.id} vs ${z.kind}`).toBeGreaterThan(z.r + POCKET_REACH);
        for (const q of a.pockets) if (q !== p) expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThan(20);
        expect(a.group.getObjectByName(`pocket-${p.def.id}`), p.def.id).toBeDefined();
      }
    }
  });
});

describe('Content counts', () => {
  it('the radio has 8 stations and 64 tracks', () => {
    expect(STATIONS.length).toBe(8);
    expect(TRACK_COUNT).toBe(64);
    expect(new Set(STATIONS.map((s) => s.style)).size).toBe(8);
    expect(new Set(STATIONS.map((s) => s.freq)).size).toBe(8);
  });

  it('there are at least 100 trophies, each with a unique id', () => {
    expect(TROPHIES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(TROPHIES.map((t) => t.id)).size).toBe(TROPHIES.length);
  });

  it('the pocket trophies count found pockets', () => {
    const p = new Profile();
    const t = TROPHIES.find((x) => x.id === 'pockets-20')!;
    expect(t).toBeDefined();
    for (const q of POCKETS) p.data.seen.push(`pocket:${q.id}`);
    expect(t.progress!(p)[0]).toBe(20);
  });

  it('outfit and garage catalogues: every item has a unique id and an English name', () => {
    const en = englishStrings() as Record<string, string>;
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
    for (const i of CATALOGUE) {
      if (i.category === 'tonic') continue;
      const key = ['print', 'bprint', 'wrap'].includes(i.category) ? `print.${i.value}` : `item.${i.id}`;
      expect(en[key], key).toBeTruthy();
    }
    const outfit = CATALOGUE.filter((i) => OUTFIT.includes(i.category)).length;
    const car = CATALOGUE.filter((i) => CAR.includes(i.category)).length;
    // Report the real numbers (the README quotes them).
    console.info(`outfit items: ${outfit}, garage items: ${car}`);
    expect(outfit).toBeGreaterThanOrEqual(130);
    expect(car).toBeGreaterThanOrEqual(95);
  });

  it('every engine and horn in the catalogue has a sound', () => {
    for (const i of CATALOGUE.filter((c) => c.category === 'engine')) expect(ENGINE_PROFILES[i.value as keyof typeof ENGINE_PROFILES], i.id).toBeDefined();
    for (const i of CATALOGUE.filter((c) => c.category === 'horn')) expect(HORN_PROFILES[i.value as keyof typeof HORN_PROFILES], i.id).toBeDefined();
  });
});

describe('Fabric prints and car wraps', () => {
  const patterns = (o: THREE.Object3D): Set<number> => {
    const s = new Set<number>();
    o.traverse((m) => {
      const a = (m as THREE.Mesh).geometry?.getAttribute('pattern');
      if (a) for (let i = 0; i < a.count; i++) s.add(a.getX(i));
    });
    return s;
  };

  it('each print maps to its own shader pattern, clothes and cars apart', () => {
    const kinds = PRINTS.map((p) => printKind(p));
    expect(new Set(kinds).size).toBe(PRINTS.length);
    expect(Math.min(...kinds)).toBeGreaterThan(Pattern.Glitter);
    expect(printKind('none')).toBe(0);
    for (const p of PRINTS) expect(printKind(p, true)).toBe(printKind(p) + 10);
  });

  it('a printed top and trousers show the print; plain clothes do not', () => {
    const plain = patterns(new HumanModel(DEFAULT_HUMAN_LOOK).root);
    expect(plain.has(printKind('stripes'))).toBe(false);
    const dressed = patterns(new HumanModel({ ...DEFAULT_HUMAN_LOOK, print: 'stripes', bottomPrint: 'tartan' }).root);
    expect(dressed.has(printKind('stripes'))).toBe(true);
    expect(dressed.has(printKind('tartan'))).toBe(true);
  });

  it('a car wrap prints the body of every vehicle', () => {
    for (const def of VEHICLES) {
      const v = new VehicleModel(def, { ...def.defaultLook, wrap: 'camo' });
      expect(patterns(v.root).has(printKind('camo', true)), def.id).toBe(true);
    }
  });

  it('every new part builds on every vehicle without errors', () => {
    const parts = CATALOGUE.filter((i) => ['roof', 'decal', 'spoiler', 'wheels', 'exhaust'].includes(i.category));
    const field: Record<string, string> = { roof: 'roofLoad', decal: 'decal', spoiler: 'spoiler', wheels: 'wheelStyle', exhaust: 'exhaust' };
    for (const def of VEHICLES) for (const p of parts) expect(() => new VehicleModel(def, { ...def.defaultLook, [field[p.category]]: p.value }), `${def.id} ${p.id}`).not.toThrow();
  }, 30_000);

  it('every outfit piece builds without errors', () => {
    const field: Record<string, string> = { hair: 'hairStyle', hat: 'hat', top: 'topStyle', bottom: 'bottomStyle', glasses: 'glasses', back: 'back', eyes: 'eyes', mouth: 'mouth', facial: 'face', acc: 'acc' };
    for (const i of CATALOGUE.filter((c) => field[c.category])) expect(() => new HumanModel({ ...DEFAULT_HUMAN_LOOK, [field[i.category]]: i.value }), i.id).not.toThrow();
  });
});
