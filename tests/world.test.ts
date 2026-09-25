import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../src/world/Chapters';
import { Decorator } from '../src/world/Decorator';
import { Collectibles } from '../src/gameplay/Collectibles';
import { MISSIONS, missionsFor } from '../src/gameplay/Missions';
import { CATALOGUE } from '../src/gameplay/Profile';

describe.each(CHAPTERS.map((c) => [c.name, c] as const))('%s world', (_name, chapter) => {
  const path = chapter.buildRoute();

  it('dresses every district without errors and records landmarks', () => {
    const d = new Decorator(path, chapter);
    d.build();
    expect(d.group.children.length).toBeGreaterThan(20);
    expect(d.landmarks.length).toBeGreaterThanOrEqual(3);
    for (const lm of d.landmarks) expect(Number.isFinite(lm.position.x + lm.position.y + lm.position.z)).toBe(true);
  });

  it('places notes and pickups', () => {
    const items = new Collectibles(path, chapter.districts);
    expect(items.notes.length).toBe(chapter.districts.reduce((n, d) => n + d.melody.length, 0));
  });

  it('has missions whose givers stand in real districts', () => {
    const missions = missionsFor(chapter.id);
    expect(missions.length).toBeGreaterThanOrEqual(6);
    for (const m of missions) {
      expect(m.giver.district).toBeLessThan(chapter.districts.length);
      if (m.district !== undefined) expect(m.district).toBeLessThan(chapter.districts.length);
    }
  });
});

describe('Missions and shop', () => {
  it('every mission reward item exists in the catalogue', () => {
    for (const m of MISSIONS) if (m.reward.item) expect(CATALOGUE.some((i) => i.id === m.reward.item)).toBe(true);
  });

  it('mission ids are unique', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
  });
});
