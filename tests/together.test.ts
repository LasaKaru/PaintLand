import { describe, expect, it } from 'vitest';
import {
  acceptScore,
  checkTogether,
  CONTEST_SECONDS,
  CONVOY,
  convoyTick,
  driftPoints,
  dropsNear,
  leaderTick,
  newContest,
  newConvoy,
  newPaintEvent,
  PAINT_DROPS,
  paintDrops,
  standings,
  START_DELAY,
  stuntPoints,
  takeDrop,
} from '../src/gameplay/Together';

describe('Playing together', () => {
  it('only well-formed messages are accepted from other players', () => {
    expect(checkTogether({ type: 'contest', id: 'c-1', mode: 'drift', chapter: 'hub' })).toBeTruthy();
    expect(checkTogether({ type: 'contest', id: 'c-1', mode: 'fly', chapter: 'hub' })).toBeNull();
    expect(checkTogether({ type: 'score', id: 'c-1', score: -5 })).toBeNull();
    expect(checkTogether({ type: 'score', id: 'c-1', score: Infinity })).toBeNull();
    expect(checkTogether({ type: 'take', id: 'p', drop: PAINT_DROPS })).toBeNull();
    expect(checkTogether({ type: 'paint', id: 'p', seed: 3, chapter: 'hub', cx: 0, cz: 1e9 })).toBeNull();
    expect(checkTogether({ type: 'ping', leader: '<script>' })).toBeNull();
    expect(checkTogether('hello')).toBeNull();
  });

  it('contests: points, a sanity cap on others’ scores, standings', () => {
    const c = newContest('c1', 'drift', 100);
    expect(c.endAt - c.startAt).toBe(CONTEST_SECONDS);
    expect(driftPoints(1, 50, true)).toBe(30);
    expect(driftPoints(1, 50, false)).toBe(0);
    expect(stuntPoints(0.4)).toBe(0);
    expect(stuntPoints(2)).toBe(480);
    c.mine = 300;
    // 10 s into the contest nobody can have 5000 drift points.
    expect(acceptScore(c, 'Cheater', 5000, 100 + START_DELAY + 10)).toBe(false);
    expect(acceptScore(c, 'Nimal', 350, 100 + START_DELAY + 10)).toBe(true);
    expect(acceptScore(c, 'Nimal', 200, 100 + START_DELAY + 11)).toBe(true); // an older, lower update doesn't lower it
    expect(standings(c, 'Me').map((s) => [s.name, s.score])).toEqual([
      ['Nimal', 350],
      ['Me', 300],
    ]);
  });

  it('paint splash: everyone gets the same pots, on open ground, and each pot counts once', () => {
    const free = (x: number, z: number): boolean => Math.hypot(x, z - 30) > 12; // a pond in the middle
    const a = paintDrops(42, 0, 30, free);
    const b = paintDrops(42, 0, 30, free);
    expect(a).toEqual(b);
    expect(a.length).toBe(PAINT_DROPS);
    for (const d of a) expect(free(d.x, d.z)).toBe(true);
    expect(paintDrops(43, 0, 30, free)).not.toEqual(a);
    const e = newPaintEvent('p1', a, 0, 3);
    expect(e.target).toBe(25);
    expect(takeDrop(e, 0, true, 1)).toBe(false); // not started yet
    expect(takeDrop(e, 0, true, START_DELAY + 1)).toBe(true);
    expect(takeDrop(e, 0, false, START_DELAY + 2)).toBe(false); // already taken
    expect(takeDrop(e, 1, false, START_DELAY + 2)).toBe(true);
    expect([e.team, e.mine]).toEqual([2, 1]);
    expect(dropsNear(e, a[2].x, a[2].z)).toContain(2);
    expect(dropsNear(e, a[0].x, a[0].z)).not.toContain(0);
  });

  it('convoys pay followers who keep up, and the leader per follower', () => {
    const f = newConvoy();
    f.leader = 'lead-1';
    let ink = 0;
    for (let i = 0; i < 60; i++) ink += convoyTick(f, 1, 20, 12);
    expect(ink).toBe(2 * CONVOY.ink);
    // Falling behind or stopping earns nothing.
    for (let i = 0; i < 60; i++) ink += convoyTick(f, 1, 80, 12) + convoyTick(f, 1, 10, 1);
    expect(ink).toBe(2 * CONVOY.ink);
    const l = newConvoy();
    l.leading = true;
    expect(leaderTick(l, 0)).toBe(0);
    l.followers.set('a', 20);
    l.followers.set('b', 25);
    l.followers.set('old', -100);
    expect(leaderTick(l, CONVOY.every)).toBe(2 * CONVOY.leaderInk);
    expect(l.followers.has('old')).toBe(false);
  });
});
