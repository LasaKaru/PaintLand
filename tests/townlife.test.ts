import { describe, expect, it } from 'vitest';
import { TownLife, kindOf, type TownPerson } from '../src/world/TownLife';
import { personOf } from '../src/world/Peoples';
import { HumanModel, type HumanPose } from '../src/models/Human';
import { FreeWorld } from '../src/gameplay/FreeRoam';
import { Random } from '../src/core/Random';
import { Population } from '../src/gameplay/Population';
import { chapterById } from '../src/world/Chapters';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

/** A small square town with everyone in it, run for a while. */
function simulate(seconds: number, greetings: HumanPose[] = ['wave']): { life: TownLife; seen: Map<TownPerson, Set<HumanPose>> } {
  const world = new FreeWorld({ minX: -40, maxX: 40, minZ: -40, maxZ: 40 });
  const life = new TownLife((r) => ({ x: r.range(-35, 35), z: r.range(-35, 35) }), new Random(5), { greetings });
  const r = new Random(9);
  for (let i = 0; i < 36; i++) {
    const look = personOf('lanka', () => r.next()).look;
    life.add(new HumanModel(look), look, r.range(-30, 30), r.range(-30, 30));
  }
  // Make sure there are elders and wheelchair users to check.
  for (const aid of ['cane', 'wheelchair'] as const) {
    const look = { ...personOf('lanka', () => r.next(), { age: 'adult' }).look, aid, stoop: aid === 'cane' ? 0.2 : 0 };
    life.add(new HumanModel(look), look, 0, 0);
  }
  const seen = new Map<TownPerson, Set<HumanPose>>(life.people.map((p) => [p, new Set()]));
  const dt = 1 / 30;
  for (let i = 0; i < seconds / dt; i++) {
    life.update(dt, i * dt, { x: 500, z: 500 }, world);
    for (const p of life.people) {
      seen.get(p)!.add(p.pose);
      // Chats and greetings are always two people, each with the other.
      if (p.act === 'chat' && p.other) expect(p.other.other === p || p.other.act !== 'chat').toBe(true);
      expect(Number.isFinite(p.body.x) && Number.isFinite(p.body.z)).toBe(true);
    }
    // Only speakers get a bubble, and no more than a handful at once.
    const bubbles = life.group.children.filter((c) => c.visible);
    expect(bubbles.length).toBeLessThanOrEqual(8);
  }
  return { life, seen };
}

describe('town life', () => {
  it('tells children, elders and wheelchair users apart', () => {
    expect(kindOf({ ...personOf('lanka', () => 0.5, { age: 'child' }).look })).toBe('child');
    expect(kindOf({ ...personOf('lanka', () => 0.5, { age: 'adult', aids: false }).look, aid: 'wheelchair' })).toBe('wheels');
    expect(kindOf({ ...personOf('lanka', () => 0.5, { age: 'adult', aids: false }).look, aid: 'cane' })).toBe('elder');
  });

  it('people walk, jog, hop, chat in turns, stop to do things and greet each other', () => {
    const { life, seen } = simulate(150, ['ayubowan', 'wave']);
    const all = new Set([...seen.values()].flatMap((s) => [...s]));
    for (const pose of ['walk', 'run', 'air', 'talk', 'listen'] as HumanPose[]) expect(all.has(pose), pose).toBe(true);
    // Something else too: a phone, a stretch, pointing, sitting, cheering, a greeting…
    const other = ['phone', 'stretch', 'point', 'sitdown', 'cheer', 'ayubowan', 'wave', 'laugh', 'dance', 'clap'].filter((p) => all.has(p as HumanPose));
    expect(other.length).toBeGreaterThanOrEqual(4);
    // Chats: both people talk at some point.
    const talkers = life.people.filter((p) => seen.get(p)!.has('talk'));
    expect(talkers.length).toBeGreaterThanOrEqual(4);
  });

  it('elders and wheelchair users never run or jump, and wheelchair users never sit on the ground', () => {
    const { life, seen } = simulate(90);
    const careful = life.people.filter((p) => p.kind === 'elder' || p.kind === 'wheels');
    expect(careful.length).toBeGreaterThan(0);
    for (const p of careful) {
      expect(seen.get(p)!.has('run')).toBe(false);
      expect(seen.get(p)!.has('air')).toBe(false);
      expect(p.body.y).toBe(0);
    }
    for (const p of life.people.filter((q) => q.kind === 'wheels')) {
      expect(seen.get(p)!.has('sitdown')).toBe(false);
      expect(seen.get(p)!.has('stretch')).toBe(false);
    }
  });

  it('everyone turns to greet the player who walks up', () => {
    const world = new FreeWorld({ minX: -40, maxX: 40, minZ: -40, maxZ: 40 });
    const life = new TownLife(() => ({ x: 30, z: 30 }), new Random(1), { greetings: ['bow'] });
    const look = personOf('japan', () => 0.3, { age: 'adult', aids: false }).look;
    const p = life.add(new HumanModel(look), look, 0, 0);
    for (let i = 0; i < 30; i++) life.update(1 / 30, i / 30, { x: 2, z: 0 }, world);
    expect(p.pose).toBe('bow');
    // Facing the player (who stands to the +x side): forward is (−sin h, −cos h).
    expect(-Math.sin(p.body.heading)).toBeGreaterThan(0.9);
  });

  it('far-away people are hidden and left alone on big maps', () => {
    const world = new FreeWorld({ minX: -400, maxX: 400, minZ: -400, maxZ: 400 });
    const life = new TownLife((r) => ({ x: r.range(-300, 300), z: r.range(-300, 300) }), new Random(3), { cull: 50 });
    const look = personOf('lanka', () => 0.4, { age: 'adult', aids: false }).look;
    const far = life.add(new HumanModel(look), look, 300, 300);
    life.update(1 / 30, 0, { x: 0, z: 0 }, world);
    expect(far.model.root.visible).toBe(false);
    expect(far.body.x).toBe(300);
  });
});

describe('people along the routes', () => {
  it('some jog, friends and families stop to chat, and children hop', () => {
    const c = chapterById('serendib');
    const pop = new Population(c.buildRoute(), c.id, c.districts.map((d) => d.id));
    expect(pop.walkers.some((w) => w.jogger)).toBe(true);
    const seen = new Set<HumanPose>();
    const dt = 1 / 20;
    // Follow the crowd around the whole route (a few seconds at each stop).
    for (const focus of pop.walkers.filter((w) => !w.lead).map((w) => w.s)) {
      for (let i = 0; i < 60; i++) {
        pop.update(dt, i * dt, focus, 200, 1);
        for (const w of pop.walkers) if (w.model) seen.add(w.pose);
      }
      if (['run', 'talk', 'listen', 'air'].every((p) => seen.has(p as HumanPose))) break;
    }
    for (const pose of ['walk', 'run', 'talk', 'listen', 'air'] as HumanPose[]) expect(seen.has(pose), pose).toBe(true);
    // Elders and wheelchair users are never the ones running.
    for (const w of pop.walkers) if (w.kind === 'elder' || w.kind === 'wheels') expect(w.jogger).toBe(false);
  });
});
