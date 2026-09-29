import { describe, expect, it } from 'vitest';
import { BOOK1, CHAPTERS, GRAND_TOUR } from '../src/world/Chapters';
import { Decorator } from '../src/world/Decorator';
import { MissionTracker, missionsFor } from '../src/gameplay/Missions';
import { checkCheckpoint } from '../src/gameplay/Checkpoint';
import { TOUR_STAMPS, passport, stampPassport } from '../src/gameplay/GrandTour';
import type { ProfileData } from '../src/gameplay/Profile';
import { DRESSERS, DRESSER_GROUPS } from '../src/world/dress';
import { SCALES } from '../src/world/Districts';

describe('Book 2 · the Grand Tour', () => {
  it('keeps Book 1 as the eight story chapters and puts the tour after it', () => {
    expect(BOOK1().length).toBe(8);
    expect(GRAND_TOUR().length).toBeGreaterThanOrEqual(1);
    expect(BOOK1().length + GRAND_TOUR().length).toBe(CHAPTERS.length);
    for (const c of GRAND_TOUR()) {
      expect(c.flag, c.id).toBeTruthy();
      expect(TOUR_STAMPS.some((s) => s.chapter === c.id), c.id).toBe(true);
    }
  });

  it('never reuses a style name across chapters (a clash would silently swap dressers)', () => {
    const seen = new Map<string, string>();
    for (const [group, table] of Object.entries(DRESSER_GROUPS)) {
      for (const style of Object.keys(table)) {
        expect(seen.get(style), `${style} is in both ${seen.get(style)} and ${group}`).toBeUndefined();
        seen.set(style, group);
      }
    }
    const ids = CHAPTERS.flatMap((c) => c.districts.map((d) => d.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GRAND_TOUR().map((c) => [c.name, c] as const))('%s is a long trip: 10 districts, 8–12 km, long tunes', (_n, c) => {
    const path = c.buildRoute();
    expect(c.districts.length).toBe(10);
    expect(path.length).toBeGreaterThan(8000);
    expect(path.length).toBeLessThan(12000);
    for (let i = 0; i < c.districts.length; i++) {
      const span = path.spanOf(i);
      expect(span, `${c.id} district ${i}`).toBeTruthy();
      // Every district is a real stretch of road (at least ~40 s at cruise).
      expect(span!.end - span!.start, `${c.id} district ${i}`).toBeGreaterThan(600);
    }
    for (const d of c.districts) {
      expect(d.melody.length).toBe(48);
      expect(DRESSERS[d.style], d.style).toBeTypeOf('function');
      expect(SCALES[d.scale].length).toBe(7);
    }
  });

  it.each(GRAND_TOUR().map((c) => [c.name, c] as const))('%s dresses the whole route, not just the middle', (_n, c) => {
    const path = c.buildRoute();
    const d = new Decorator(path, c);
    d.build();
    // Every district gets at least one named landmark.
    for (let i = 0; i < c.districts.length; i++) expect(d.landmarks.some((l) => l.district === i), `${c.id} district ${i}`).toBe(true);
    // Long routes are split into culling cells rather than one huge mesh per model.
    let meshes = 0;
    d.group.traverse((o) => {
      if ((o as { isInstancedMesh?: boolean }).isInstancedMesh) meshes++;
    });
    expect(meshes).toBeGreaterThan(40);
  });

  it.each(GRAND_TOUR().map((c) => [c.name, c] as const))('%s has a journey mission that calls across the map', (_n, c) => {
    const journeys = missionsFor(c.id).filter((m) => m.kind === 'journey');
    expect(journeys.length).toBeGreaterThanOrEqual(1);
    for (const j of journeys) {
      const stops = j.stops!;
      expect(stops.length).toBeGreaterThanOrEqual(3);
      // In road order, and spread over most of the chapter.
      for (let i = 1; i < stops.length; i++) expect(stops[i]).toBeGreaterThan(stops[i - 1]);
      expect(stops[stops.length - 1] - (j.giver.district)).toBeGreaterThanOrEqual(6);
      expect(stops[stops.length - 1]).toBeLessThan(c.districts.length);
    }
  });
});

describe('journey missions', () => {
  const journey = missionsFor('britain').find((m) => m.kind === 'journey')!;

  it('calls at each stop in order, ignoring other districts', () => {
    const t = new MissionTracker();
    t.start(journey);
    expect(t.active!.goal).toBe(journey.stops!.length);
    expect(t.nextStop()).toBe(journey.stops![0]);
    t.onEnterDistrict(journey.stops![1]); // too early: not the next stop
    expect(t.active!.progress).toBe(0);
    for (const s of journey.stops!) {
      expect(t.nextStop()).toBe(s);
      t.onEnterDistrict(s - 1);
      t.onEnterDistrict(s);
    }
    expect(t.active!.done).toBe(true);
    expect(t.nextStop()).toBeNull();
  });

  it('shows the next stop and how far it is', () => {
    const t = new MissionTracker();
    t.stopName = (d) => `District ${d}`;
    t.start(journey);
    t.stopDistance = 2400;
    expect(t.statusText()).toContain(`District ${journey.stops![0]}`);
    expect(t.statusText()).toContain('2.4');
  });

  it('resumes a saved journey but never as already finished', () => {
    const t = new MissionTracker();
    t.resume(journey, 2);
    expect(t.active!.progress).toBe(2);
    expect(t.nextStop()).toBe(journey.stops![2]);
    t.resume(journey, 99);
    expect(t.active!.done).toBe(false);
    expect(t.active!.progress).toBe(journey.stops!.length - 1);
  });
});

describe('mid-lap checkpoints', () => {
  it('keeps the road position and an active journey', () => {
    const cp = checkCheckpoint({ kind: 'chapter', chapter: 'britain', district: 4, label: 'x', at: 1, s: 4321.5, mission: { id: 'gb-mail', progress: 1 } });
    expect(cp).toMatchObject({ s: 4321.5, mission: { id: 'gb-mail', progress: 1 } });
  });

  it('drops bad positions and missions', () => {
    const cp = checkCheckpoint({ kind: 'chapter', chapter: 'britain', district: 4, label: 'x', at: 1, s: -5, mission: { id: '<script>', progress: 1.5 } });
    expect(cp?.kind).toBe('chapter');
    if (cp?.kind !== 'chapter') return;
    expect(cp.s).toBeUndefined();
    expect(cp.mission).toBeUndefined();
    const far = checkCheckpoint({ kind: 'chapter', chapter: 'britain', district: 1, label: '', at: 1, s: 1e9 });
    expect(far?.kind === 'chapter' && far.s).toBeFalsy();
  });
});

describe('passport stamps', () => {
  it('stamps each country once', () => {
    const data = {} as ProfileData;
    expect(stampPassport(data, 'sketch')).toBeNull();
    expect(stampPassport(data, 'britain')?.country).toBe('Great Britain');
    expect(stampPassport(data, 'britain')).toBeNull();
    const p = passport(data);
    expect(p.got.map((s) => s.chapter)).toEqual(['britain']);
    expect(p.total).toBe(TOUR_STAMPS.length);
  });
});
