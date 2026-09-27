import { describe, expect, it } from 'vitest';
import { BATTLE, PaintBattle, PaintGrid, botStep, landingPoint, lobFor, makeBots, splitTeams, throwVelocity, type Team } from '../src/gameplay/PaintBattle';
import { checkTogether } from '../src/gameplay/Together';

const open = () => true;
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
}

describe('paint battle', () => {
  it('paints the ground by team, never through walls, and counts coverage', () => {
    const wall = (x: number) => !(x > 5 && x < 8);
    const g = new PaintGrid(0, 0, 20, wall);
    expect(g.paintable).toBeGreaterThan(1000);
    expect(g.ownerAt(6, 0)).toBe(-2);
    const n = g.splat(0, 0, 2.4, 0);
    expect(n).toBeGreaterThan(10);
    expect(g.ownerAt(0, 0)).toBe(0);
    // Painting over the other team's colour takes the cells.
    g.splat(0.5, 0, 2.4, 1);
    expect(g.ownerAt(0.5, 0)).toBe(1);
    const [a, b] = g.coverage();
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    g.splat(6.5, 0, 1, 0);
    expect(g.ownerAt(6.5, 0)).toBe(-2);
    expect(g.splat(100, 100, 2, 0)).toBe(0);
  });

  it('throws land where the aim marker says, and lobs reach the distance asked', () => {
    const grid = new PaintGrid(0, 0, 36, open);
    const b = new PaintBattle({ id: 'b', cx: 0, cz: 0, teams: [['me', 0], ['you', 1]] }, grid, 0);
    const from = { x: 0, y: 1.6, z: 0 };
    const v = throwVelocity(0.3, 0.5);
    const land = landingPoint(from, v);
    expect(b.throw('me', from, v, BATTLE.startDelay + 1, true)).toBeTruthy();
    let splat: { x: number; z: number } | null = null;
    for (let i = 0; i < 600 && !splat; i++) for (const e of b.update(1 / 120, [])) if (e.kind === 'splat') splat = e;
    expect(splat).toBeTruthy();
    expect(Math.hypot(splat!.x - land.x, splat!.z - land.z)).toBeLessThan(0.6);
    for (const d of [8, 15, 24]) {
      const l = landingPoint({ x: 0, y: 0, z: 0 }, throwVelocity(0, lobFor(d)));
      expect(Math.abs(Math.hypot(l.x, l.z) - d)).toBeLessThan(0.1);
    }
  });

  it('only lets real players throw: in time, not too often, not too hard, and while there is paint', () => {
    const grid = new PaintGrid(0, 0, 36, open);
    const b = new PaintBattle({ id: 'b', cx: 0, cz: 0, teams: [['me', 0], ['you', 1]] }, grid, 0);
    const at = { x: 0, y: 1.6, z: 0 };
    const v = throwVelocity(0, 0.4);
    expect(b.throw('me', at, v, 1, true)).toBeNull(); // not started yet
    const t0 = BATTLE.startDelay + 1;
    expect(b.throw('stranger', at, v, t0)).toBeNull();
    expect(b.throw('you', at, { x: 0, y: 60, z: 0 }, t0)).toBeNull();
    expect(b.throw('you', { x: 500, y: 1, z: 0 }, v, t0)).toBeNull();
    expect(b.throw('you', at, v, t0)).toBeTruthy();
    expect(b.throw('you', at, v, t0 + 0.05)).toBeNull();
    let thrown = 0;
    for (let i = 0; i < 40; i++) if (b.throw('me', at, v, t0 + i * BATTLE.gap, true)) thrown++;
    expect(thrown).toBe(Math.round(1 / BATTLE.cost)); // the tank runs dry
    expect(b.throw('me', at, v, BATTLE.startDelay + BATTLE.seconds + 1, true)).toBeNull(); // over
  });

  it('a balloon that reaches a player on the other team splats them, not a teammate', () => {
    const grid = new PaintGrid(0, 0, 36, open);
    const b = new PaintBattle({ id: 'b', cx: 0, cz: 0, teams: [['me', 0], ['mate', 0], ['you', 1]] }, grid, 0);
    const from = { x: 0, y: 1.6, z: 0 };
    const v = throwVelocity(0, lobFor(10));
    const land = landingPoint(from, v);
    b.throw('me', from, v, BATTLE.startDelay + 1);
    const events = [];
    for (let i = 0; i < 400; i++) events.push(...b.update(1 / 120, [{ id: 'mate', team: 0, x: land.x, z: land.z + 0.3 }, { id: 'you', team: 1, x: land.x, z: land.z }]));
    const hits = events.filter((e) => e.kind === 'hit');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ victim: 'you', by: 'me' });
    expect(b.out.get('you')).toBeGreaterThan(0);
  });

  it('splits teams evenly and the same way everywhere', () => {
    const a = splitTeams(['d', 'a', 'c', 'b', 'e']);
    const b = splitTeams(['e', 'c', 'a', 'b', 'd']);
    expect(a).toEqual(b);
    expect(a.filter(([, t]) => t === 0).length - a.filter(([, t]) => t === 1).length).toBeLessThanOrEqual(1);
  });

  it('bots play a whole game: they paint a good part of the arena and splat each other', () => {
    const grid = new PaintGrid(0, 0, BATTLE.radius, open);
    const probe = new PaintBattle({ id: 'p', cx: 0, cz: 0, teams: [] }, grid, 0);
    const bots = [...makeBots(3, 0, probe.base(0), 1), ...makeBots(3, 1, probe.base(1), 1)];
    const b = new PaintBattle({ id: 'b', cx: 0, cz: 0, teams: bots.map((q) => [q.id, q.team as Team]) }, grid, 0);
    const rnd = rng(7);
    let hits = 0;
    const dt = 1 / 30;
    for (let t = 0; t < BATTLE.startDelay + BATTLE.seconds; t += dt) {
      for (const bot of bots) {
        if (!b.live(t) || (b.out.get(bot.id) ?? 0) > 0) continue;
        const step = botStep(bot, b, bots.filter((o) => o.team !== bot.team).map((o) => o), dt, rnd);
        if (grid.inside(bot.x + step.dx * 4.2 * dt, bot.z + step.dz * 4.2 * dt)) {
          bot.x += step.dx * 4.2 * dt;
          bot.z += step.dz * 4.2 * dt;
        }
        if (step.throw) b.throw(bot.id, { x: bot.x, y: 1.6, z: bot.z }, step.throw, t);
      }
      for (const e of b.update(dt, bots.map((q) => ({ id: q.id, team: q.team, x: q.x, z: q.z })))) if (e.kind === 'hit') hits++;
    }
    const [pa, pb] = b.shares();
    expect(pa + pb).toBeGreaterThan(0.25);
    expect(pa).toBeGreaterThan(0.1);
    expect(pb).toBeGreaterThan(0.1);
    expect(hits).toBeGreaterThan(0);
  });

  it('checks battle messages from other players', () => {
    expect(checkTogether({ type: 'battle', id: 'battle-1', chapter: 'hub', cx: 1, cz: 2, teams: [['a1', 0], ['b2', 1]] })).toBeTruthy();
    expect(checkTogether({ type: 'battle', id: 'battle-1', chapter: 'hub', cx: 1, cz: 2, teams: [['a1', 3], ['b2', 1]] })).toBeNull();
    expect(checkTogether({ type: 'battle', id: 'battle-1', chapter: 'hub', cx: 1, cz: 2, teams: [['<script>', 0], ['b2', 1]] })).toBeNull();
    expect(checkTogether({ type: 'shot', id: 'battle-1', x: 1, y: 1.6, z: 2, vx: 3, vy: 4, vz: 5 })).toBeTruthy();
    expect(checkTogether({ type: 'shot', id: 'battle-1', x: 1, y: 1.6, z: 2, vx: 300, vy: 4, vz: 5 })).toBeNull();
    expect(checkTogether({ type: 'splatted', id: 'battle-1', by: 'a1' })).toBeTruthy();
    expect(checkTogether({ type: 'result', id: 'battle-1', pink: 600, teal: 300 })).toBeTruthy();
    expect(checkTogether({ type: 'result', id: 'battle-1', pink: 900, teal: 300 })).toBeNull();
  });
});
