import { describe, expect, it } from 'vitest';
import { CricketMatch, OVER, PITCHES, WINDOWS } from '../src/gameplay/Cricket';
import { CricketPitch } from '../src/world/StreetFun';
import { TownLife } from '../src/world/TownLife';
import { personOf } from '../src/world/Peoples';
import { HumanModel } from '../src/models/Human';
import { FreeWorld } from '../src/gameplay/FreeRoam';
import { Random } from '../src/core/Random';

const fakeEl = (): Record<string, unknown> => ({ style: {}, className: '', innerHTML: '', remove() {}, appendChild() {} });
(globalThis as { document?: unknown }).document ??= { createElement: fakeEl, documentElement: { lang: 'en' } };

/** Run a match until the ball is `early` seconds from the bat, then swing. */
function playBall(m: CricketMatch, offset: number | null): ReturnType<CricketMatch['swing']> {
  let guard = 0;
  while (m.phase !== 'flight' && guard++ < 400) m.step(0.01);
  const target = m.ball.flight + (offset ?? 10);
  let shot: ReturnType<CricketMatch['swing']> = null;
  while (m.phase === 'flight' && guard++ < 2000) {
    if (offset !== null && m.t >= target && !m.swung) shot = m.swing();
    shot = m.step(0.005) ?? shot;
  }
  return shot ?? m.last?.shot ?? null;
}

describe('street cricket', () => {
  it('timing decides the shot: dead on is a six, close a four, near a run', () => {
    const m = new CricketMatch(new Random(1));
    expect(playBall(m, 0)).toBe('six');
    for (let i = 0; i < 200 && m.phase !== 'runup'; i++) m.step(0.02);
    expect(playBall(m, WINDOWS.six + 0.03)).toBe('four');
    for (let i = 0; i < 200 && m.phase !== 'runup'; i++) m.step(0.02);
    expect(playBall(m, -(WINDOWS.four + 0.03))).toBe('runs');
    expect(m.runs).toBe(6 + 4 + (m.last!.runs));
  });

  it('miss a ball on the stumps and you are bowled; otherwise six balls make the over', () => {
    let bowled = false;
    for (let seed = 0; seed < 20 && !bowled; seed++) {
      const m = new CricketMatch(new Random(seed));
      for (let b = 0; b < OVER && !m.over; b++) {
        const on = m.ball.onStumps;
        const shot = playBall(m, null);
        if (on) {
          expect(shot).toBe('bowled');
          bowled = true;
        } else expect(shot).toBe('dot');
        for (let i = 0; i < 300 && m.phase === 'result'; i++) m.step(0.02);
      }
      expect(m.over).toBe(true);
      expect(m.balls).toBeLessThanOrEqual(OVER);
    }
    expect(bowled).toBe(true);
    expect(CricketMatch.reward(20)).toBe(60);
  });

  it('the kids play on their own, and step aside when you take the bat', () => {
    const pitch = new CricketPitch(PITCHES[0], 'lanka', 5);
    for (let i = 0; i < 30 * 20; i++) pitch.update(1 / 30, i / 30);
    pitch.group.updateMatrixWorld(true);
    pitch.group.traverse((o) => expect(Number.isFinite(o.position.x + o.position.y + o.position.z)).toBe(true));
    const m = pitch.start(new Random(3));
    let swung = false;
    for (let i = 0; i < 30 * 10 && !m.over; i++) {
      if (m.phase === 'flight' && m.t >= m.ball.flight && !m.swung) {
        pitch.swing();
        swung = true;
      }
      pitch.update(1 / 60, i / 60);
    }
    expect(swung).toBe(true);
    expect(pitch.shots.length).toBeGreaterThan(0);
    pitch.stop();
    expect(pitch.match).toBeNull();
  });

  it('every town pitch has room to play, and a ring to start', async () => {
    const mods = { harbour: (await import('../src/world/Hub')).Hub, city: (await import('../src/world/City')).City, hills: (await import('../src/world/Hills')).Hills };
    for (const [id, A] of Object.entries(mods)) {
      const a = new A(fakeEl() as unknown as HTMLElement);
      expect(a.cricket.length, id).toBeGreaterThan(0);
      for (const c of a.cricket) {
        expect(a.zones.some((z) => z.kind === 'cricket' && z.spot === c.def.id)).toBe(true);
        expect(a.world.resolve({ x: c.crease.x, z: c.crease.z }, 0.35), `${id} crease`).toBeNull();
      }
    }
  }, 30000);
});

describe('tag and hide-and-seek', () => {
  const world = new FreeWorld({ minX: -80, maxX: 80, minZ: -80, maxZ: 80 });
  const kids = (life: TownLife, n: number) => {
    const r = new Random(8);
    return Array.from({ length: n }, (_, i) => {
      const look = personOf('lanka', () => r.next(), { age: 'child' }).look;
      return life.add(new HumanModel(look), look, i * 2, 0);
    });
  };

  it('children run from you in tag, laughing when caught', () => {
    const life = new TownLife((r) => ({ x: r.range(-50, 50), z: r.range(-50, 50) }), new Random(2));
    const ks = kids(life, 3);
    life.startTag(ks, 60);
    const me = { x: 0, z: 3 };
    const before = Math.hypot(ks[0].body.x - me.x, ks[0].body.z - me.z);
    for (let i = 0; i < 40; i++) life.update(1 / 20, i / 20, me, world);
    expect(Math.hypot(ks[0].body.x - me.x, ks[0].body.z - me.z)).toBeGreaterThan(before + 2);
    expect(ks.every((k) => k.act === 'flee')).toBe(true);
    life.caught(ks[0]);
    for (let i = 0; i < 10; i++) life.update(1 / 20, i / 20, { x: 60, z: 60 }, world);
    expect(ks[0].pose).toBe('laugh');
  });

  it('a hiding child runs to the hiding place and crouches there', () => {
    const life = new TownLife(() => ({ x: 0, z: 0 }), new Random(3));
    const [k] = kids(life, 1);
    life.startHide(k, { x: 20, z: 10 }, 90);
    for (let i = 0; i < 20 * 15; i++) life.update(1 / 20, i / 20, { x: -40, z: -40 }, world);
    expect(Math.hypot(k.body.x - 20, k.body.z - 10)).toBeLessThan(0.8);
    expect(k.pose).toBe('sitdown');
  });
});
