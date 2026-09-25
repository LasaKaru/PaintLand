import * as THREE from 'three';
import { TrackBuilder } from '../road/TrackBuilder';
import { createFrame, type RoadPath } from '../road/RoadPath';
import type { ChapterDef } from '../world/Chapters';
import type { DistrictDef, DressStyle } from '../world/Districts';
import { SKETCH } from '../world/chapters/sketch';
import { SERENDIB } from '../world/chapters/serendib';
import { WONDERS } from '../world/chapters/wonders';
import { LANTERNS } from '../world/chapters/lanterns';

/**
 * Road Studio (docs/08 §5, creator tool v1): a road made of simple pieces —
 * straights, bends, climbs, dives, barrel rolls, loops and scene changes that
 * switch to any district's dressing and music. It builds into a normal
 * chapter, so a custom road drives, sings and looks like the real ones.
 *
 * Share code: `R1.` + base64url(JSON [name, preset, paving, width, style, pieces]).
 */

export const PIECE_KINDS = ['straight', 'left', 'right', 'climb', 'dive', 'roll', 'loop', 'scene'] as const;
export type PieceKind = (typeof PIECE_KINDS)[number];

export interface Piece {
  k: PieceKind;
  /** Main value: length, degrees, angle, turns, radius or style index. */
  a: number;
  /** Second value: bend radius or length (unused by some pieces). */
  b: number;
}

export interface CustomRoad {
  name: string;
  preset: string;
  paving: number;
  width: number;
  /** Index into ROAD_STYLES for the first scene. */
  style: number;
  pieces: Piece[];
}

/** Value ranges per piece: [min, max, default] for a and b. */
export const PIECE_RANGES: Record<PieceKind, { a: [number, number, number]; b?: [number, number, number] }> = {
  straight: { a: [20, 400, 80] },
  left: { a: [10, 180, 60], b: [20, 300, 80] },
  right: { a: [10, 180, 60], b: [20, 300, 80] },
  climb: { a: [3, 25, 10], b: [20, 300, 100] },
  dive: { a: [3, 25, 10], b: [20, 300, 100] },
  roll: { a: [1, 2, 1], b: [80, 300, 160] },
  loop: { a: [14, 40, 20] },
  scene: { a: [0, 1000, 0] },
};

export const ROAD_PRESETS = ['dawn', 'morning', 'noon', 'golden', 'dusk', 'night'];
export const MAX_PIECES = 60;
export const MAX_SCENES = 8;
export const MAX_ROAD_CODE = 2400;
const START_HEIGHT = 30;

/** Every district in the game, by dressing style: the scenes a custom road can use. */
const SOURCES: { chapter: ChapterDef; district: DistrictDef }[] = [SKETCH, SERENDIB, WONDERS, LANTERNS].flatMap((chapter) => chapter.districts.map((district) => ({ chapter, district })));
export const ROAD_STYLES: { style: DressStyle; name: string; chapter: string }[] = SOURCES.map((s) => ({ style: s.district.style, name: s.district.name, chapter: s.chapter.name }));

export function defaultRoad(): CustomRoad {
  return {
    name: 'My road',
    preset: 'golden',
    paving: 0,
    width: 10,
    style: 0,
    pieces: [
      { k: 'straight', a: 80, b: 0 },
      { k: 'left', a: 60, b: 80 },
      { k: 'climb', a: 10, b: 100 },
      { k: 'right', a: 90, b: 60 },
      { k: 'scene', a: ROAD_STYLES.findIndex((s) => s.style === 'lanterntown'), b: 0 },
      { k: 'straight', a: 120, b: 0 },
      { k: 'dive', a: 8, b: 80 },
      { k: 'roll', a: 1, b: 160 },
      { k: 'straight', a: 100, b: 0 },
    ],
  };
}

export function newPiece(k: PieceKind): Piece {
  const r = PIECE_RANGES[k];
  return { k, a: r.a[2], b: r.b?.[2] ?? 0 };
}

const clamp = (v: unknown, lo: number, hi: number, def: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return Math.round(Math.min(hi, Math.max(lo, n)));
};

/** Bring any road (from a code, a save or the editor) inside the limits. */
export function sanitizeRoad(input: Partial<CustomRoad>): CustomRoad {
  const pieces: Piece[] = [];
  for (const p of Array.isArray(input.pieces) ? input.pieces.slice(0, MAX_PIECES) : []) {
    if (!p || !PIECE_KINDS.includes(p.k)) continue;
    const r = PIECE_RANGES[p.k];
    const a = p.k === 'scene' ? clamp(p.a, 0, ROAD_STYLES.length - 1, 0) : clamp(p.a, r.a[0], r.a[1], r.a[2]);
    const b = r.b ? clamp(p.b, r.b[0], r.b[1], r.b[2]) : 0;
    pieces.push({ k: p.k, a, b });
  }
  // Keep the number of scenes (districts) small.
  let scenes = 0;
  const kept = pieces.filter((p) => p.k !== 'scene' || ++scenes < MAX_SCENES);
  const name = typeof input.name === 'string' ? input.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) : '';
  return {
    name: name || 'My road',
    preset: ROAD_PRESETS.includes(input.preset ?? '') ? input.preset! : 'golden',
    paving: clamp(input.paving, 0, 5, 0),
    width: clamp(input.width, 8, 14, 10),
    style: clamp(input.style, 0, ROAD_STYLES.length - 1, 0),
    pieces: kept,
  };
}

