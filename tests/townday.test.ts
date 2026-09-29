import { describe, expect, it } from 'vitest';
import { TownLife } from '../src/world/TownLife';
import { personOf } from '../src/world/Peoples';
import { HumanModel } from '../src/models/Human';
import { FreeWorld } from '../src/gameplay/FreeRoam';
import { Random } from '../src/core/Random';
import { Taxi, type Fare, type TaxiEvent } from '../src/gameplay/Taxi';
import { FACT_PLACES, talkLine, type TalkContext } from '../src/gameplay/TownTalk';
import { BowlOver, OVER, PITCHES } from '../src/gameplay/Cricket';
import { CricketPitch, Stall } from '../src/world/StreetFun';
import en from '../src/core/locales/en';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const world = new FreeWorld({ minX: -80, maxX: 80, minZ: -80, maxZ: 80 });

function town(n: number, age: 'adult' | 'child', seed = 7): TownLife {
  const life = new TownLife((r) => ({ x: r.range(-40, 40), z: r.range(-40, 40) }), new Random(seed));
  const r = new Random(seed + 1);
  for (let i = 0; i < n; i++) {
    const look = personOf('lanka', () => r.next(), { age, aids: false }).look;
    life.add(new HumanModel(look), look, r.range(-40, 40), r.range(-40, 40));
  }
  return life;
}

/** Run the town, calling `each` every frame. */
function run(life: TownLife, seconds: number, player = { x: 500, z: 500 }, each?: () => void): void {
  for (let i = 0; i < seconds * 20; i++) {
    life.update(1 / 20, i / 20, player, world);
    each?.();
  }
}

describe('a day in town: routines', () => {
  it('fishermen go down to the water at dawn with a rod, one to a spot, and pack up at nine', () => {
    const life = town(40, 'adult');
    life.fishingSpots = [
      { x: 20, z: 0, yaw: 0 },
      { x: -20, z: 10, yaw: 1 },
    ];
    life.env = { ...life.env, hour: 5.5 };
    let posed = false;
    run(life, 90, undefined, () => {
      if (life.people.some((p) => p.act === 'fish' && p.pose === 'fish')) posed = true;
    });
    const fishers = life.people.filter((p) => p.act === 'fish');
    expect(fishers.length).toBeGreaterThan(0);
    expect(fishers.length).toBeLessThanOrEqual(2);
    expect(new Set(fishers.map((p) => p.beat)).size).toBe(fishers.length);
    for (const p of fishers) expect(p.model.carry).toBe('rod');
    expect(posed).toBe(true);
    life.env = { ...life.env, hour: 9.2 };
    run(life, 10);
    expect(life.people.some((p) => p.act === 'fish')).toBe(false);
  });

  it('children walk to school in the morning; most are in class, and all out again after two', () => {
    const life = town(20, 'child');
    life.school = { x: 60, z: 0 };
    life.env = { ...life.env, hour: 7.2 };
    let walking = 0;
    run(life, 40, undefined, () => {
      walking = Math.max(walking, life.people.filter((p) => p.act === 'school').length);
    });
    expect(walking).toBeGreaterThan(3);
    life.env = { ...life.env, hour: 10 };
    run(life, 60);
    const inClass = life.people.filter((p) => p.act === 'away');
    expect(inClass.length).toBeGreaterThan(life.people.length / 3);
    expect(inClass.every((p) => !p.model.root.visible)).toBe(true);
    life.env = { ...life.env, hour: 15 };
    run(life, 60);
    expect(life.people.filter((p) => p.act === 'away').length).toBe(0);
  });

  it('caught in the rain without an umbrella, people run for shelter, and come out when it stops', () => {
    const life = town(40, 'adult');
    life.shelters = [{ x: 0, z: 0 }];
    life.env = { ...life.env, hour: 12, rain: 0.8 };
    let most = 0;
    // Within a few seconds of the first drops, not just when their walk ends.
    run(life, 5, undefined, () => (most = Math.max(most, life.people.filter((p) => p.act === 'shelter').length)));
    expect(most).toBeGreaterThan(2);
    run(life, 30, undefined, () => {
      const s = life.people.filter((p) => p.act === 'shelter');
      most = Math.max(most, s.length);
      for (const p of s) expect(p.model.carry).not.toBe('umbrella');
    });
    expect(most).toBeGreaterThan(2);
    life.env = { ...life.env, rain: 0 };
    run(life, 10);
    expect(life.people.some((p) => p.act === 'shelter')).toBe(false);
  });

  it('children jump in the puddles when it rains (splash!)', () => {
    const life = town(12, 'child');
    life.env = { ...life.env, hour: 16, rain: 0.8 };
    let splashes = 0;
    run(life, 40, { x: 0, z: 0 }, () => (splashes += life.splashes.length));
    expect(splashes).toBeGreaterThan(0);
    const dry = town(12, 'child');
    dry.env = { ...dry.env, hour: 16, rain: 0 };
    let none = 0;
    run(dry, 20, { x: 0, z: 0 }, () => (none += dry.splashes.length));
    expect(none).toBe(0);
  });

  it('petals or lanterns from the weather brush: people nearby stop to look, point and take photos', () => {
    const life = town(30, 'adult');
    run(life, 2);
    const n = life.marvel(0, 0, 45);
    expect(n).toBeGreaterThan(5);
    const looking = life.people.filter((p) => p.act === 'pause' && p.away?.x === 0);
    expect(looking.length).toBe(n);
    for (const p of looking) expect(['photo', 'point', 'clap', 'cheer']).toContain(p.still);
  });

  it('footsteps: the crowd around you is heard walking', () => {
    const life = town(30, 'adult');
    run(life, 5, { x: 0, z: 0 });
    expect(life.crowdAt(0, 0).steps).toBeGreaterThan(0);
    expect(life.crowdAt(1000, 1000).steps).toBe(0);
  });
});

