/**
 * Checkpoints: where "Continue" picks up, even after the game was closed.
 * A chapter checkpoint is the start of a district; a free-roam checkpoint is
 * a spot in a town (saved on arrival, at places and viewpoints, and quietly
 * every so often). Kept in the profile, so cloud saves carry it too.
 */

export type Checkpoint =
  | { kind: 'chapter'; chapter: string; district: number; label: string; at: number }
  | { kind: 'area'; area: string; x: number; z: number; heading: number; foot: boolean; label: string; at: number };

const idOk = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9-]{1,24}$/.test(v);
const num = (v: unknown, max = 1e5): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max;

/** A saved checkpoint as the game may use it, or null (damaged or from an older version). */
export function checkCheckpoint(v: unknown): Checkpoint | null {
  if (!v || typeof v !== 'object') return null;
  const c = v as Record<string, unknown>;
  const label = typeof c.label === 'string' ? c.label.slice(0, 80) : '';
  const at = num(c.at, 1e15) ? c.at : 0;
  if (c.kind === 'chapter' && idOk(c.chapter) && Number.isInteger(c.district) && (c.district as number) >= 0 && (c.district as number) < 64) {
    return { kind: 'chapter', chapter: c.chapter, district: c.district as number, label, at };
  }
  if (c.kind === 'area' && idOk(c.area) && num(c.x, 5000) && num(c.z, 5000) && num(c.heading, 100)) {
    return { kind: 'area', area: c.area, x: c.x, z: c.z, heading: c.heading, foot: c.foot === true, label, at };
  }
  return null;
}
