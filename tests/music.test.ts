import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cleanSoundtrack } from '../src/audio/AudioEngine';

describe('recorded soundtrack', () => {
  it('keeps only credited tracks stored inside music/', () => {
    const ok = { title: 'Harbour Morning', artist: 'A', license: 'CC BY 4.0', file: 'music/harbour-morning.webm', seconds: 60 };
    expect(cleanSoundtrack({ tracks: [ok] })).toEqual([ok]);
    for (const file of ['https://evil.example/x.mp3', 'music/../secret.webm', '/music/a.webm', 'music/a.exe', 'music/A B.webm'])
      expect(cleanSoundtrack({ tracks: [{ ...ok, file }] }), file).toEqual([]);
    expect(cleanSoundtrack({ tracks: [{ ...ok, license: '' }] })).toEqual([]);
    expect(cleanSoundtrack({ tracks: [{ ...ok, title: '<b>Hi</b>' }] })[0].title).toBe('bHi/b');
    expect(cleanSoundtrack(null)).toEqual([]);
  });

  it('ships a valid manifest with a licence for every track', () => {
    const m = JSON.parse(readFileSync(new URL('../public/music/manifest.json', import.meta.url), 'utf8'));
    const tracks = cleanSoundtrack(m);
    expect(tracks.length).toBe(m.tracks.length);
    expect(tracks.length).toBeGreaterThan(0);
    for (const t of tracks) readFileSync(new URL(`../public/${t.file}`, import.meta.url));
  });
});
