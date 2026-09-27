import { describe, expect, it } from 'vitest';
import { POT_SWINGS, cleanLantern, defaultLantern, newPotRound, potWarmth, swing } from '../src/ui/FestivalGames';
import { buildHome } from '../src/world/HomePlot';

describe('festival games', () => {
  it('spreads three pots out and warms up as you get close', () => {
    for (let s = 0; s < 20; s++) {
      const r = newPotRound();
      expect(r.pots).toHaveLength(3);
      for (let i = 1; i < 3; i++) expect(r.pots[i] - r.pots[i - 1]).toBeGreaterThan(0.18);
    }
    const r = newPotRound();
    r.pots = [0.1, 0.5, 0.9];
    r.x = 0.5;
    expect(potWarmth(r)).toBeCloseTo(1, 5);
    r.x = 0.3;
    expect(potWarmth(r)).toBeLessThan(0.5);
  });

  it('breaks a pot only within reach, and stops after the last swing', () => {
    const r = newPotRound(() => 0.5);
    r.pots = [0.2, 0.5, 0.8];
    r.x = 0.62;
    expect(swing(r)).toBe(-1);
    r.x = 0.51;
    expect(swing(r)).toBe(1);
    // A broken pot can't break again; the warmth ignores it.
    expect(swing(r)).toBe(-1);
    expect(potWarmth(r)).toBeLessThan(0.2);
    while (r.swings > 0) swing(r);
    r.x = 0.2;
    expect(swing(r)).toBe(-1);
    expect(r.swings).toBe(0);
    expect(POT_SWINGS).toBe(5);
  });

  it('keeps only real lantern designs, and hangs them on the house', () => {
    expect(cleanLantern(defaultLantern())).toEqual(defaultLantern());
    expect(cleanLantern({ ...defaultLantern(), frame: 'blob' })).toBeNull();
    expect(cleanLantern({ ...defaultLantern(), panels: ['#000000', ...defaultLantern().panels.slice(1)] })).toBeNull();
    expect(cleanLantern(null)).toBeNull();
    const base = { walls: '#ffffff', roof: '#d8463a', keepsakes: [], trophies: 0, owner: 'A' };
    const bare = buildHome(base).getAttribute('position').count;
    expect(buildHome({ ...base, lanterns: [defaultLantern(), { ...defaultLantern(), frame: 'star' }] }).getAttribute('position').count).toBeGreaterThan(bare);
  });
});