function toB64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(code: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) return null;
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function encodeRoad(road: CustomRoad): string {
  const r = sanitizeRoad(road);
  const flat = r.pieces.flatMap((p) => (PIECE_RANGES[p.k].b ? [PIECE_KINDS.indexOf(p.k), p.a, p.b] : [PIECE_KINDS.indexOf(p.k), p.a]));
  return `R1.${toB64Url(JSON.stringify([r.name, ROAD_PRESETS.indexOf(r.preset), r.paving, r.width, r.style, flat]))}`;
}

/** Share code → road, or null when it is not a valid road code. */
export function decodeRoad(code: unknown): CustomRoad | null {
  if (typeof code !== 'string' || code.length > MAX_ROAD_CODE || !code.startsWith('R1.')) return null;
  const json = fromB64Url(code.slice(3));
  if (!json) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length !== 6 || !Array.isArray(data[5])) return null;
  const [name, preset, paving, width, style, flat] = data as [unknown, unknown, unknown, unknown, unknown, unknown[]];
  const pieces: Piece[] = [];
  for (let i = 0; i < flat.length && pieces.length < MAX_PIECES; ) {
    const k = PIECE_KINDS[flat[i] as number];
    if (!k) return null;
    const hasB = !!PIECE_RANGES[k].b;
    pieces.push({ k, a: flat[i + 1] as number, b: hasB ? (flat[i + 2] as number) : 0 });
    i += hasB ? 3 : 2;
  }
  return sanitizeRoad({ name: name as string, preset: ROAD_PRESETS[preset as number], paving: paving as number, width: width as number, style: style as number, pieces });
}

/** The districts a road passes through (one per scene), each borrowed from the district it names. */
export function roadDistricts(road: CustomRoad): DistrictDef[] {
  const styles = [road.style, ...road.pieces.filter((p) => p.k === 'scene').map((p) => p.a)];
  return styles.map((i, n) => {
    const src = SOURCES[i]?.district ?? SOURCES[0].district;
    return { ...src, id: `custom-${n}`, kicker: n === 0 ? `${road.name} · road studio` : src.kicker };
  });
}

/** Lay the road with the same turtle the real chapters use. */
export function buildRoadPath(road: CustomRoad): RoadPath {
  const b = new TrackBuilder(new THREE.Vector3(0, START_HEIGHT, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), road.width);
  let district = 0;
  b.setDistrict(0).setPaving(road.paving);
  b.straight(40, { width: road.width });
  for (const p of road.pieces) {
    switch (p.k) {
      case 'straight':
        b.straight(p.a);
        break;
      case 'left':
      case 'right':
        b.turn(p.k === 'left' ? p.a : -p.a, p.b);
        break;
      case 'climb':
      case 'dive': {
        const s = p.k === 'climb' ? 1 : -1;
        b.pitch(s * p.a, 100);
        b.straight(p.b);
        b.pitch(-s * p.a, 100);
        b.level(20);
        break;
      }
      case 'roll':
        b.roll(360 * p.a, p.b);
        b.level(20);
        break;
      case 'loop':
        b.loop(p.a, road.width + 3);
        b.level(20);
        break;
      case 'scene':
        b.setDistrict(++district);
        b.straight(30);
        break;
    }
  }
  b.straight(60);
  return b.build();
}

export interface RoadStats {
  length: number;
  minY: number;
  maxY: number;
  scenes: number;
  /** Top-down outline for the preview: x, z, height. */
  outline: [number, number, number][];
  warnings: ('underwater' | 'short' | 'long')[];
}

export function roadStats(road: CustomRoad): RoadStats {
  const path = buildRoadPath(road);
  const outline: [number, number, number][] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  const f = createFrame();
  for (let s = 0; s <= path.length; s += 5) {
    const p = path.sample(Math.min(s, path.length), f).position;
    outline.push([p.x, p.z, p.y]);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const warnings: RoadStats['warnings'] = [];
  if (minY < 3) warnings.push('underwater');
  if (path.length < 300) warnings.push('short');
  if (path.length > 8000) warnings.push('long');
  return { length: path.length, minY, maxY, scenes: roadDistricts(road).length, outline, warnings };
}

/** A playable chapter made from a custom road. */
export function roadChapter(road: CustomRoad): ChapterDef {
  const districts = roadDistricts(road);
  const first = SOURCES[road.style] ?? SOURCES[0];
  return {
    id: 'custom',
    name: road.name,
    kicker: 'road studio',
    blurb: 'A road you built in the Road Studio.',
    districts,
    startPreset: road.preset,
    unlockPhrases: 0,
    buildRoute: () => buildRoadPath(road),
    background: first.chapter.background,
  };
}
