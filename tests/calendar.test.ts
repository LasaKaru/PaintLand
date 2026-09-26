import { describe, expect, it } from 'vitest';
import { festivalOn, moonAge, resolveFestival, resolveSeason, seasonFor } from '../src/world/Calendar';

const utc = (y: number, m: number, d: number, h = 12): Date => new Date(Date.UTC(y, m - 1, d, h));

describe('Calendar', () => {
  it('knows the moon well enough for festivals', () => {
    // Full moons: 12 May 2025, 1 May 2026, 20 May 2027. New moons: 21 Oct 2025, 9 Nov 2026.
    for (const d of [utc(2025, 5, 12), utc(2026, 5, 1), utc(2027, 5, 20)]) expect(Math.abs(moonAge(d) - 14.77)).toBeLessThan(1.2);
    for (const d of [utc(2025, 10, 21), utc(2026, 11, 9)]) {
      const age = moonAge(d);
      expect(Math.min(age, 29.53 - age)).toBeLessThan(1.2);
    }
  });

  it('festivals fall on the right days', () => {
    expect(festivalOn(utc(2025, 5, 12))).toBe('vesak');
    expect(festivalOn(utc(2027, 5, 20))).toBe('vesak');
    expect(festivalOn(utc(2026, 4, 14))).toBe('avurudu');
    expect(festivalOn(utc(2025, 10, 20))).toBe('diwali');
    expect(festivalOn(utc(2026, 11, 8))).toBe('diwali');
    expect(festivalOn(utc(2026, 7, 10))).toBeNull();
    expect(festivalOn(utc(2026, 5, 15))).toBeNull(); // no full moon then
    expect(resolveFestival('off', utc(2025, 5, 12))).toBeNull();
    expect(resolveFestival('diwali', utc(2026, 7, 10))).toBe('diwali');
  });

  it('seasons by month, hemisphere and the tropics', () => {
    expect(seasonFor(utc(2026, 1, 15), 'Europe/London')).toBe('winter');
    expect(seasonFor(utc(2026, 4, 15), 'Europe/London')).toBe('spring');
    expect(seasonFor(utc(2026, 10, 15), 'America/New_York')).toBe('autumn');
    expect(seasonFor(utc(2026, 1, 15), 'Australia/Sydney')).toBe('summer');
    expect(seasonFor(utc(2026, 1, 15), 'Asia/Colombo')).toBe('summer');
    expect(resolveSeason('off', utc(2026, 1, 15), 'Europe/London')).toBe('summer');
    expect(resolveSeason('winter', utc(2026, 7, 15), 'Europe/London')).toBe('winter');
  });
});
