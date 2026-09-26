/** Engine sounds and horns you can fit to any vehicle (garage parts). */
export type EngineSound = 'classic' | 'buzzy' | 'rumble' | 'electric' | 'pedal' | 'burner' | 'turbo' | 'tuk' | 'jet';
export type HornSound = 'toot' | 'beep' | 'duck' | 'bell' | 'trumpet' | 'train' | 'conch' | 'melody' | 'honk' | 'chime';

export interface EngineProfile {
  /** Pitch multiplier on the base engine note. */
  pitch: number;
  /** Loudness multiplier. */
  level: number;
  /** Low-pass brightness multiplier. */
  bright: number;
  wave: OscillatorType;
  wave2: OscillatorType;
  /** Share of the sub-octave (weight). */
  sub: number;
  /** Extra hiss (burner roar, bicycle freewheel). */
  hiss: number;
}

export const ENGINE_PROFILES: Record<EngineSound, EngineProfile> = {
  classic: { pitch: 1, level: 1, bright: 1, wave: 'sawtooth', wave2: 'square', sub: 0.6, hiss: 0 },
  buzzy: { pitch: 1.9, level: 0.8, bright: 1.6, wave: 'square', wave2: 'square', sub: 0.2, hiss: 0 },
  rumble: { pitch: 0.62, level: 1.25, bright: 0.8, wave: 'sawtooth', wave2: 'sawtooth', sub: 1, hiss: 0 },
  electric: { pitch: 4.2, level: 0.45, bright: 2.2, wave: 'sine', wave2: 'triangle', sub: 0, hiss: 0 },
  pedal: { pitch: 1, level: 0, bright: 1, wave: 'sine', wave2: 'sine', sub: 0, hiss: 0.35 },
  burner: { pitch: 0.5, level: 0.35, bright: 0.6, wave: 'triangle', wave2: 'sine', sub: 0.4, hiss: 1 },
  turbo: { pitch: 1.3, level: 1.05, bright: 1.9, wave: 'sawtooth', wave2: 'square', sub: 0.5, hiss: 0.25 },
  tuk: { pitch: 2.6, level: 0.7, bright: 1.3, wave: 'square', wave2: 'sawtooth', sub: 0.1, hiss: 0.05 },
  jet: { pitch: 0.8, level: 0.5, bright: 2.6, wave: 'triangle', wave2: 'sawtooth', sub: 0.3, hiss: 0.9 },
};

export interface HornNote {
  /** Semitones above the root. */
  at: number;
  /** Start and length (seconds). */
  t: number;
  len: number;
}

export interface HornProfile {
  wave: OscillatorType;
  notes: HornNote[];
  /** Low-pass cut-off (Hz). */
  cut: number;
  level: number;
  /** Octaves to shift the root by. */
  octave: number;
  /** Pitch bend over each note (semitones, a duck's quack falls). */
  bend: number;
  /** Ring out slowly like a bell. */
  ring: boolean;
}

const chord = (ats: number[], len: number): HornNote[] => ats.map((at) => ({ at, t: 0, len }));

export const HORN_PROFILES: Record<HornSound, HornProfile> = {
  toot: { wave: 'square', notes: chord([0, 4], 0.3), cut: 1400, level: 0.05, octave: 0, bend: 0, ring: false },
  beep: { wave: 'square', notes: [{ at: 7, t: 0, len: 0.1 }, { at: 7, t: 0.16, len: 0.1 }], cut: 2600, level: 0.045, octave: 1, bend: 0, ring: false },
  duck: { wave: 'sawtooth', notes: [{ at: 0, t: 0, len: 0.14 }, { at: 0, t: 0.2, len: 0.18 }], cut: 1100, level: 0.06, octave: 0, bend: -5, ring: false },
  bell: { wave: 'sine', notes: [{ at: 12, t: 0, len: 0.9 }, { at: 19, t: 0, len: 0.6 }, { at: 12, t: 0.22, len: 0.9 }], cut: 6000, level: 0.07, octave: 1, bend: 0, ring: true },
  trumpet: { wave: 'sawtooth', notes: [{ at: 0, t: 0, len: 0.12 }, { at: 4, t: 0.13, len: 0.12 }, { at: 7, t: 0.26, len: 0.12 }, { at: 12, t: 0.39, len: 0.3 }], cut: 2200, level: 0.04, octave: 0, bend: 0, ring: false },
  train: { wave: 'sawtooth', notes: chord([0, 3, 7, 10], 0.9), cut: 900, level: 0.035, octave: -1, bend: 0, ring: false },
  // A conch shell (sakha): one long, low, swelling note.
  conch: { wave: 'triangle', notes: [{ at: 0, t: 0, len: 1.1 }, { at: 12, t: 0, len: 1.1 }], cut: 1200, level: 0.06, octave: -1, bend: 1, ring: false },
  melody: { wave: 'square', notes: [{ at: 0, t: 0, len: 0.1 }, { at: 4, t: 0.11, len: 0.1 }, { at: 7, t: 0.22, len: 0.1 }, { at: 4, t: 0.33, len: 0.1 }, { at: 0, t: 0.44, len: 0.2 }], cut: 3000, level: 0.04, octave: 1, bend: 0, ring: false },
  honk: { wave: 'sawtooth', notes: chord([0, 1], 0.45), cut: 700, level: 0.06, octave: -1, bend: 0, ring: false },
  chime: { wave: 'sine', notes: [{ at: 7, t: 0, len: 0.7 }, { at: 4, t: 0.18, len: 0.7 }, { at: 0, t: 0.36, len: 1 }], cut: 6000, level: 0.07, octave: 1, bend: 0, ring: true },
};

/** The sound a vehicle makes when nothing's been fitted. */
export function defaultEngine(vehicleId: string): EngineSound {
  return vehicleId === 'scooter' || vehicleId === 'tuktuk' || vehicleId === 'tukracer' || vehicleId === 'paperboat' ? 'buzzy' : vehicleId === 'van' ? 'rumble' : vehicleId === 'bicycle' ? 'pedal' : vehicleId === 'balloon' ? 'burner' : 'classic';
}

export function defaultHorn(vehicleId: string): HornSound {
  return vehicleId === 'tuktuk' || vehicleId === 'scooter' ? 'beep' : vehicleId === 'bicycle' || vehicleId === 'balloon' ? 'bell' : vehicleId === 'paperboat' ? 'duck' : vehicleId === 'tukracer' ? 'trumpet' : 'toot';
}
