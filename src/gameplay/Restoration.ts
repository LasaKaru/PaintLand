/**
 * Colour the City (docs/02 pillar "paint the world"): every district of an
 * open-world area starts as a pencil sketch. Finding its secrets, landing its
 * stunts, opening its chests and finishing missions inside it adds paint;
 * when enough is done the district bursts into colour.
 */
export interface District {
  id: string;
  name: string;
  /** minX, minZ, maxX, maxZ in area metres. */
  rect: [number, number, number, number];
  colour: string;
}

/** Something in the world that paints a district once done (tag in profile.seen). */
export interface Stroke {
  tag: string;
  x: number;
  z: number;
}

export interface DistrictProgress {
  district: District;
  done: number;
  need: number;
  total: number;
  /** 0 = still a sketch … 1 = fully painted. */
  paint: number;
  restored: boolean;
}

/** Share of a district's strokes needed to restore it. */
export const RESTORE_SHARE = 0.6;

export const CITY_DISTRICTS: District[] = [
  { id: 'downtown', name: 'The Fort', rect: [-460, -560, 140, 140], colour: '#3e9fd8' },
  { id: 'oldtown', name: 'Pettah', rect: [140, -560, 380, 140], colour: '#f08a2e' },
  { id: 'park', name: 'Lotus Lake Park', rect: [380, -560, 660, 140], colour: '#5dbb3f' },
  { id: 'stunt', name: 'Stunt Park', rect: [-660, 140, -340, 480], colour: '#e8559a' },
  { id: 'west', name: 'West Gardens', rect: [-660, -560, -460, 140], colour: '#9a5bd6' },
  { id: 'south', name: 'Cinnamon Gardens', rect: [-340, 140, 660, 480], colour: '#f4d23b' },
  { id: 'beach', name: 'Galle Face Beach', rect: [-660, 480, 660, 680], colour: '#4cc3c9' },
  { id: 'hills', name: 'Tea Hills', rect: [-660, -680, 660, -560], colour: '#2f8f5b' },
];

export function inRect(r: [number, number, number, number], x: number, z: number): boolean {
  return x >= r[0] && x < r[2] && z >= r[1] && z < r[3];
}

/** Which district a point is in (first match), or null. */
export function districtAt(districts: readonly District[], x: number, z: number): District | null {
  return districts.find((d) => inRect(d.rect, x, z)) ?? null;
}

/** Progress of every district, given all strokes and the player's seen tags. */
export function districtProgress(districts: readonly District[], strokes: readonly Stroke[], seen: readonly string[]): DistrictProgress[] {
  const seenSet = new Set(seen);
  return districts.map((district) => {
    const mine = strokes.filter((s) => districtAt(districts, s.x, s.z) === district);
    const total = mine.length;
    const done = mine.filter((s) => seenSet.has(s.tag)).length;
    const need = Math.max(1, Math.ceil(total * RESTORE_SHARE));
    const paint = total === 0 ? 1 : Math.min(1, done / need);
    return { district, done, need, total, paint, restored: paint >= 1 };
  });
}
