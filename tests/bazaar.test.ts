import { describe, expect, it } from 'vitest';
import { addSketch, eat, fedBonus, fedMinutes, FED_RULES, lookKey, nextSouvenir, paintPortrait, SKETCHBOOK_PAGES, SOUVENIRS, type Paint2D, type Sketch } from '../src/gameplay/Bazaar';
import { personOf } from '../src/world/Peoples';
import { FAITH_HATS } from '../src/models/Human';
import { buildStall } from '../src/world/StreetFun';
import { HomePlot } from '../src/world/HomePlot';
import { Random } from '../src/core/Random';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {}, getContext: () => null });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

describe('street food', () => {
  it('a snack leaves you well fed for a while: +5% ink, not stacking up', () => {
    const now = 1_000_000;
    const until = eat(now);
    expect(fedMinutes(until, now)).toBe(FED_RULES.minutes);
    expect(fedBonus(until, now)).toBeCloseTo(1.05);
    expect(fedBonus(until, until + 1)).toBe(1);
    expect(eat(now + 60000)).toBe(until + 60000);
  });

  it('every stall builds', () => {
    for (const k of ['kottu', 'vadai', 'hoppers', 'takoyaki', 'chai', 'icecream', 'souvenir'] as const) expect(buildStall(k, '#e0432f').attributes.position.count).toBeGreaterThan(50);
  });

  it('towns have stalls standing somewhere clear, with a ring in front', async () => {
    const mods = { harbour: (await import('../src/world/Hub')).Hub, city: (await import('../src/world/City')).City, hills: (await import('../src/world/Hills')).Hills, village: (await import('../src/world/Village')).Village };
    const kinds: string[] = [];
    for (const [id, A] of Object.entries(mods)) {
      const a = new A(fakeEl() as unknown as HTMLElement);
      expect(a.stalls.length, id).toBeGreaterThan(0);
      for (const s of a.stalls) {
        kinds.push(s.kind);
        expect(a.zones).toContain(s.zone);
        expect(a.world.resolve({ x: s.zone.x, z: s.zone.z }, 0.35), `${id} ${s.kind} ring`).toBeNull();
      }
    }
    for (const k of ['kottu', 'vadai', 'hoppers', 'takoyaki', 'chai', 'icecream', 'souvenir']) expect(kinds).toContain(k);
  }, 30000);
});

describe('souvenirs', () => {
  it('one per country, offered once you have been there, never twice', () => {
    expect(new Set(SOUVENIRS.map((s) => s.id)).size).toBe(SOUVENIRS.length);
    expect(nextSouvenir([], [])).toBeNull();
    expect(nextSouvenir([], ['chapter:japan'])?.id).toBe('kokeshi');
    expect(nextSouvenir(['kokeshi'], ['chapter:japan'])).toBeNull();
    expect(nextSouvenir([], ['chapter:islandtrip'])?.id).toBe('mask');
    for (const s of SOUVENIRS) expect(s.price).toBeGreaterThan(0);
  });

  it('stand on the shelf at home', () => {
    const home = new HomePlot();
    home.setSouvenirs(SOUVENIRS.map((s) => s.id));
    const shelf = home.group.children.find((c) => (c as { geometry?: { attributes: { position: { count: number } } } }).geometry && c !== home.group.children[0]);
    expect(shelf).toBeTruthy();
    home.setSouvenirs([]);
  });
});

describe('the sketchbook', () => {
  const r = new Random(4);
  const sketch = (region: 'lanka' | 'mena' = 'lanka'): Sketch => ({ look: personOf(region, () => r.next()).look, region, area: 'city', at: Date.now() });

  it('keeps each person once, newest first, up to 48 pages', () => {
    const book: Sketch[] = [];
    const a = sketch();
    expect(addSketch(book, a)).toBe(true);
    expect(addSketch(book, { ...a, look: { ...a.look } })).toBe(false);
    for (let i = 0; i < 70; i++) addSketch(book, sketch());
    expect(book.length).toBe(SKETCHBOOK_PAGES);
    expect(new Set(book.map((b) => lookKey(b.look))).size).toBe(book.length);
  });

  it('paints a portrait of anyone (headscarves, turbans and caps included)', () => {
    let calls = 0;
    const colours = new Set<string>();
    const g: Paint2D = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      beginPath: () => void calls++,
      ellipse: (...a: number[]) => a.forEach((v) => expect(Number.isFinite(v)).toBe(true)),
      rect: (...a: number[]) => a.forEach((v) => expect(Number.isFinite(v)).toBe(true)),
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      closePath: () => {},
      fill() {
        colours.add(String(this.fillStyle));
      },
      stroke: () => {},
    };
    for (const hat of [...FAITH_HATS, 'none', 'straw', 'cap']) {
      const look = { ...personOf('mena', () => r.next(), { age: 'adult' }).look, hat: hat as never };
      paintPortrait(g, look, 120, 150, 3);
      expect(colours.has(look.skin)).toBe(true);
      expect(colours.has(look.top)).toBe(true);
    }
    expect(calls).toBeGreaterThan(20);
  });
});
