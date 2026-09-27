import { describe, expect, it } from 'vitest';
import { FrameGuard, SafePoint, StuckWatch, finite, freeSpot } from '../src/core/Guard';

describe('staying alive', () => {
  it('skips a one-off error, recovers from repeated ones, and halts only if recovery fails', () => {
    const g = new FrameGuard(3, 3, 3);
    expect(g.fail(0)).toBe('skip');
    // Errors far apart never pile up.
    expect(g.fail(10)).toBe('skip');
    expect(g.fail(20)).toBe('skip');
    // Three quick ones: recover.
    expect(g.fail(30)).toBe('skip');
    expect(g.fail(30.1)).toBe('skip');
    expect(g.fail(30.2)).toBe('recover');
    // Recovery worked: a stray error later is just skipped.
    expect(g.fail(40)).toBe('skip');
    // Recovery didn't help: halt, and stay halted until reset.
    const h = new FrameGuard(3, 3, 3);
    h.fail(0);
    h.fail(0.1);
    expect(h.fail(0.2)).toBe('recover');
    h.fail(0.3);
    h.fail(0.4);
    expect(h.fail(0.5)).toBe('halt');
    expect(h.halted).toBe(true);
    h.reset();
    expect(h.halted).toBe(false);
    expect(h.fail(1)).toBe('skip');
  });

  it('checks numbers and remembers the last good spot (grounded, sane, once a second)', () => {
    expect(finite(1, 2, 3)).toBe(true);
    expect(finite(1, NaN)).toBe(false);
    expect(finite(Infinity)).toBe(false);
    const sp = new SafePoint();
    sp.update(0.1, { x: 1, y: 0, z: 1, heading: 0 }, true);
    expect(sp.last).toMatchObject({ x: 1, z: 1 });
    sp.update(0.1, { x: 5, y: 0, z: 5, heading: 0 }, true);
    expect(sp.last!.x).toBe(1); // not a second yet
    sp.update(1, { x: NaN, y: 0, z: 5, heading: 0 }, true);
    expect(sp.last!.x).toBe(1); // never keeps a broken spot
    sp.update(0, { x: 9, y: 4, z: 9, heading: 0 }, false);
    expect(sp.last!.x).toBe(1); // nor one in mid-air
    sp.update(0, { x: 9, y: 0, z: 9, heading: 0 }, true);
    expect(sp.last!.x).toBe(9);
  });

  it('hints, then frees a player pushing without moving; moving or letting go resets it', () => {
    const w = new StuckWatch(4, 9, 1.2);
    const states: string[] = [];
    for (let t = 0; t < 10; t += 0.5) states.push(w.update(0.5, 0.1 * Math.sin(t), 0, true));
    expect(states.filter((s) => s === 'hint')).toHaveLength(1);
    expect(states.filter((s) => s === 'free')).toHaveLength(1);
    expect(states.indexOf('hint')).toBeLessThan(states.indexOf('free'));
    const m = new StuckWatch(4, 9, 1.2);
    for (let t = 0; t < 20; t += 0.5) expect(m.update(0.5, t * 2, 0, true)).toBe('ok'); // moving
    const idle = new StuckWatch(4, 9, 1.2);
    for (let t = 0; t < 20; t += 0.5) expect(idle.update(0.5, 0, 0, false)).toBe('ok'); // standing still on purpose
  });

  it('finds the nearest open ground', () => {
    const wall = (x: number, z: number) => Math.hypot(x, z) > 7; // blocked within 7 m
    const p = freeSpot(0, 0, wall)!;
    expect(Math.hypot(p.x, p.z)).toBeGreaterThan(7);
    expect(Math.hypot(p.x, p.z)).toBeLessThan(10);
    expect(freeSpot(3, 3, () => true)).toEqual({ x: 3, z: 3 });
    expect(freeSpot(0, 0, () => false, 10)).toBeNull();
  });
});

describe('save protection', () => {
  it('restores the backup when the main save is damaged, and repairs broken values', async () => {
    const { vi } = await import('vitest');
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
    const { Profile } = await import('../src/gameplay/Profile');
    const p = new Profile();
    p.data.ink = 4321;
    p.data.name = 'Kavi';
    p.save(); // the first save also writes the backup
    store.set('paintland.profile.v2', '{"ink": 12, "name": "Ka'); // cut off mid-write
    const back = new Profile();
    expect(back.data.ink).toBe(4321);
    expect(back.data.name).toBe('Kavi');
    store.set('paintland.profile.v2', JSON.stringify({ ink: 'lots', name: '', stats: [1, 2], trophies: 'x' }));
    const fixed = new Profile();
    expect(Number.isFinite(fixed.data.ink)).toBe(true);
    expect(fixed.data.name.length).toBeGreaterThan(0);
    expect(fixed.data.stats).toEqual({});
    expect(fixed.data.trophies).toEqual([]);
    vi.unstubAllGlobals();
  });
});
