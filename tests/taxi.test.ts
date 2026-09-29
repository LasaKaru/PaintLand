import { describe, expect, it } from 'vitest';
import { Taxi, DROP_RADIUS, type TaxiCar } from '../src/gameplay/Taxi';
import { GREETINGS, talkLine, type TalkContext } from '../src/gameplay/TownTalk';
import { TownLife } from '../src/world/TownLife';
import { personOf } from '../src/world/Peoples';
import { HumanModel } from '../src/models/Human';
import { FreeWorld } from '../src/gameplay/FreeRoam';
import { Random } from '../src/core/Random';
import en from '../src/core/locales/en';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

const world = new FreeWorld({ minX: -400, maxX: 400, minZ: -400, maxZ: 400 });
const places = [
  { name: 'the harbour', x: 0, z: 200 },
  { name: 'the market', x: -150, z: -40 },
  { name: 'the square', x: 10, z: 5 },
];

function town(): TownLife {
  const life = new TownLife((r) => ({ x: r.range(-40, 40), z: r.range(-40, 40) }), new Random(3));
  const r = new Random(4);
  for (let i = 0; i < 20; i++) {
    const look = personOf('lanka', () => r.next(), { age: 'adult', aids: false }).look;
    life.add(new HumanModel(look), look, r.range(-40, 40), r.range(-40, 40));
  }
  return life;
}

describe('taxi rides', () => {
  it('pays by distance and tips by stars', () => {
    const low = Taxi.pay(200, 1);
    const high = Taxi.pay(200, 5);
    expect(low.tip).toBe(0);
    expect(high.pay).toBe(low.pay);
    expect(high.tip).toBeGreaterThan(0);
    expect(Taxi.pay(300, 3).pay).toBeGreaterThan(Taxi.pay(100, 3).pay);
  });

  it('someone waves you down; stop beside them, take them where they ask, and get paid', () => {
    const life = town();
    const taxi = new Taxi(new Random(5));
    const car: TaxiCar = { x: 0, z: -60, v: 8, grounded: true };
    let hailed = false;
    for (let i = 0; i < 60 * 20 && !hailed; i++) {
      hailed = taxi.step(1 / 20, life, car, true).some((e) => e.kind === 'hail');
      life.update(1 / 20, i / 20, car, world);
    }
    expect(hailed).toBe(true);
    const p = taxi.hail!;
    expect(p.act).toBe('hail');
    expect(taxi.canPickUp(car)).toBe(false);
    // Pull up beside them and stop.
    Object.assign(car, { x: p.body.x + 2, z: p.body.z, v: 0 });
    expect(taxi.canPickUp(car)).toBe(true);
    const fare = taxi.pickUp(life, places, car)!;
    expect(fare).toBeTruthy();
    expect(p.act).toBe('ride');
    expect(fare.dist).toBeGreaterThan(30);
    // Riding: the town leaves them alone.
    const at = { x: p.body.x, z: p.body.z };
    life.update(1 / 20, 0, car, world);
    expect(p.body.x).toBe(at.x);
    // Drive there briskly and stop at the destination.
    for (let i = 0; i < 20 * 10; i++) taxi.step(1 / 20, life, { ...car, v: 12 }, true);
    Object.assign(car, { x: fare.to.x + DROP_RADIUS / 2, z: fare.to.z, v: 0 });
    expect(taxi.atDestination(car)).toBe(true);
    const done = taxi.dropOff(life, car, true)!;
    expect(done.kind).toBe('arrived');
    if (done.kind === 'arrived') {
      expect(done.pay).toBeGreaterThan(15);
      expect(done.stars).toBeGreaterThanOrEqual(1);
      expect(done.stars).toBeLessThanOrEqual(5);
    }
    expect(p.act).not.toBe('ride');
    expect(Math.hypot(p.body.x - car.x, p.body.z - car.z)).toBeLessThan(3);
    expect(taxi.fare).toBeNull();
  });

  it('a gentle passenger minds jumps and hard braking; one in a hurry minds dawdling', () => {
    const life = town();
    const taxi = new Taxi(new Random(6));
    const p = life.people[0];
    p.act = 'hail';
    taxi.hail = p;
    const car: TaxiCar = { x: p.body.x, z: p.body.z, v: 0, grounded: true };
    const fare = taxi.pickUp(life, places, car)!;
    fare.mood = 'gentle';
    const said: string[] = [];
    for (let i = 0; i < 40; i++) for (const e of taxi.step(1 / 20, life, { ...car, v: i % 2 ? 20 : 0, grounded: i % 5 !== 0 }, true)) if (e.kind === 'say') said.push(e.key);
    expect(fare.comfort).toBeLessThan(0.7);
    expect(said).toContain('taxi.careful');
    expect(Taxi.stars(fare)).toBeLessThan(4);
    fare.mood = 'hurry';
    fare.time = fare.dist / 11 + 12 + 100;
    expect(Taxi.stars(fare)).toBe(1);
    fare.time = 5;
    expect(Taxi.stars(fare)).toBe(5);
  });

  it('getting out of the car mid-ride lets the passenger out, unpaid', () => {
    const life = town();
    const taxi = new Taxi(new Random(7));
    const p = life.people[1];
    p.act = 'hail';
    taxi.hail = p;
    taxi.pickUp(life, places, { x: p.body.x, z: p.body.z, v: 0, grounded: true });
    const e = taxi.dropOff(life, { x: 5, z: 5, v: 0, grounded: true }, false);
    expect(e?.kind).toBe('cancel');
    expect(p.act).not.toBe('ride');
  });
});

describe('talking to people', () => {
  const ctx = (o: Partial<TalkContext> = {}): TalkContext => ({ region: 'lanka', kind: 'adult', busker: false, hour: 12, rain: 0, carNear: false, secretNear: null, places: ['the lake'], ...o });

  it('says hello in the local language, then something that fits the moment', () => {
    const r = new Random(1);
    for (let i = 0; i < 30; i++) {
      const l = talkLine(ctx(), r);
      expect(GREETINGS.lanka).toContain(l.hello);
      expect(en[l.key]).toBeTruthy();
    }
    expect(talkLine(ctx({ busker: true }), r).key).toBe('talk.busker');
    expect(talkLine(ctx({ kind: 'child' }), r).key).toBe('talk.child');
    expect(talkLine(ctx({ rain: 0.8, places: [] }), r).key).toBe('talk.rain');
    expect(talkLine(ctx({ region: 'japan', hour: 8 }), r).hello).toBe('Ohayō');
    // Hints at hidden things by a place name.
    const hints = Array.from({ length: 40 }, () => talkLine(ctx({ secretNear: 'the old fort' }), r)).filter((l) => l.key === 'talk.secret');
    expect(hints.length).toBeGreaterThan(5);
    expect(hints[0].params.place).toBe('the old fort');
  });

  it('the townsperson stops and faces you while you talk', () => {
    const life = town();
    const p = life.people[2];
    life.talkTo(p, { x: p.body.x + 1.5, z: p.body.z });
    life.update(1 / 20, 0, { x: p.body.x + 1.5, z: p.body.z }, world);
    expect(p.pose).toBe('talk');
    // Facing the player (to the +x side): forward is (−sin h, −cos h).
    expect(-Math.sin(p.body.heading)).toBeGreaterThan(0.9);
    expect(life.nearest(p.body.x + 1, p.body.z, 2)).toBe(p);
  });
});
