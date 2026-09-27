import { describe, expect, it } from 'vitest';
import { CAMPAIGN, endingDue, finaleReady, missionNumber, nextStep, progress, stepState } from '../src/gameplay/Campaign';
import { STORY_PAGES, type StoryState } from '../src/gameplay/Story';
import { checkCheckpoint } from '../src/gameplay/Checkpoint';
import { CHAPTERS } from '../src/world/Chapters';

describe('the campaign: prologue, eight missions, finale', () => {
  it('is ten steps from the storm to the last page, every chapter once', () => {
    expect(CAMPAIGN).toHaveLength(10);
    expect(CAMPAIGN[0].kind).toBe('meet');
    expect(CAMPAIGN[9].kind).toBe('finale');
    const chapters = CAMPAIGN.filter((s) => s.kind === 'chapter').map((s) => s.chapter);
    expect(new Set(chapters).size).toBe(8);
    for (const c of chapters) expect(CHAPTERS.some((ch) => ch.id === c), c).toBe(true);
    expect([1, 2, 8].map(missionNumber)).toEqual([1, 2, 8]);
    expect(missionNumber(0)).toBeNull();
    expect(missionNumber(9)).toBeNull();
  });

  it('unlocks as you play: prologue first, colours in any order, the finale last', () => {
    const s: StoryState = { started: false, found: [] };
    expect(nextStep(s)).toBe(0);
    expect(stepState(s, 0)).toBe('next');
    expect(stepState(s, 1)).toBe('locked');
    expect(stepState(s, 9)).toBe('locked');
    s.started = true;
    expect(stepState(s, 0)).toBe('done');
    expect(stepState(s, 1)).toBe('next');
    expect(stepState(s, 5)).toBe('open');
    s.found.push(STORY_PAGES[4].chapter);
    expect(stepState(s, 5)).toBe('done');
    expect(nextStep(s)).toBe(1);
    expect(finaleReady(s)).toBe(false);
    for (const p of STORY_PAGES) if (!s.found.includes(p.chapter)) s.found.push(p.chapter);
    expect(finaleReady(s)).toBe(true);
    expect(stepState(s, 9)).toBe('next');
    expect(progress(s)).toBeCloseTo(0.9);
    s.finale = true;
    expect(nextStep(s)).toBe(CAMPAIGN.length);
    expect(progress(s)).toBe(1);
    expect(finaleReady(s)).toBe(false);
    // An ending the player walked away from plays again, until the credits were seen.
    expect(endingDue(s)).toBe(true);
    s.credits = true;
    expect(endingDue(s)).toBe(false);
  });

  it('only trusts checkpoints that make sense', () => {
    expect(checkCheckpoint({ kind: 'chapter', chapter: 'sketch', district: 3, label: 'The Sketch · Mustard Tower', at: 1 })).toMatchObject({ district: 3 });
    expect(checkCheckpoint({ kind: 'area', area: 'worldsend', x: 1, z: 2, heading: 0.5, foot: true, label: 'x', at: 1 })).toMatchObject({ foot: true });
    expect(checkCheckpoint({ kind: 'chapter', chapter: '../evil', district: 1 })).toBeNull();
    expect(checkCheckpoint({ kind: 'chapter', chapter: 'sketch', district: -1 })).toBeNull();
    expect(checkCheckpoint({ kind: 'area', area: 'hub', x: NaN, z: 0, heading: 0 })).toBeNull();
    expect(checkCheckpoint({ kind: 'area', area: 'hub', x: 1e9, z: 0, heading: 0 })).toBeNull();
    expect(checkCheckpoint(null)).toBeNull();
    expect(checkCheckpoint('sketch')).toBeNull();
  });
});
