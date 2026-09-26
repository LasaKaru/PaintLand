import * as THREE from 'three';
import { paintShared } from '../render/PaintMaterial';

/**
 * Seasons and festivals, from the player's own calendar (or chosen in
 * Settings). Seasons recolour leaves and grass; festivals dress the
 * free-roam areas (see world/FestivalDecor.ts).
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonSetting = 'auto' | 'off' | Season;
export type Festival = 'vesak' | 'avurudu' | 'diwali';
export type FestivalSetting = 'auto' | 'off' | Festival;

/** Leaf and grass tints: [colour, amount]. Summer leaves the painted greens as they are. */
export const SEASON_TINTS: Record<Season, { leaf: [string, number]; grass: [string, number] }> = {
  spring: { leaf: ['#f3a6c4', 0.32], grass: ['#9fdc5a', 0.25] },
  summer: { leaf: ['#000000', 0], grass: ['#000000', 0] },
  autumn: { leaf: ['#e07a2b', 0.62], grass: ['#c9a24a', 0.32] },
  winter: { leaf: ['#eef3f8', 0.55], grass: ['#f4f6f8', 0.62] },
};

/** Places near the equator don't have the four seasons: always summer greens. */
const TROPICAL = /Colombo|Kolkata|Calcutta|Singapore|Jakarta|Bangkok|Manila|Kuala_Lumpur|Ho_Chi_Minh|Saigon|Dhaka|Karachi|Nairobi|Lagos|Accra|Bogota|Lima|Caracas|Panama|Maldives|Guam|Yangon|Rangoon|Dar_es_Salaam|Kampala|Kinshasa/;
const SOUTHERN = /Australia|Auckland|Wellington|Argentina|Santiago|Johannesburg|Sao_Paulo|Montevideo|Asuncion|Cape_Town|Perth|Hobart/;

export function seasonFor(date: Date, timeZone = ''): Season {
  if (TROPICAL.test(timeZone)) return 'summer';
  const m = date.getMonth(); // 0 = January
  const north: Season = m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
  if (!SOUTHERN.test(timeZone)) return north;
  return ({ winter: 'summer', spring: 'autumn', summer: 'winter', autumn: 'spring' } as const)[north];
}

export function resolveSeason(setting: SeasonSetting, date = new Date(), timeZone = currentZone()): Season {
  return setting === 'off' ? 'summer' : setting === 'auto' ? seasonFor(date, timeZone) : setting;
}

export function applySeason(season: Season): void {
  const tint = SEASON_TINTS[season];
  const c = new THREE.Color();
  c.set(tint.leaf[0]);
  paintShared.uSeasonLeaf.value.set(c.r, c.g, c.b, tint.leaf[1]);
  c.set(tint.grass[0]);
  paintShared.uSeasonGrass.value.set(c.r, c.g, c.b, tint.grass[1]);
}

function currentZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

// ————— the moon (for Vesak and Diwali, which follow it) —————

const SYNODIC = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

/** Days since the last new moon (0 = new, ~14.8 = full). Accurate to about half a day. */
export function moonAge(date: Date): number {
  const days = (date.getTime() - NEW_MOON_EPOCH) / 86400_000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

const dayDiff = (a: number, b: number): number => Math.abs(a - b);

/** Within `days` of a full moon. */
function nearFull(date: Date, days: number): boolean {
  return dayDiff(moonAge(date), SYNODIC / 2) <= days;
}

/** Within `days` of a new moon. */
function nearNew(date: Date, days: number): boolean {
  const age = moonAge(date);
  return Math.min(age, SYNODIC - age) <= days;
}

/**
 * Which festival (if any) is on:
 * - Vesak: around a full moon in May (the Vesak full moon; the exact day is
 *   set each year, so this shows the days around it).
 * - Sinhala and Tamil New Year (Avurudu): 11–16 April.
 * - Diwali: around the new moon between mid-October and mid-November.
 */
export function festivalOn(date: Date): Festival | null {
  const m = date.getMonth();
  const d = date.getDate();
  if (m === 3 && d >= 11 && d <= 16) return 'avurudu';
  if (m === 4 && nearFull(date, 2)) return 'vesak';
  const inDiwaliSeason = (m === 9 && d >= 13) || (m === 10 && d <= 16);
  if (inDiwaliSeason && nearNew(date, 2)) return 'diwali';
  return null;
}

export function resolveFestival(setting: FestivalSetting, date = new Date()): Festival | null {
  return setting === 'off' ? null : setting === 'auto' ? festivalOn(date) : setting;
}
