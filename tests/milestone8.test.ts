import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CITY_DISTRICTS, districtAt, districtProgress, RESTORE_SHARE, type Stroke } from '../src/gameplay/Restoration';
import { CHALLENGES, bumpStreak, challengeProgress, ensureDaily, pickDaily, previousDay } from '../src/gameplay/Challenges';
import { PHOTO_SUBJECTS, subjectsInFrame } from '../src/gameplay/PhotoHunt';
import { filterChat, isRude } from '../src/net/ChatFilter';

describe('Colour the City', () => {
  it('districts cover the whole city without gaps', () => {
    for (let x = -640; x <= 640; x += 20) for (let z = -600; z <= 548; z += 20) expect(districtAt(CITY_DISTRICTS, x, z), `${x},${z}`).not.toBeNull();
  });

  it('a district is restored once enough of its strokes are done', () => {
    const strokes: Stroke[] = [
      { tag: 'secret:a', x: 200, z: -100 },
      { tag: 'secret:b', x: 210, z: -120 },
      { tag: 'stunt:c', x: 250, z: -300 },
      { tag: 'cm:d', x: 300, z: 0 },
      { tag: 'secret:e', x: -100, z: -100 }, // downtown, not Pettah
    ];
    const pettah = (seen: string[]) => districtProgress(CITY_DISTRICTS, strokes, seen).find((p) => p.district.id === 'oldtown')!;
    expect(pettah([]).paint).toBe(0);
    expect(pettah([]).total).toBe(4);
    expect(pettah([]).need).toBe(Math.ceil(4 * RESTORE_SHARE));
    expect(pettah(['secret:a']).paint).toBeCloseTo(1 / 3);
    expect(pettah(['secret:a', 'secret:e']).done).toBe(1);
    const done = pettah(['secret:a', 'secret:b', 'cm:d']);
    expect(done.restored).toBe(true);
    expect(done.paint).toBe(1);
  });
});

describe('Daily brushstrokes', () => {
  it('picks three challenges on different stats, the same for everyone on a day', () => {
    for (const day of ['2026-9-25', '2026-9-26', '2027-1-1']) {
      const a = pickDaily(day);
      expect(a).toHaveLength(3);
      expect(new Set(a.map((c) => c.stat)).size).toBe(3);
      expect(pickDaily(day).map((c) => c.id)).toEqual(a.map((c) => c.id));
    }
    // Different days usually differ.
    const days = Array.from({ length: 10 }, (_, i) => pickDaily(`2026-10-${i + 1}`).map((c) => c.id).join());
    expect(new Set(days).size).toBeGreaterThan(5);
  });

  it('counts progress from the start of the day, capped at the goal', () => {
    const stats: Record<string, number> = { distance: 12000, miniTurbos: 3 };
    const stat = (k: string) => stats[k] ?? 0;
    const state = ensureDaily(null, '2026-9-25', stat);
    const c = CHALLENGES.find((q) => q.id === state.ids[0])!;
    expect(challengeProgress(c, state, stat)).toBe(0);
    stats[c.stat] = (stats[c.stat] ?? 0) + c.amount * 3;
    expect(challengeProgress(c, state, stat)).toBe(c.amount);
    // Same day keeps the state; a new day resets it.
    expect(ensureDaily(state, '2026-9-25', stat)).toBe(state);
    expect(ensureDaily(state, '2026-9-26', stat).day).toBe('2026-9-26');
  });

  it('streaks grow on consecutive days and restart after a gap', () => {
    expect(previousDay('2026-10-1')).toBe('2026-9-30');
    expect(previousDay('2027-1-1')).toBe('2026-12-31');
    let s = { last: '', count: 0 };
    s = bumpStreak(s, '2026-9-25');
    expect(s.count).toBe(1);
    s = bumpStreak(s, '2026-9-25');
    expect(s.count).toBe(1);
    s = bumpStreak(s, '2026-9-26');
    expect(s.count).toBe(2);
    s = bumpStreak(s, '2026-9-28');
    expect(s.count).toBe(1);
  });
});

describe('Photo Hunt', () => {
  it('counts a sight in the middle of the frame and in range, not one behind or off to the side', () => {
    const cam = new THREE.PerspectiveCamera(60, 1.5, 0.5, 5000);
    const s = PHOTO_SUBJECTS.find((q) => q.id === 'elephants')!;
    cam.position.set(s.x, 2 + 3, s.z + 30);
    cam.lookAt(s.x, 2 + s.y, s.z);
    cam.updateMatrixWorld();
    expect(subjectsInFrame(cam, 'city', 2).map((q) => q.id)).toContain('elephants');
    // Turn around.
    cam.lookAt(s.x, 5, s.z + 100);
    cam.updateMatrixWorld();
    expect(subjectsInFrame(cam, 'city', 2).map((q) => q.id)).not.toContain('elephants');
    // Too far away.
    cam.position.set(s.x, 5, s.z + s.range + 50);
    cam.lookAt(s.x, 2 + s.y, s.z);
    cam.updateMatrixWorld();
    expect(subjectsInFrame(cam, 'city', 2).map((q) => q.id)).not.toContain('elephants');
    // Wrong area.
    expect(subjectsInFrame(cam, 'harbour', 2).map((q) => q.id)).not.toContain('elephants');
  });
});

describe('Chat filter', () => {
  it('masks rude words, including spaced-out spellings with swaps and repeats', () => {
    expect(isRude('Fuuuck')).toBe(true);
    expect(isRude('sh1t')).toBe(true);
    expect(filterChat('you are an idiot!')).toBe('you are an i••••!');
    expect(filterChat('what a b!tch move')).not.toContain('b!tch');
  });

  it('leaves ordinary words alone in many languages', () => {
    for (const line of ['computation is fun', 'Scunthorpe? no: Serendib', 'grass classic assessment', 'すごい! 塞伦迪布 ආයුබෝවන්', 'Tschüss, bis morgen', 'dickens novel']) {
      const clean = line.includes('Scunthorpe') ? line.replace('Scunthorpe', 'Brighton') : line;
      expect(filterChat(clean)).toBe(clean);
    }
  });
});
