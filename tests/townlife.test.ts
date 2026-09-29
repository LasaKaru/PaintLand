import { describe, expect, it } from 'vitest';
import { TownLife, kindOf, presence, type TownPerson } from '../src/world/TownLife';
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
    const bubbles = life.group.children.filter((c) => c.visible && c.name === 'speech-bubble');
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

describe('a day in town', () => {
  const world = new FreeWorld({ minX: -60, maxX: 60, minZ: -60, maxZ: 60 });
  const town = (n = 40, seed = 2): TownLife => {
    const life = new TownLife((r) => ({ x: r.range(-40, 40), z: r.range(-40, 40) }), new Random(seed), { greetings: ['wave'] });
    const r = new Random(seed + 10);
    for (let i = 0; i < n; i++) {
      const look = personOf('lanka', () => r.next()).look;
      life.add(new HumanModel(look), look, r.range(-40, 40), r.range(-40, 40));
    }
    return life;
  };
  const run = (life: TownLife, seconds: number, player = { x: 500, z: 500 }): void => {
    for (let i = 0; i < seconds * 20; i++) life.update(1 / 20, i / 20, player, world);
  };

  it('most people go home at night, children first, and come back out in the morning', () => {
    expect(presence(12, 'adult')).toBe(1);
    expect(presence(2, 'child')).toBe(0);
    expect(presence(2, 'adult')).toBeLessThan(0.5);
    const life = town();
    life.env = { ...life.env, hour: 2 };
    run(life, 120);
    const away = life.people.filter((p) => p.act === 'away' || p.act === 'home');
    expect(away.length).toBeGreaterThan(life.people.length / 2);
    for (const p of life.people.filter((q) => q.kind === 'child')) expect(['away', 'home']).toContain(p.act);
    expect(life.people.filter((p) => p.act === 'away').every((p) => !p.model.root.visible)).toBe(true);
    // Morning: the grown-ups are back out (most children are in class until two)…
    life.env = { ...life.env, hour: 9 };
    run(life, 60);
    expect(life.people.filter((p) => p.act === 'away' && p.kind !== 'child').length).toBe(0);
    // …and after school everyone is.
    life.env = { ...life.env, hour: 15 };
    run(life, 60);
    expect(life.people.filter((p) => p.act === 'away').length).toBe(0);
  });

  it('after dark some carry paper lanterns; in the rain, umbrellas (never with a stick or a wheelchair)', () => {
    const life = town();
    life.env = { ...life.env, hour: 20 };
    run(life, 2);
    expect(life.people.some((p) => p.model.carry === 'lantern')).toBe(true);
    life.env = { ...life.env, hour: 12, rain: 0.8 };
    run(life, 30);
    const brollies = life.people.filter((p) => p.model.carry === 'umbrella');
    expect(brollies.length).toBeGreaterThan(5);
    for (const p of brollies) expect(p.model.look.aid ?? 'none').toBe('none');
    // Nobody sits on the wet grass.
    expect(life.people.some((p) => p.pose === 'sitdown')).toBe(false);
  });

  it('sun hats at a sunny midday, only for people with nothing else on their heads', () => {
    const life = town(60);
    life.env = { ...life.env, hour: 13, rain: 0 };
    run(life, 1);
    const hats = life.people.filter((p) => p.model.wearingSunHat);
    expect(hats.length).toBeGreaterThan(3);
    for (const p of hats) expect(p.model.look.hat ?? 'none').toBe('none');
    life.env = { ...life.env, hour: 18 };
    run(life, 1);
    expect(life.people.some((p) => p.model.wearingSunHat)).toBe(false);
  });

  it('people step out of the way of a fast car, and clap and cheer a big jump', () => {
    const life = new TownLife(() => ({ x: 0, z: -50 }), new Random(4));
    const look = personOf('lanka', () => 0.4, { age: 'adult', aids: false }).look;
    const p = life.add(new HumanModel(look), look, 0, 0);
    life.env = { ...life.env, car: { x: 0, z: 8, vx: 0, vz: -15 }, onFoot: false };
    for (let i = 0; i < 10; i++) life.update(1 / 20, i / 20, { x: 0, z: 8 }, world);
    expect(Math.abs(p.body.x)).toBeGreaterThan(0.4);
    life.env = { ...life.env, car: null, onFoot: true };
    for (let i = 0; i < 40; i++) life.update(1 / 20, i / 20, { x: 30, z: 30 }, world);
    expect(life.celebrate(p.body.x, p.body.z, 20)).toBe(1);
    life.update(1 / 20, 0, { x: 30, z: 30 }, world);
    expect(['clap', 'cheer']).toContain(p.pose);
  });

  it('someone may stop to take a photo of your car when you park near them', () => {
    let photos = 0;
    for (let seed = 0; seed < 8 && !photos; seed++) {
      const life = town(30, seed);
      life.env = { ...life.env, car: { x: 0, z: 0, vx: 0, vz: 0 }, onFoot: false };
      run(life, 3, { x: 0, z: 0 });
      photos += life.people.filter((p) => p.still === 'photo').length;
    }
    expect(photos).toBeGreaterThan(0);
  });

  it('people walking toward each other step aside instead of walking through', () => {
    const life = new TownLife(() => ({ x: 0, z: 0 }), new Random(6));
    const look = personOf('lanka', () => 0.4, { age: 'adult', aids: false }).look;
    const a = life.add(new HumanModel(look), look, -8, 0.05);
    const b = life.add(new HumanModel(look), look, 8, -0.05);
    a.target = { x: 12, z: 0 };
    b.target = { x: -12, z: 0 };
    a.t = b.t = 60;
    a.cool = b.cool = 60;
    let closest = 99;
    for (let i = 0; i < 200; i++) {
      life.update(1 / 30, i / 30, { x: 500, z: 500 }, world);
      closest = Math.min(closest, Math.hypot(a.body.x - b.body.x, a.body.z - b.body.z));
    }
    expect(closest).toBeGreaterThan(0.45);
  });

  it('buskers stay at their pitch playing in time, and pack up at night and in the rain', () => {
    const life = new TownLife(() => ({ x: 0, z: 0 }), new Random(7));
    const look = personOf('lanka', () => 0.4, { age: 'adult', aids: false }).look;
    const p = life.addBusker(new HumanModel(look), look, 5, 5, 0, 'drum');
    life.env = { ...life.env, hour: 15, bpm: 120 };
    run(life, 5, { x: 6, z: 6 });
    expect(p.pose).toBe('drum');
    expect(p.model.tempo).toBe(120);
    expect(Math.hypot(p.body.x - 5, p.body.z - 5)).toBeLessThan(0.31);
    life.env = { ...life.env, hour: 23 };
    run(life, 1);
    expect(p.model.root.visible).toBe(false);
  });

  it('it sounds livelier among people, and livelier still when they talk', () => {
    const life = town(40);
    run(life, 30);
    const busy = life.crowdAt(0, 0);
    expect(busy.people).toBeGreaterThan(0.3);
    expect(life.crowdAt(400, 400).people).toBe(0);
  });

  it('every town has street musicians, standing somewhere clear', async () => {
    const { Hub } = await import('../src/world/Hub');
    const { Village } = await import('../src/world/Village');
    const { Hills } = await import('../src/world/Hills');
    const { City } = await import('../src/world/City');
    for (const A of [Hub, Village, Hills, City]) {
      const area = new A(fakeEl() as unknown as HTMLElement);
      area.life.env = { ...area.life.env, hour: 12, rain: 0 };
      area.life.update(1 / 30, 0, { x: 0, z: 0 }, area.world);
      const buskers = area.life.people.filter((p) => p.act === 'busk');
      expect(buskers.length, A.name).toBeGreaterThan(0);
      for (const b of buskers) expect(area.world.resolve({ x: b.pitch!.x, z: b.pitch!.z }, 0.4), `${A.name} ${b.pitch!.x},${b.pitch!.z}`).toBeNull();
    }
  });
});

