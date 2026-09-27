import { POCKETS, type PocketKind } from '../world/Pockets';

/**
 * Your own home in Harbour Town: wall and roof colours, which keepsakes from
 * the pockets you found are on show, and (in the world) your trophies and the
 * postcards pinned on the wall. Kept in the profile; mirrored to the server
 * when signed in, so friends can visit.
 */
export interface HomeLayout {
  walls: string;
  roof: string;
  /** Keepsakes on show (pocket kinds); undefined = everything you've found. */
  keepsakes?: PocketKind[];
}

export const HOME_WALLS = ['#f6f0e4', '#f2d7a0', '#9fd0c8', '#e9b8c8', '#c9d7f0', '#d8e8b0', '#e8c0a0', '#b8b0d8'] as const;
export const HOME_ROOFS = ['#d8463a', '#2d6fb7', '#2d8a5a', '#7a3b2e', '#f08a2e', '#5a4a6a', '#2b2622', '#b0352a'] as const;
export const DEFAULT_HOME: HomeLayout = { walls: HOME_WALLS[0], roof: HOME_ROOFS[0] };

/** Pocket kinds you have found at least one of (each gives one keepsake). */
export function foundKeepsakes(seen: readonly string[]): PocketKind[] {
  const kinds: PocketKind[] = [];
  for (const p of POCKETS) if (seen.includes(`pocket:${p.id}`) && !kinds.includes(p.kind)) kinds.push(p.kind);
  return kinds;
}

/** The keepsakes actually on show: chosen ones you own, or all you own. */
export function shownKeepsakes(layout: HomeLayout, seen: readonly string[]): PocketKind[] {
  const owned = foundKeepsakes(seen);
  return layout.keepsakes ? layout.keepsakes.filter((k) => owned.includes(k)) : owned;
}

export function toggleKeepsake(layout: HomeLayout, kind: PocketKind, seen: readonly string[]): HomeLayout {
  const shown = shownKeepsakes(layout, seen);
  return { ...layout, keepsakes: shown.includes(kind) ? shown.filter((k) => k !== kind) : [...shown, kind] };
}

/** Trophy cups on the shelf: one per 9 trophies (at least one once you have any), up to 12. */
export function trophyCups(trophies: number): number {
  return trophies <= 0 ? 0 : Math.min(12, Math.max(1, Math.round(trophies / 9)));
}

/** What the server keeps (and friends see). */
export function homeForServer(layout: HomeLayout, seen: readonly string[], trophies: number): { walls: string; roof: string; keepsakes: string[]; trophies: number } {
  return { walls: layout.walls, roof: layout.roof, keepsakes: shownKeepsakes(layout, seen), trophies };
}
