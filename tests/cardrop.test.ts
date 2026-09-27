import { describe, expect, it } from 'vitest';
import { CarDrop, DROP, aheadOf } from '../src/gameplay/CarDrop';

describe('calling the car', () => {
  it('falls from the sky, slows under the chute, lands once, then waits a moment', () => {
    const d = new CarDrop();
    expect(d.ready(0)).toBe(true);
    d.start(5, 5, 0);
    expect(d.ready(0)).toBe(false);
    let last = Infinity;
    let landings = 0;
    let t = 0;
    let fastest = 0;
    let slowestNearGround = Infinity;
    for (; t < 6; t += 1 / 60) {
      const h = d.height;
      expect(h).toBeLessThanOrEqual(last + 1e-9);
      const speed = (last - h) * 60;
      if (last !== Infinity) {
        fastest = Math.max(fastest, speed);
        if (h < 3 && h > 0) slowestNearGround = Math.min(slowestNearGround, speed);
      }
      last = h;
      if (d.update(1 / 60, t)) landings++;
    }
    expect(landings).toBe(1);
    expect(d.height).toBe(0);
    expect(slowestNearGround).toBeLessThan(fastest); // gentle touchdown
    expect(d.ready(DROP.seconds + 0.5)).toBe(false);
    expect(d.ready(DROP.seconds + DROP.cooldown + 0.1)).toBe(true);
  });

  it('lands in front of where you look', () => {
    const p = aheadOf(0, 0, 0, 7);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(-7);
    const q = aheadOf(0, 0, Math.PI / 2, 7);
    expect(q.x).toBeCloseTo(-7);
  });
});
