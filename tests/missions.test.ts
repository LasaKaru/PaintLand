import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MISSIONS, MissionTracker } from '../src/gameplay/Missions';
import { CATALOGUE, MAX_TONICS, Profile } from '../src/gameplay/Profile';

const byId = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('MissionTracker', () => {
  it('counts notes only in the mission district', () => {
    const t = new MissionTracker();
    t.start(byId('sk-notes'));
    for (let i = 0; i < 10; i++) t.onNote(3);
    expect(t.active!.progress).toBe(0);
    for (let i = 0; i < 24; i++) t.onNote(0);
    expect(t.active!.done).toBe(true);
  });

  it('deliveries succeed on reaching the district and fail when the clock runs out', () => {
    const ok = new MissionTracker();
    ok.start(byId('sk-bread'));
    ok.tick(10);
    ok.onEnterDistrict(2);
    expect(ok.active!.done).toBe(true);

    const late = new MissionTracker();
    late.start(byId('sk-bread'));
    late.tick(61);
    expect(late.active!.failed).toBe(true);
    late.onEnterDistrict(2);
    expect(late.active!.done).toBe(false);
  });

  it('split missions need the target time', () => {
    const t = new MissionTracker();
    t.start(byId('sk-split'));
    t.onSplit(1, 12);
    expect(t.active!.done).toBe(false);
    t.onSplit(1, 8.5);
    expect(t.active!.done).toBe(true);
  });

  it('air missions need one long enough hop', () => {
    const t = new MissionTracker();
    t.start(byId('sk-air'));
    t.onAir(1.0);
    expect(t.active!.done).toBe(false);
    t.onAir(1.6);
    expect(t.active!.done).toBe(true);
  });

  it('races are won or lost at the district end, and only after the start', () => {
    const t = new MissionTracker();
    t.start(byId('sk-race'));
    expect(t.started).toBe(false);
    t.onRaceFinish(false);
    expect(t.active!.failed).toBe(true);
    const w = new MissionTracker();
    w.start(byId('sk-race'));
    w.onRaceFinish(true);
    expect(w.active!.done).toBe(true);
  });

  it('boost missions accumulate seconds in the district', () => {
    const t = new MissionTracker();
    t.start(byId('w-colosseum'));
    for (let i = 0; i < 100; i++) t.onBoost(1, 1 / 60);
    expect(t.active!.done).toBe(false);
    for (let i = 0; i < 100; i++) t.onBoost(1, 1 / 60);
    expect(t.active!.done).toBe(true);
    expect(t.statusText()).toContain('complete');
  });
});

describe('Profile', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it('starts with free items owned and some ink', () => {
    const p = new Profile();
    expect(p.data.ink).toBeGreaterThan(0);
    expect(p.owns('vehicle:rover')).toBe(true);
    expect(p.owns('vehicle:van')).toBe(false);
  });

  it('buys items once, refuses when poor, and persists', () => {
    const p = new Profile();
    const cap = CATALOGUE.find((i) => i.id === 'hat:cap')!;
    const van = CATALOGUE.find((i) => i.id === 'vehicle:van')!;
    expect(p.buy(cap)).toBe('ok');
    expect(p.buy(cap)).toBe('owned');
    expect(p.buy(van)).toBe('poor');
    const again = new Profile();
    expect(again.owns('hat:cap')).toBe(true);
  });

  it('stacks tonics up to the limit and uses them', () => {
    const p = new Profile();
    p.data.ink = 1000;
    const magnet = CATALOGUE.find((i) => i.id === 'tonic:magnet')!;
    while (p.data.tonics.magnet < MAX_TONICS) expect(p.buy(magnet)).toBe('ok');
    expect(p.buy(magnet)).toBe('full');
    expect(p.useTonic('magnet')).toBe(true);
    expect(p.data.tonics.magnet).toBe(MAX_TONICS - 1);
  });

  it('records each sealed phrase once', () => {
    const p = new Profile();
    expect(p.markSealed('sketch', 3)).toBe(true);
    expect(p.markSealed('sketch', 3)).toBe(false);
    expect(p.totalSealed()).toBe(1);
  });
});
