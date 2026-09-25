import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GhostPlayer, GhostRecorder, loadGhost, saveGhost } from '../src/gameplay/Ghost';
import { TROPHIES, checkTrophies } from '../src/gameplay/Trophies';
import { Profile } from '../src/gameplay/Profile';
import { ART_STYLES, DEFAULT_STUDIO, QUALITY_KEYS, QUALITY_PRESETS, applyArtStyle, applyQuality } from '../src/render/StudioSettings';
import { DEFAULT_OPTIONS, displaySpeed, loadOptions, saveOptions } from '../src/core/Options';
import { WEATHERS, WEATHER_ORDER } from '../src/world/Environment';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('Ghosts', () => {
  it('records at 20 Hz and replays with interpolation', () => {
    const rec = new GhostRecorder();
    for (let t = 0; t <= 10; t += 1 / 60) rec.record(t, t * 30, Math.sin(t), 0, 0);
    expect(rec.length).toBeGreaterThan(195);
    expect(rec.length).toBeLessThan(205);
    const player = new GhostPlayer(rec.finish('sketch', 'rover', 10));
    const a = player.at(5.025)!;
    expect(a.s).toBeCloseTo(150.75, 0);
    expect(player.at(20)).toBeNull();
    // Rewinding works (new lap).
    expect(player.at(0.1)!.s).toBeCloseTo(3, 0);
  });

  it('saves and loads the best run per chapter', () => {
    const rec = new GhostRecorder();
    for (let t = 0; t <= 3; t += 1 / 60) rec.record(t, t * 10, 0, 0, 0);
    saveGhost(rec.finish('wonders', 'buggy', 3));
    const run = loadGhost('wonders')!;
    expect(run.vehicle).toBe('buggy');
    expect(run.time).toBe(3);
    expect(loadGhost('sketch')).toBeNull();
  });
});

describe('Trophies', () => {
  it('have unique ids and valid targets', () => {
    const ids = new Set(TROPHIES.map((t) => t.id));
    expect(ids.size).toBe(TROPHIES.length);
    const p = new Profile();
    for (const t of TROPHIES) {
      const [a, b] = t.progress(p);
      expect(b).toBeGreaterThan(0);
      expect(a).toBeGreaterThanOrEqual(0);
    }
  });

  it('unlock once from stats and pay their reward', () => {
    const p = new Profile();
    const ink = p.data.ink;
    expect(checkTrophies(p).length).toBe(0);
    p.addStat('laps');
    p.recordStat('maxAir', 2.4);
    const fresh = checkTrophies(p).map((t) => t.id);
    expect(fresh).toContain('first-lap');
    expect(fresh).toContain('air-2');
    expect(p.data.ink).toBeGreaterThan(ink);
    expect(checkTrophies(p).length).toBe(0);
  });

  it('explorer trophies count distinct things seen', () => {
    const p = new Profile();
    for (const w of WEATHER_ORDER) p.markSeen(`weather:${w}`);
    expect(p.markSeen('weather:rain')).toBe(false);
    expect(checkTrophies(p).map((t) => t.id)).toContain('weather-5');
  });
});

describe('Graphics tiers and art styles', () => {
  it('every tier sets every quality key, and tiers get more expensive', () => {
    for (const tier of Object.values(QUALITY_PRESETS)) for (const k of QUALITY_KEYS) expect(tier[k]).not.toBeUndefined();
    const order = ['low', 'medium', 'high', 'ultra'] as const;
    for (let i = 1; i < order.length; i++) {
      const a = QUALITY_PRESETS[order[i - 1]];
      const b = QUALITY_PRESETS[order[i]];
      expect(b.shadowQuality!).toBeGreaterThanOrEqual(a.shadowQuality!);
      expect(b.drawDistance!).toBeGreaterThanOrEqual(a.drawDistance!);
      expect(b.aoQuality!).toBeGreaterThanOrEqual(a.aoQuality!);
    }
  });

  it('applies tiers and art styles', () => {
    const s = { ...DEFAULT_STUDIO };
    applyQuality(s, 'low');
    expect(s.quality).toBe('low');
    expect(s.aoQuality).toBe(0);
    applyQuality(s, 'custom');
    expect(s.aoQuality).toBe(0);
    applyArtStyle(s, 'realistic');
    expect(s.realism).toBe(1);
    expect(s.inkStrength).toBe(0);
    applyArtStyle(s, 'watercolour');
    expect(s.realism).toBe(0);
    expect(ART_STYLES.illustrated.realism).toBeGreaterThan(0);
  });
});

describe('Options and weather', () => {
  it('round-trips options and converts units', () => {
    const o = loadOptions();
    expect(o).toEqual(DEFAULT_OPTIONS);
    o.handling = 'realistic';
    o.units = 'mph';
    saveOptions(o);
    expect(loadOptions().handling).toBe('realistic');
    expect(displaySpeed(100, 'mph')).toBeCloseTo(62.1, 1);
    expect(displaySpeed(100, 'kmh')).toBe(100);
  });

  it('weathers get wetter and murkier in order', () => {
    expect(WEATHER_ORDER).toEqual(['clear', 'cloudy', 'fog', 'rain', 'storm']);
    expect(WEATHERS.fog.fog).toBeGreaterThan(WEATHERS.clear.fog);
    expect(WEATHERS.storm.storm).toBe(true);
    expect(WEATHERS.clear.rain).toBe(0);
  });
});
