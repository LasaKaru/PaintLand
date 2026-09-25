/**
 * Chapter 1 · "The Sketch" — district data (docs/04 §3).
 * Everything a district needs lives here as data: titles, music, palette and
 * the dressing style the decorator uses.
 */

export type DressStyle = 'town' | 'tower' | 'ceiling' | 'arches' | 'chute' | 'bridge' | 'loop' | 'gate';
export type ScaleName = 'major' | 'minor';

export interface DistrictDef {
  id: string;
  name: string;
  /** Small line above the title (a nod to the sketchbook's margin notes). */
  kicker: string;
  poem: string;
  style: DressStyle;
  /** MIDI note of the key's tonic (the melody's degree 0). */
  root: number;
  scale: ScaleName;
  bpm: number;
  /** Wall colours for houses in this district. */
  walls: string[];
  /** Melody as scale degrees (0 = tonic, 7 = octave). 32 steps = 4 phrases. */
  melody: number[];
}

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

/** MIDI note for a scale degree (can exceed one octave). */
export function degreeToMidi(def: DistrictDef, degree: number): number {
  const scale = SCALES[def.scale];
  const octave = Math.floor(degree / 7);
  const idx = ((degree % 7) + 7) % 7;
  return def.root + octave * 12 + scale[idx];
}

export const PHRASE_LENGTH = 8;

export const DISTRICTS: DistrictDef[] = [
  {
    id: 'biscuit-row',
    name: 'Biscuit Row',
    kicker: 'chapter one · the sketch',
    poem: 'Warm bread, slow trams, a street that wants to fly',
    style: 'town',
    root: 60,
    scale: 'major',
    bpm: 90,
    walls: ['#F2C6B4', '#F4E1A6', '#BFD9E8', '#E9B8C8', '#F6EEDC', '#C9E0B8', '#EFD0A2'],
    melody: [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 1, 4, 0, 2, 4, 7, 5, 4, 2, 4, 3, 1, 4, 2, 1, 2, 0, 0],
  },
  {
    id: 'mustard-tower',
    name: 'Mustard Tower',
    kicker: 'up the yellow wall',
    poem: 'Windows for stepping stones, laundry for flags',
    style: 'tower',
    root: 55,
    scale: 'major',
    bpm: 96,
    walls: ['#EBC45A', '#E3B34A', '#F0D27A'],
    melody: [0, 4, 7, 4, 2, 4, 5, 4, 0, 4, 7, 9, 8, 7, 5, 4, 2, 4, 5, 7, 5, 4, 2, 1, 0, 2, 4, 2, 1, 2, 0, 0],
  },
  {
    id: 'topsy-terrace',
    name: 'Topsy Terrace',
    kicker: 'where the ceiling is the street',
    poem: 'Hang on to your hat — it is the sky that falls',
    style: 'ceiling',
    root: 64,
    scale: 'minor',
    bpm: 100,
    walls: ['#BFC4EA', '#C9E4E0', '#F1D3C7', '#DCD0EE', '#F6EEDC'],
    melody: [0, 2, 4, 2, 0, -1, 0, 2, 4, 5, 4, 2, 4, 7, 6, 4, 5, 4, 2, 4, 2, 0, 1, 2, 4, 2, 0, -1, -3, -1, 0, 0],
  },
  {
    id: 'petal-twist',
    name: 'Petal Twist',
    kicker: 'a corkscrew of bougainvillea',
    poem: 'Round and round beneath a pink umbrella',
    style: 'arches',
    root: 62,
    scale: 'major',
    bpm: 104,
    walls: ['#F4D6E4', '#F6EEDC'],
    melody: [0, 2, 4, 5, 4, 2, 4, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 5, 7, 4, 2, 1, 2, 4, 5, 4, 2, 1, 0, 1, 0],
  },
  {
    id: 'the-inkfall',
    name: 'The Inkfall',
    kicker: 'hold on to the melody',
    poem: 'Down the chute where the paint runs fastest',
    style: 'chute',
    root: 57,
    scale: 'minor',
    bpm: 110,
    walls: ['#BFE6E2'],
    melody: [7, 6, 4, 6, 7, 4, 2, 4, 5, 4, 2, 0, 2, 4, 2, 1, 0, 2, 4, 5, 7, 9, 7, 6, 4, 2, 4, 6, 7, 4, 0, 0],
  },
  {
    id: 'citrus-coil',
    name: 'Citrus Coil',
    kicker: 'a spiral over the painted sea',
    poem: 'Round and round the lighthouse, lemon light on the water',
    style: 'bridge',
    root: 65,
    scale: 'major',
    bpm: 92,
    walls: ['#F4E1A6', '#F2C6B4', '#F6EEDC'],
    melody: [4, 2, 0, 2, 4, 4, 4, 4, 2, 2, 2, 4, 7, 7, 4, 2, 0, 2, 4, 4, 4, 4, 2, 2, 4, 2, 0, 2, 4, 5, 4, 0],
  },
  {
    id: 'doorway-loop',
    name: 'Doorway Loop',
    kicker: 'every door opens onto the sky',
    poem: 'Knock twice, the road will turn you over',
    style: 'loop',
    root: 58,
    scale: 'major',
    bpm: 98,
    walls: ['#BFD9E8', '#F6EEDC'],
    melody: [0, 4, 2, 5, 4, 7, 5, 9, 7, 5, 4, 2, 4, 2, 1, 0, 2, 5, 4, 7, 5, 9, 7, 11, 9, 7, 5, 4, 2, 1, 0, 0],
  },
  {
    id: 'ribbon-gate',
    name: 'Ribbon Gate',
    kicker: 'the way back to the page',
    poem: 'Tie a bow in the road and follow it home',
    style: 'gate',
    root: 60,
    scale: 'major',
    bpm: 100,
    walls: ['#F2C6B4', '#F4E1A6', '#BFD9E8'],
    melody: [0, 2, 4, 5, 7, 5, 4, 2, 4, 5, 7, 9, 7, 5, 4, 7, 9, 7, 5, 4, 5, 4, 2, 1, 0, 4, 7, 4, 5, 2, 0, 0],
  },
];

/** Colour of a note by pitch class (docs/06 §2): C yellow, D pink, E blue, F orange, G green, A purple, B teal. */
export const NOTE_COLOURS: Record<number, string> = {
  0: '#F4D23B',
  1: '#F4D23B',
  2: '#E8559A',
  3: '#E8559A',
  4: '#3E6FE0',
  5: '#F08A2E',
  6: '#F08A2E',
  7: '#5DBB3F',
  8: '#5DBB3F',
  9: '#9A5BD6',
  10: '#9A5BD6',
  11: '#2FB7B0',
};
