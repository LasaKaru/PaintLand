import { FISH_SIZES, contestFish } from '../../server/fishrules.mjs';
import type { Season } from '../world/Calendar';

/**
 * Fishing: which fish live where and when, how big they are, what they are
 * worth, and the little reeling game. Everything here is pure (the random
 * numbers come in), so it is the same on every device and easy to test.
 */

/** The kinds of water a fishing spot looks onto. */
export type WaterKind = 'sea' | 'lake' | 'pond' | 'mystic';

/** 0 common, 1 uncommon, 2 rare, 3 legendary (the same colours as loot). */
export type FishRarity = 0 | 1 | 2 | 3;

export interface FishDef {
  id: string;
  icon: string;
  water: WaterKind[];
  /** Only in these free-roam areas (all areas with the right water if not given). */
  areas?: string[];
  time: 'day' | 'night' | 'any';
  /** Only in these seasons (every season if not given). */
  seasons?: Season[];
  rarity: FishRarity;
  /** Ink for an average-sized catch. */
  ink: number;
  /** Not a fish at all: an old boot or a bottle (a little ink for tidying the water). */
  junk?: boolean;
  /** Put back gently (never sold, but it goes in the book). */
  release?: boolean;
  /** How hard it pulls on the line, 0..1. */
  fight: number;
}

export const FISH: FishDef[] = [
  // The sea (Harbour Town, Lantern Village, Serendib City).
  { id: 'sardine', icon: '🐟', water: ['sea'], time: 'any', rarity: 0, ink: 8, fight: 0.15 },
  { id: 'mackerel', icon: '🐟', water: ['sea'], time: 'day', rarity: 0, ink: 12, fight: 0.3 },
  { id: 'seer', icon: '🐟', water: ['sea'], areas: ['harbour', 'city'], time: 'day', rarity: 1, ink: 30, fight: 0.5 },
  { id: 'parrot', icon: '🐠', water: ['sea'], time: 'day', seasons: ['spring', 'summer'], rarity: 1, ink: 26, fight: 0.35 },
  { id: 'puffer', icon: '🐡', water: ['sea'], time: 'any', rarity: 1, ink: 22, fight: 0.25 },
  { id: 'squid', icon: '🦑', water: ['sea'], time: 'night', rarity: 1, ink: 28, fight: 0.45 },
  { id: 'tuna', icon: '🐟', water: ['sea'], areas: ['city'], time: 'any', rarity: 2, ink: 70, fight: 0.75 },
  { id: 'lobster', icon: '🦞', water: ['sea'], time: 'night', rarity: 2, ink: 60, fight: 0.5 },
  { id: 'sailfish', icon: '🐟', water: ['sea'], time: 'day', seasons: ['summer'], rarity: 3, ink: 220, fight: 0.95 },
  // Lakes (Tea Hills, the park lake in Serendib City).
  { id: 'tilapia', icon: '🐟', water: ['lake'], time: 'any', rarity: 0, ink: 10, fight: 0.2 },
  { id: 'carp', icon: '🐟', water: ['lake', 'pond'], time: 'day', rarity: 0, ink: 14, fight: 0.35 },
  { id: 'catfish', icon: '🐟', water: ['lake'], time: 'night', rarity: 1, ink: 30, fight: 0.55 },
  { id: 'snakehead', icon: '🐍', water: ['lake'], time: 'day', rarity: 1, ink: 32, fight: 0.6 },
  { id: 'trout', icon: '🐟', water: ['lake'], areas: ['hills'], time: 'any', seasons: ['autumn', 'winter', 'spring'], rarity: 1, ink: 34, fight: 0.5 },
  { id: 'eel', icon: '〰', water: ['lake'], time: 'night', rarity: 2, ink: 55, fight: 0.7 },
  { id: 'goldfish', icon: '🐠', water: ['lake', 'pond'], time: 'any', rarity: 2, ink: 45, fight: 0.2 },
  // The koi pond in Lantern Village.
  { id: 'koi', icon: '🎏', water: ['pond'], time: 'any', rarity: 0, ink: 16, fight: 0.3 },
  { id: 'goldkoi', icon: '🎏', water: ['pond'], time: 'day', rarity: 2, ink: 80, fight: 0.45 },
  { id: 'turtle', icon: '🐢', water: ['pond', 'lake'], time: 'day', rarity: 1, ink: 0, release: true, fight: 0.2 },
  // Mirror Lake at the World's End.
  { id: 'moonkoi', icon: '🌙', water: ['mystic'], time: 'night', rarity: 3, ink: 180, fight: 0.8 },
  { id: 'inkfish', icon: '🖋', water: ['mystic'], time: 'any', rarity: 2, ink: 90, fight: 0.6 },
  // Things that are not fish.
  { id: 'boot', icon: '🥾', water: ['sea', 'lake', 'pond'], time: 'any', rarity: 0, ink: 3, junk: true, fight: 0.05 },
  { id: 'bottle', icon: '🍾', water: ['sea', 'lake'], time: 'any', rarity: 0, ink: 3, junk: true, fight: 0.05 },
];

