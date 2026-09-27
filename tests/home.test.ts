import { describe, expect, it } from 'vitest';
import { DEFAULT_HOME, foundKeepsakes, homeForServer, shownKeepsakes, toggleKeepsake, trophyCups } from '../src/gameplay/Home';
import { HomePlot, buildHome, homeToWorld, HOME_SPOT } from '../src/world/HomePlot';
import { cleanHome } from '../server/mail.mjs';

describe('your home', () => {
  const seen = ['pocket:h-cats', 'pocket:c-cats', 'pocket:v-books', 'district:paris'];

  it('gets one keepsake per kind of pocket found', () => {
    expect(foundKeepsakes([])).toEqual([]);
    expect(foundKeepsakes(seen)).toEqual(['cats', 'books']);
    // Everything found is on show until you choose.
    expect(shownKeepsakes(DEFAULT_HOME, seen)).toEqual(['cats', 'books']);
    const hidden = toggleKeepsake(DEFAULT_HOME, 'cats', seen);
    expect(shownKeepsakes(hidden, seen)).toEqual(['books']);
    expect(shownKeepsakes(toggleKeepsake(hidden, 'cats', seen), seen)).toEqual(['books', 'cats']);
    // A keepsake you don't own never shows, even if a layout lists it.
    expect(shownKeepsakes({ ...DEFAULT_HOME, keepsakes: ['easel', 'books'] }, seen)).toEqual(['books']);
  });

  it('puts a cup on the shelf for every few trophies', () => {
    expect(trophyCups(0)).toBe(0);
    expect(trophyCups(1)).toBe(1);
    expect(trophyCups(45)).toBe(5);
    expect(trophyCups(500)).toBe(12);
  });

  it('sends the server only what it keeps', () => {
    const out = homeForServer({ walls: '#9fd0c8', roof: '#2d6fb7' }, seen, 30);
    expect(cleanHome(out)).toEqual(out);
  });

  it('builds the house, open at the front and walled elsewhere', () => {
    const small = buildHome({ walls: '#ffffff', roof: '#d8463a', keepsakes: [], trophies: 0, owner: 'A' });
    const full = buildHome({ walls: '#ffffff', roof: '#d8463a', keepsakes: ['cats', 'books', 'easel'], trophies: 90, owner: 'A' });
    expect(full.getAttribute('position').count).toBeGreaterThan(small.getAttribute('position').count);
    const walls = HomePlot.walls();
    expect(walls).toHaveLength(3);
    // The house turns to face the avenue: its back wall is on the harbour side.
    const back = homeToWorld(0, -5.5);
    expect(back.z).toBeGreaterThan(HOME_SPOT.z);
  });
});