describe('crowd density and stand-ins', () => {
  const world = new FreeWorld({ minX: -300, maxX: 300, minZ: -300, maxZ: 300 });
  const make = (): TownLife => {
    const life = new TownLife((r) => ({ x: r.range(-200, 200), z: r.range(-200, 200) }), new Random(21));
    const r = new Random(22);
    for (let i = 0; i < 20; i++) {
      const look = personOf('lanka', () => r.next()).look;
      life.add(new HumanModel(look), look, r.range(-200, 200), r.range(-200, 200));
    }
    life.factory = (q) => {
      const look = personOf('lanka', () => q.next()).look;
      return { model: new HumanModel(look), look };
    };
    return life;
  };

  it('Few benches some people; Busy brings more out', () => {
    const life = make();
    life.setDensity(0.5);
    expect(life.people.filter((p) => !p.benched).length).toBe(10);
    life.update(1 / 30, 0, { x: 0, z: 0 }, world);
    expect(life.people.filter((p) => p.benched).every((p) => !p.model.root.visible)).toBe(true);
    life.setDensity(3.5);
    expect(life.people.filter((p) => !p.benched).length).toBe(70);
    life.setDensity(1);
    expect(life.people.filter((p) => !p.benched).length).toBe(20);
  });

  it('far-away people are cheap stand-ins, close ones full models', () => {
    const life = make();
    life.setDensity(3.5);
    life.update(1 / 30, 0, { x: 0, z: 0 }, world);
    const far = life.people.filter((p) => !p.benched && Math.hypot(p.body.x, p.body.z) > 60);
    const near = life.people.filter((p) => !p.benched && Math.hypot(p.body.x, p.body.z) < 50);
    expect(far.length).toBeGreaterThan(10);
    expect(life.standIns.count).toBe(far.length);
    for (const p of far) expect(p.model.root.visible).toBe(false);
    for (const p of near) expect(p.model.root.visible).toBe(true);
  });

  it('chapter roads: busier routes at Busy, and stand-ins beyond the full-model range', () => {
    const c = chapterById('serendib');
    Population.density = 3.5;
    const busy = new Population(c.buildRoute(), c.id, c.districts.map((d) => d.id));
    Population.density = 1;
    const normal = new Population(c.buildRoute(), c.id, c.districts.map((d) => d.id));
    expect(busy.walkers.length).toBeGreaterThan(normal.walkers.length * 2.5);
    const s = busy.walkers[10].s;
    busy.update(1 / 30, 0, s, 0, 1);
    const built = busy.walkers.filter((w) => w.model && w.model.root.visible);
    for (const w of built) expect(Math.abs(w.s - s)).toBeLessThanOrEqual(Population.FULL_MODEL + 1);
  });
});

describe('changing the crowd setting mid-game', () => {
  it('someone benched leaves any game or taxi wave they were in', () => {
    const world = new FreeWorld({ minX: -80, maxX: 80, minZ: -80, maxZ: 80 });
    const life = new TownLife((r) => ({ x: r.range(-50, 50), z: r.range(-50, 50) }), new Random(31));
    const r = new Random(32);
    for (let i = 0; i < 10; i++) {
      const look = personOf('lanka', () => r.next(), { age: 'child' }).look;
      life.add(new HumanModel(look), look, r.range(-50, 50), r.range(-50, 50));
    }
    life.setDensity(1);
    const last = life.people[9];
    life.startTag([last], 60);
    life.setDensity(0.5);
    expect(last.benched).toBe(true);
    expect(last.act).toBe('stroll');
    life.update(1 / 30, 0, { x: 0, z: 0 }, world);
    expect(last.model.root.visible).toBe(false);
  });
});