/** How often each rarity bites, before the time, season and place are considered. */
const RARITY_WEIGHT: Record<FishRarity, number> = { 0: 60, 1: 26, 2: 10, 3: 2.5 };

export function fishById(id: string): FishDef | undefined {
  return FISH.find((f) => f.id === id);
}

/** Size range in cm (shared with the server's contest check). */
export function sizeRange(id: string): [number, number] {
  return (FISH_SIZES as Record<string, [number, number]>)[id] ?? [10, 20];
}

/** Is it night for the fish? (from the in-game hour) */
export const isNightHour = (hour: number): boolean => hour >= 19.5 || hour < 5.5;

export interface Waters {
  water: WaterKind;
  area: string;
  hour: number;
  season: Season;
  /** Rain brings the fish up: a little more of the rare ones. */
  rain?: number;
}

/** Everything that could bite here and now. */
export function fishHere(w: Waters): FishDef[] {
  const night = isNightHour(w.hour);
  return FISH.filter((f) => f.water.includes(w.water) && (!f.areas || f.areas.includes(w.area)) && (f.time === 'any' || (f.time === 'night') === night) && (!f.seasons || f.seasons.includes(w.season)));
}

/** Pick what bites, from a random number 0..1. */
export function rollFish(w: Waters, r: number): FishDef {
  const list = fishHere(w);
  const boost = 1 + (w.rain ?? 0) * 0.5;
  const weights = list.map((f) => RARITY_WEIGHT[f.rarity] * (f.rarity >= 2 ? boost : 1) * (f.junk ? 0.35 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < list.length; i++) {
    x -= weights[i];
    if (x < 0) return list[i];
  }
  return list[list.length - 1];
}

/** A catch's size: most are middling, the big ones are rare (tenths of a cm). */
export function rollSize(id: string, r: number): number {
  const [lo, hi] = sizeRange(id);
  return Math.round((lo + (hi - lo) * Math.pow(r, 1.8)) * 10) / 10;
}

/** Ink for a catch: bigger is worth a bit more; released ones and junk are worth their base. */
export function fishInk(f: FishDef, cm: number): number {
  if (f.release || f.junk) return f.ink;
  const [lo, hi] = sizeRange(f.id);
  const t = hi > lo ? (cm - lo) / (hi - lo) : 0.5;
  return Math.round(f.ink * (0.7 + t * 0.8));
}

/** The weekly contest fish for a date (the same week rules as the server). */
export function contestFishFor(t: number): string {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return contestFish(Math.floor(monday / (7 * 86400_000)));
}

// ————— the fish book (kept in the profile) —————

export interface FishRecord {
  /** How many caught. */
  n: number;
  /** The biggest, in cm. */
  best: number;
}
export type FishBook = Record<string, FishRecord>;

/** Put a catch in the book; true if it is a new kind or a new record. */
export function recordCatch(book: FishBook, id: string, cm: number): { first: boolean; record: boolean } {
  const r = book[id];
  if (!r) {
    book[id] = { n: 1, best: cm };
    return { first: true, record: false };
  }
  r.n++;
  if (cm > r.best) {
    r.best = cm;
    return { first: false, record: true };
  }
  return { first: false, record: false };
}

/** Real fish in the book (not junk). */
export const speciesCaught = (book: FishBook): number => FISH.filter((f) => !f.junk && book[f.id]).length;
export const SPECIES_TOTAL = FISH.filter((f) => !f.junk).length;

// ————— the reeling game —————

export type ReelPhase = 'wait' | 'bite' | 'reel' | 'caught' | 'lost';

/**
 * Cast, wait, strike, reel. While waiting the float bobs (and sometimes
 * nibbles); when it dips, press within the window to strike. Then keep the
 * fish inside your green bar: hold to lift the bar, let go and it sinks. The
 * catch fills while the fish is in the bar and drains while it is out.
 */
export class ReelGame {
  phase: ReelPhase = 'wait';
  /** Seconds in the current phase. */
  t = 0;
  /** When the fish bites (seconds after the cast). */
  readonly biteAt: number;
  /** Where the fish is on the meter, 0..1. */
  fish = 0.5;
  private fishTarget = 0.5;
  private fishTimer = 0;
  /** The bottom of the green bar, 0..1, and its speed. */
  bar = 0.35;
  private barV = 0;
  /** 0..1: full = landed, empty = it got away. */
  progress = 0.3;
  /** Little dips while waiting (0..1), for the float. */
  nibble = 0;
  readonly barSize: number;
  readonly why: { escaped?: 'slow' | 'line' } = {};

  constructor(
    readonly def: FishDef,
    private readonly rnd: () => number,
    readonly easy = false,
  ) {
    this.biteAt = 2 + rnd() * 5;
    this.barSize = Math.max(0.16, (easy ? 0.4 : 0.3) - def.rarity * 0.035 - def.fight * 0.06);
  }

  /** How long there is to strike after the bite. */
  get window(): number {
    return this.easy ? 1.6 : 1.05 - this.def.rarity * 0.08;
  }

  /** Press (interact) this frame, and whether it is held. Returns the phase. */
  step(dt: number, pressed: boolean, held: boolean): ReelPhase {
    this.t += dt;
    if (this.phase === 'wait') {
      // A nibble now and then; striking on a nibble scares the fish off a little (the bite comes later).
      this.nibble = Math.max(0, this.nibble - dt * 3);
      if (this.rnd() < dt * 0.6 && this.t < this.biteAt - 0.6) this.nibble = 1;
      if (this.t >= this.biteAt) this.enter('bite');
    } else if (this.phase === 'bite') {
      if (pressed) this.enter('reel');
      else if (this.t > this.window) {
        this.why.escaped = 'slow';
        this.enter('lost');
      }
    } else if (this.phase === 'reel') {
      this.reel(dt, held);
    }
    return this.phase;
  }

  private reel(dt: number, held: boolean): void {
    const d = this.def;
    const calm = this.easy ? 0.55 : 1;
    // The fish darts to a new depth every so often; stronger fish dart more often and further.
    this.fishTimer -= dt;
    if (this.fishTimer <= 0) {
      this.fishTimer = (0.5 + this.rnd() * 1.1) / (0.6 + d.fight);
      const reach = (0.25 + d.fight * 0.6) * calm;
      // Bounce off the ends rather than stick to them (a fish resting at the bottom would sit in an idle bar).
      let to = this.fish + (this.rnd() * 2 - 1) * reach;
      if (to < 0.12) to = 0.24 - to;
      if (to > 0.95) to = 1.9 - to;
      this.fishTarget = Math.min(0.95, Math.max(0.12, to));
    }
    this.fish += (this.fishTarget - this.fish) * Math.min(1, dt * (1.5 + d.fight * 3) * calm);
    // The bar: held lifts it, let go and it sinks; it stops at the ends.
    this.barV += (held ? 2.4 : -2.0) * dt;
    this.barV *= Math.pow(0.12, dt);
    this.bar += this.barV * dt;
    // At rest the bar sinks partly out of the meter, its top just below the lowest a fish swims,
    // so nobody lands a fish without reeling.
    const floor = Math.min(0, 0.1 - this.barSize);
    if (this.bar < floor) {
      this.bar = floor;
      this.barV = Math.max(0, this.barV) * 0.3;
    }
    if (this.bar > 1 - this.barSize) {
      this.bar = 1 - this.barSize;
      this.barV = Math.min(0, this.barV) * 0.3;
    }
    const inside = this.fish >= this.bar && this.fish <= this.bar + this.barSize;
    this.progress += dt * (inside ? 0.32 * (this.easy ? 1.3 : 1) : -(0.2 + d.fight * 0.1) * (this.easy ? 0.6 : 1));
    if (this.progress >= 1) {
      this.progress = 1;
      this.enter('caught');
    } else if (this.progress <= 0) {
      this.progress = 0;
      this.why.escaped = 'line';
      this.enter('lost');
    }
  }

  /** Is the fish inside the bar right now? (for the meter's colour) */
  get holding(): boolean {
    return this.fish >= this.bar && this.fish <= this.bar + this.barSize;
  }

  private enter(p: ReelPhase): void {
    this.phase = p;
    this.t = 0;
  }
}

// ————— where to fish —————

export interface FishingSpot {
  id: string;
  area: string;
  x: number;
  z: number;
  /** Which way the angler faces (the water is that way). */
  yaw: number;
  water: WaterKind;
  /** How far out the float lands. */
  cast: number;
}

/**
 * Spots on real water in each free-roam area: the quays look out to sea, the
 * lake shores and the koi pond onto still water.
 * (Yaw π faces +z, toward the sea in every town; yaw 0 faces −z.) The towns' grass
 * runs a few metres past the quay wall, so a sea cast has to reach beyond it.
 */
export const FISHING_SPOTS: FishingSpot[] = [
  { id: 'hb-quay-w', area: 'harbour', x: -38, z: 64, yaw: Math.PI, water: 'sea', cast: 20 },
  { id: 'hb-quay-e', area: 'harbour', x: 4, z: 64, yaw: Math.PI, water: 'sea', cast: 20 },
  { id: 'vl-quay', area: 'village', x: -20, z: 64, yaw: Math.PI, water: 'sea', cast: 20 },
  { id: 'vl-koi', area: 'village', x: 80, z: -69, yaw: 0, water: 'pond', cast: 6 },
  { id: 'hl-lake', area: 'hills', x: -52, z: 64, yaw: Math.PI, water: 'lake', cast: 20 },
  { id: 'ct-beach', area: 'city', x: -260, z: 544, yaw: Math.PI, water: 'sea', cast: 16 },
  { id: 'ct-lake', area: 'city', x: 500, z: -226, yaw: 0, water: 'lake', cast: 14 },
  { id: 'we-lake', area: 'worldsend', x: -34, z: -4, yaw: 0.6, water: 'mystic', cast: 10 },
];

export const spotsIn = (area: string): FishingSpot[] => FISHING_SPOTS.filter((s) => s.area === area);

/** Where the float lands for a spot (in front of the angler). */
export function floatAt(s: FishingSpot): { x: number; z: number } {
  return { x: s.x - Math.sin(s.yaw) * s.cast, z: s.z - Math.cos(s.yaw) * s.cast };
}