describe('taxi passengers', () => {
  const car = { x: 0, z: 0, v: 0, grounded: true };
  const fare = (life: TownLife, o: Partial<Fare>): Fare => ({ person: life.people[0], mood: 'chatty', to: { name: 'the harbour', x: 300, z: 0 }, dist: 300, time: 0, comfort: 1, line: 99, stop: null, stopDone: false, joke: 0, ...o });

  it('a tourist asks for a photo stop on the way: pull up there and they give five stars', () => {
    const life = town(4, 'adult');
    const taxi = new Taxi(new Random(1));
    const stop = { name: 'the Lotus Tower', x: 100, z: 0 };
    taxi.fare = fare(life, { mood: 'tourist', stop, line: 0 });
    const said = taxi.step(0.1, life, { ...car, v: 10 }, true).find((e) => e.kind === 'say');
    expect(said && said.kind === 'say' && said.key).toBe('taxi.tourist');
    expect(said && said.kind === 'say' && said.params?.place).toBe('the Lotus Tower');
    expect(Taxi.stars(taxi.fare)).toBe(2);
    let photo: TaxiEvent | undefined;
    for (let i = 0; i < 20 && !photo; i++) photo = taxi.step(0.1, life, { ...car, x: 101, v: 0 }, true).find((e) => e.kind === 'photo');
    expect(photo).toBeDefined();
    expect(taxi.fare.stopDone).toBe(true);
    expect(Taxi.stars(taxi.fare)).toBe(5);
  });

  it('a funny passenger tells jokes in turn', () => {
    const life = town(4, 'adult');
    const taxi = new Taxi(new Random(1));
    taxi.fare = fare(life, { mood: 'funny', line: 0 });
    const keys: string[] = [];
    for (let i = 0; i < 600 && keys.length < 3; i++) for (const e of taxi.step(0.1, life, { ...car, v: 8 }, true)) if (e.kind === 'say') keys.push(e.key);
    expect(keys).toEqual(['taxi.joke1', 'taxi.joke2', 'taxi.joke3']);
    for (const k of keys) expect(en[k as keyof typeof en]).toBeTruthy();
  });

  it('a tuk-tuk earns a bigger tip', () => {
    expect(Taxi.pay(200, 5, true).tip).toBeGreaterThan(Taxi.pay(200, 5).tip);
    expect(Taxi.pay(200, 5, true).pay).toBe(Taxi.pay(200, 5).pay);
  });
});

describe('talking about landmarks', () => {
  const ctx = (o: Partial<TalkContext> = {}): TalkContext => ({ region: 'lanka', kind: 'adult', busker: false, hour: 12, rain: 0, carNear: false, secretNear: null, places: [], ...o });

  it('people near a landmark tell you something about it', () => {
    const r = new Random(4);
    const lines = Array.from({ length: 60 }, () => talkLine(ctx({ facts: ['lotus', 'not-a-landmark'] }), r));
    const facts = lines.filter((l) => l.key.startsWith('fact.'));
    expect(facts.length).toBeGreaterThan(15);
    for (const l of facts) expect(l.key).toBe('fact.lotus');
    for (const id of FACT_PLACES) expect(en[`fact.${id}`]).toBeTruthy();
  });
});

describe('bowling an over to the kids', () => {
  it('a well-timed ball is a good one; six balls make the over; wickets and tight bowling pay', () => {
    const o = new BowlOver(new Random(2));
    o.marker = o.target;
    expect(o.release()).toBe(1);
    expect(o.release()).toBeNull();
    for (let i = 0; i < OVER; i++) {
      o.phase = 'aim';
      o.result(i === 0 ? 'bowled' : 'dot', 0);
    }
    expect(o.phase).toBe('done');
    expect(o.wickets).toBe(1);
    expect(BowlOver.reward(2, 6)).toBe(84);
    expect(BowlOver.reward(0, 30)).toBe(0);
  });

  it('bowl at a town pitch: the kid bats every ball, and good balls take more wickets', () => {
    const over = (good: boolean, seed: number): { balls: number; wickets: number } => {
      const pitch = new CricketPitch(PITCHES[0], 'lanka', 5);
      const o = pitch.startBowling(new Random(seed));
      for (let i = 0; i < 60 * 60 && o.phase !== 'done'; i++) {
        if (o.phase === 'aim' && (good ? Math.abs(o.marker - o.target) < 0.02 : Math.abs(o.marker - o.target) > 0.4)) pitch.release();
        pitch.update(1 / 60, i / 60);
      }
      expect(pitch.bowlShots.length).toBe(o.balls);
      pitch.stopBowling();
      expect(pitch.bowling).toBeNull();
      return { balls: o.balls, wickets: o.wickets };
    };
    let good = 0;
    let poor = 0;
    for (let s = 0; s < 8; s++) {
      const g = over(true, s);
      expect(g.balls).toBe(OVER);
      good += g.wickets;
      poor += over(false, s).wickets;
    }
    expect(good).toBeGreaterThan(poor);
  });
});

describe('market stalls keep hours', () => {
  it('set up at ten, open at eleven, close at ten at night', () => {
    expect(Stall.isOpen(9)).toBe(false);
    expect(Stall.isOpen(10.5)).toBe(false);
    expect(Stall.isOpen(12)).toBe(true);
    expect(Stall.isOpen(21.9)).toBe(true);
    expect(Stall.isOpen(22.5)).toBe(false);
  });
});
