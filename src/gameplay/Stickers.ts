import type { ProfileData } from './Profile';
import { PHOTO_SUBJECTS } from './PhotoHunt';
import { CHAPTERS } from '../world/Chapters';
import { VEHICLES } from '../models/Vehicles';
import { MURAL_SPOTS } from '../world/Murals';

/**
 * Sticker books: a page per place, filled in by what you've already done —
 * places found, secrets, murals, chapters driven, photos taken, vehicles
 * owned. A full page pays out once.
 */
export interface Sticker {
  id: string;
  icon: string;
  label: string;
  got: boolean;
}

export interface StickerPage {
  id: string;
  title: string;
  stickers: Sticker[];
  /** Not visited yet: the page fills in once you go there. */
  locked: boolean;
}

export interface StickerArea {
  id: string;
  name: string;
  places: { id: string; name: string }[];
  secrets: { id: string }[];
}

export const PAGE_REWARD = 150;
export const AREA_PAGES = ['harbour', 'village', 'city'];

const VEHICLE_ICON: Record<string, string> = { rover: '🚙', tuktuk: '🛺', coupe: '🚗', buggy: '🏖', van: '🚐', scooter: '🛵', paperboat: '⛵', balloon: '🎈', bicycle: '🚲', tukracer: '🏁' };

export function stickerPages(d: ProfileData, areas: StickerArea[], names: Record<string, string>, labels: { secret: string; mural: string }): StickerPage[] {
  const seen = new Set(d.seen);
  const pages: StickerPage[] = AREA_PAGES.map((id) => {
    const a = areas.find((x) => x.id === id);
    if (!a) return { id, title: names[id] ?? id, stickers: [], locked: true };
    return {
      id,
      title: a.name,
      locked: false,
      stickers: [
        ...a.places.map((p) => ({ id: `place:${id}:${p.id}`, icon: '📍', label: p.name, got: seen.has(`place:${id}:${p.id}`) })),
        ...a.secrets.map((s, i) => ({ id: `secret:${s.id}`, icon: '🗝', label: `${labels.secret} ${i + 1}`, got: seen.has(`secret:${s.id}`) })),
        ...(MURAL_SPOTS[id] ?? []).map((m, i) => ({ id: `mural:${m.id}`, icon: '🎨', label: `${labels.mural} ${i + 1}`, got: !!d.murals?.[m.id] })),
      ],
    };
  });
  pages.push({
    id: 'chapters',
    title: names.chapters ?? 'Chapters',
    locked: false,
    stickers: CHAPTERS.map((c) => ({ id: `chapter:${c.id}`, icon: '🛣', label: c.name, got: d.bestLap[c.id] !== undefined || seen.has(`chapter:${c.id}`) })),
  });
  pages.push({
    id: 'photos',
    title: names.photos ?? 'Photo hunt',
    locked: false,
    stickers: PHOTO_SUBJECTS.map((p) => ({ id: `photo:${p.id}`, icon: p.icon, label: p.name, got: seen.has(`photo:${p.id}`) })),
  });
  pages.push({
    id: 'garage',
    title: names.garage ?? 'Garage',
    locked: false,
    stickers: VEHICLES.map((v) => ({ id: `vehicle:${v.id}`, icon: VEHICLE_ICON[v.id] ?? '🚗', label: v.name, got: d.owned.includes(`vehicle:${v.id}`) })),
  });
  return pages;
}

export const pageDone = (p: StickerPage): boolean => !p.locked && p.stickers.length > 0 && p.stickers.every((s) => s.got);
