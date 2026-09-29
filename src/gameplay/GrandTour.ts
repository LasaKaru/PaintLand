/**
 * Book 2, the Grand Tour. After The Lost Palette, Varna sends you on long road
 * trips around the world, each a country in about ten districts and ten
 * kilometres. A lap earns that country's stamp in your passport; each tour has
 * a long journey mission that calls at towns across the whole map.
 */
import type { ProfileData } from './Profile';

export interface TourStamp {
  chapter: string;
  country: string;
  flag: string;
  hex: string;
  /** Written in the passport under the stamp. */
  note: string;
}

export const TOUR_STAMPS: TourStamp[] = [
  {
    chapter: 'britain',
    country: 'Great Britain',
    flag: '🇬🇧',
    hex: '#2f5aa8',
    note: 'From the castle rock in Edinburgh to the pier at Brighton: bagpipes, sheep on the road, a cream tea in the Cotswolds, and the sea at the end of it all.',
  },
  {
    chapter: 'japan',
    country: 'Japan',
    flag: '🇯🇵',
    hex: '#d8263a',
    note: 'Neon in Shibuya, Fuji over the lake, deer bowing in Nara, the White Heron in blossom, a gate standing in the sea, and a warm white beach in Okinawa.',
  },
  {
    chapter: 'india',
    country: 'India',
    flag: '🇮🇳',
    hex: '#f08a2e',
    note: 'Lamps on the Ganges at dusk, the Taj at dawn, camels on the dunes, a houseboat on the backwaters, and three seas meeting at the very end.',
  },
];

/** Ink for a first stamp. */
export const STAMP_INK = 400;

/** Stamp the passport for a finished lap of a Grand Tour chapter. Returns the stamp if it's new. */
export function stampPassport(data: ProfileData, chapter: string): TourStamp | null {
  const stamp = TOUR_STAMPS.find((s) => s.chapter === chapter);
  if (!stamp) return null;
  const tour = (data.tour ??= []);
  if (tour.includes(chapter)) return null;
  tour.push(chapter);
  return stamp;
}

/** Stamps collected and how many there are. */
export function passport(data: ProfileData): { got: TourStamp[]; total: number } {
  return { got: TOUR_STAMPS.filter((s) => data.tour?.includes(s.chapter)), total: TOUR_STAMPS.length };
}
