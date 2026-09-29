/**
 * District data types (docs/04 §3). Everything a district needs lives in data:
 * titles, music, palette and the dressing style the decorator uses.
 * The districts themselves live with their chapter in `chapters/`.
 */

export type DressStyle =
  // Chapter 1 · The Sketch
  | 'town' | 'tower' | 'ceiling' | 'arches' | 'chute' | 'bridge' | 'loop' | 'gate'
  // Chapter 2 · Serendib (Sri Lanka)
  | 'galleface' | 'lotus' | 'sigiriya' | 'tea' | 'ninearch' | 'beach'
  // Chapter 3 · Wonders of the Sketchbook
  | 'greatwall' | 'colosseum' | 'taj' | 'machupicchu' | 'redeemer' | 'chichen' | 'petra'
  // Chapter 4 · Lantern Roads
  | 'torii' | 'bamboo' | 'halong' | 'lanterntown' | 'himalaya' | 'greatwave' | 'fuji'
  // Chapter 5 · Postcards
  | 'nile' | 'santorini' | 'kyoto' | 'kandy' | 'ella'
  // Chapter 6 · City Lights
  | 'paris' | 'london' | 'venice' | 'amsterdam' | 'barcelona' | 'istanbul' | 'dubai'
  // Chapter 7 · Skylines
  | 'newyork' | 'sanfrancisco' | 'rio' | 'tokyo' | 'singapore' | 'sydney'
  // Chapter 8 · Island Road Trip
  | 'colombo' | 'kandyday' | 'nuwaraeliya' | 'ellaroad' | 'yala' | 'galle'
  // Grand Tour · Great Britain
  | 'edinburgh' | 'highlands' | 'lakes' | 'york' | 'cotswolds' | 'bath' | 'stonehenge' | 'cornwall' | 'wales' | 'brighton'
  | 'asakusa' | 'fuji' | 'shirakawa' | 'kinkakuji' | 'nara' | 'osaka' | 'himeji' | 'miyajima' | 'beppu' | 'okinawa';
/**
 * Seven-note scales only: the band builds chords by stacking thirds. Regional
 * colour comes from the mode plus melodies that lean on its pentatonic notes.
 */
export type ScaleName = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian' | 'lydian' | 'harmonicMinor' | 'bhairav';

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
  /** Time of day this district is always seen at (e.g. Kyoto by night). */
  preset?: string;
  /** Weather this district always has (e.g. Kandy in the rain). */
  weather?: 'clear' | 'cloudy' | 'fog' | 'rain' | 'storm';
}

export const SCALES: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  /** Celtic reels and Irish/Scottish airs. */
  dorian: [0, 2, 3, 5, 7, 9, 10],
  /** Bagpipes, sea shanties. */
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  /** Japanese "in" colour (with the 1st, 4th and 5th leaned on), flamenco. */
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  /** Bright, floating: open skies, mountains. */
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  /** Raga Bhairav (morning raga, Indian classical). */
  bhairav: [0, 1, 4, 5, 7, 8, 11],
};

/** MIDI note for a scale degree (can exceed one octave). */
export function degreeToMidi(def: DistrictDef, degree: number): number {
  const scale = SCALES[def.scale];
  const octave = Math.floor(degree / 7);
  const idx = ((degree % 7) + 7) % 7;
  return def.root + octave * 12 + scale[idx];
}

export const PHRASE_LENGTH = 8;

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
