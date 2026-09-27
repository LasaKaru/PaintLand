import { describe, expect, it } from 'vitest';
import { STORY_PAGES, findColour, nextPage, storyState } from '../src/gameplay/Story';
import { CHAPTERS } from '../src/world/Chapters';

describe('story mode: The Lost Palette', () => {
  it('hides one colour in every chapter', () => {
    expect(STORY_PAGES.map((p) => p.chapter).sort()).toEqual(CHAPTERS.map((c) => c.id).sort());
    expect(new Set(STORY_PAGES.map((p) => p.hex)).size).toBe(8);
  });

  it('finds colours only once the story has begun, once each, and ends after eight', () => {
    const s = storyState({});
    expect(findColour(s, 'sketch')).toBeNull();
    s.started = true;
    expect(nextPage(s)?.chapter).toBe('sketch');
    expect(findColour(s, 'serendib')?.page.colour).toBe('Lotus Pink');
    expect(findColour(s, 'serendib')).toBeNull();
    expect(findColour(s, 'custom')).toBeNull();
    expect(nextPage(s)?.chapter).toBe('sketch');
    let last = null;
    for (const p of STORY_PAGES) last = findColour(s, p.chapter) ?? last;
    expect(last?.done).toBe(true);
    expect(nextPage(s)).toBeNull();
  });
});
