/**
 * DJ party mode. One player is the DJ at a booth (a stage in town, or the
 * record player at home): they pick the station and track and play with the
 * filter, echo, drum fills and the air horn. Everyone near the dance floor
 * dances, and the stage lights pulse with the beat.
 *
 * In a multiplayer room the DJ's choices go to everyone (as an 'emote' message
 * of kind 'party'); each player's own music engine plays them, so nobody
 * streams audio. Only the game's own music is used.
 */

/** Light colour schemes for the stage. */
export const LIGHT_SCHEMES = [
  ['#e8559a', '#9a5bd6', '#4a90c9'],
  ['#f4d23b', '#f08a2e', '#d8463a'],
  ['#8cc63f', '#2f8f86', '#8fd0c8'],
  ['#f6f0e4', '#bfd9e8', '#c9b8f0'],
] as const;

export interface PartyState {
  /** Where: a DJ stage id, or 'home'. */
  stage: string;
  station: number;
  track: number;
  /** −1 muffled … 0 open … 1 thin. */
  filter: number;
  /** 0..1. */
  echo: number;
  scheme: number;
  /** Counters: each bump plays the effect once on everyone's side. */
  fill: number;
  horn: number;
  scratch: number;
}

export const newParty = (stage: string, station: number, track: number): PartyState => ({ stage, station, track, filter: 0, echo: 0, scheme: 0, fill: 0, horn: 0, scratch: 0 });

/** A party message from another player: { a: 'state', ...PartyState } or { a: 'end', stage }. */
export type PartyMsg = ({ a: 'state' } & PartyState) | { a: 'end'; stage: string };

const STAGE_ID = /^[a-z0-9-]{1,24}$/;
const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);

/** Check a party message from the network (anything odd is dropped). */
export function checkParty(v: unknown): PartyMsg | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.stage !== 'string' || !STAGE_ID.test(o.stage)) return null;
  if (o.a === 'end') return { a: 'end', stage: o.stage };
  if (o.a !== 'state') return null;
  const station = int(o.station, 0, 32);
  const track = int(o.track, 0, 999);
  const filter = num(o.filter, -1, 1);
  const echo = num(o.echo, 0, 1);
  const scheme = int(o.scheme, 0, LIGHT_SCHEMES.length - 1);
  const fill = int(o.fill, 0, 1e6);
  const horn = int(o.horn, 0, 1e6);
  const scratch = int(o.scratch, 0, 1e6);
  if (station === null || track === null || filter === null || echo === null || scheme === null || fill === null || horn === null || scratch === null) return null;
  return { a: 'state', stage: o.stage, station, track, filter, echo, scheme, fill, horn, scratch };
}

/**
 * How often the lights may pulse: once a beat, but never more than 3 times a
 * second (flashing faster than that can trigger seizures), and with calm
 * lighting or reduced motion just a slow glow.
 */
export function pulsesPerSecond(bpm: number, calm: boolean): number {
  if (calm) return 0.25;
  let rate = bpm / 60;
  while (rate > 3) rate /= 2;
  return rate;
}

/** Light level 0..1 from the time: a soft pulse (never a hard strobe). */
export function lightLevel(time: number, bpm: number, calm: boolean, phase?: number): number {
  const rate = pulsesPerSecond(bpm, calm);
  const p = calm || phase === undefined || rate < bpm / 60 - 1e-6 ? (time * rate) % 1 : phase;
  // Rise fast, fall slowly; never fully dark, never a sudden jump from dark to full.
  if (calm) return 0.55 + 0.25 * Math.sin(p * Math.PI * 2);
  const swell = p < 0.12 ? p / 0.12 : Math.exp(-(p - 0.12) * 3.5);
  return 0.35 + 0.65 * swell;
}

/** Is this spot on the dance floor (within reach of the stage's middle)? */
export const onDanceFloor = (x: number, z: number, floor: { x: number; z: number } | null, reach = 9): boolean => !!floor && Math.hypot(x - floor.x, z - floor.z) < reach;
