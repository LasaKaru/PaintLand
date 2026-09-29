import * as THREE from 'three';
import { t, type StringKey } from '../core/i18n';
import { FISHING_SPOTS } from '../gameplay/Fishing';
import { FOOD_PRICE, FOOD_STALLS } from '../gameplay/Bazaar';
import { ModelKit, Pattern } from '../models/ModelKit';
import type { AreaZone } from './FreeRoamArea';
import type { FreeWorld } from '../gameplay/FreeRoam';
import { PaintMaterial } from '../render/PaintMaterial';
import { homeToWorld, HOME_SPOT } from './HomePlot';

/**
 * The quiet things to do in the towns: fishing spots, resting at home, and DJ
 * stages. Each area adds these zones before it draws its rings and labels.
 */

/** Things to do at home (kind 'rest'). */
export type RestKind = 'sofa' | 'bed' | 'tea' | 'plants' | 'records' | 'pet' | 'cook';
export const REST_KINDS: RestKind[] = ['sofa', 'bed', 'tea', 'plants', 'records', 'pet', 'cook'];

/**
 * Where each home activity is, in the house's own coordinates (see HomePlot):
 * the ring you stand in, where you sit or stand to do it, and which way you face (local).
 */
export const HOME_REST: Record<RestKind, { ring: [number, number]; at: [number, number]; face: [number, number] }> = {
  sofa: { ring: [-2.5, -3.2], at: [-2.5, -4.1], face: [0, 1] },
  pet: { ring: [1.1, -3.3], at: [1.1, -3.0], face: [0, -1] },
  tea: { ring: [-2.5, -0.9], at: [-2.5, -0.6], face: [0, -1] },
  bed: { ring: [4.6, -0.9], at: [4.6, -3.1], face: [0, 1] },
  plants: { ring: [6.0, 1.2], at: [6.0, 1.2], face: [1, 0] },
  records: { ring: [5.2, 3.8], at: [5.2, 3.8], face: [1, 0.6] },
  // The stove against the right-hand wall.
  cook: { ring: [6.7, -0.9], at: [6.9, -0.9], face: [1, 0] },
};

/** A home spot in Harbour Town coordinates, with the walker's yaw. */
export function restPlace(kind: RestKind): { x: number; z: number; yaw: number; ring: { x: number; z: number } } {
  const r = HOME_REST[kind];
  const p = homeToWorld(r.at[0], r.at[1]);
  const ahead = homeToWorld(r.at[0] + r.face[0], r.at[1] + r.face[1]);
  return { ...p, yaw: Math.atan2(-(ahead.x - p.x), -(ahead.z - p.z)), ring: homeToWorld(r.ring[0], r.ring[1]) };
}

/** DJ stages in the towns (you can also start a party from the record player at home). */
export const DJ_STAGES: { id: string; area: string; x: number; z: number; yaw: number }[] = [
  { id: 'city-beach', area: 'city', x: -340, z: 500, yaw: Math.PI },
  { id: 'harbour-green', area: 'harbour', x: -20, z: 30, yaw: Math.PI },
];

/** The zones for an area: fishing spots, the home (Harbour Town) and DJ stages. */
export function leisureZones(area: string): AreaZone[] {
  const zones: AreaZone[] = [];
  for (const s of FISHING_SPOTS.filter((f) => f.area === area)) zones.push({ kind: 'fishing', label: '🎣', x: s.x, z: s.z, r: 2.2, colour: '#4a90c9', spot: s.id });
  if (area === 'harbour')
    for (const k of REST_KINDS) {
      const p = restPlace(k).ring;
      zones.push({ kind: 'rest', label: '', x: p.x, z: p.z, r: 1.05, colour: '#e9b8c8', spot: k });
    }
  for (const d of DJ_STAGES.filter((s) => s.area === area)) {
    const front = { x: d.x - Math.sin(d.yaw) * -3.2, z: d.z - Math.cos(d.yaw) * -3.2 };
    zones.push({ kind: 'dj', label: '🎧', x: front.x, z: front.z, r: 2.2, colour: '#9a5bd6', spot: d.id });
  }
  return zones;
}

/** The label for a leisure zone (null for other zones). */
export function leisureLabel(z: AreaZone): string | null {
  if (z.kind === 'fishing') return `🎣 ${t('zone.fishing')}`;
  if (z.kind === 'dj') return `🎧 ${t('zone.dj')}`;
  if (z.kind === 'cricket') return `🏏 ${t('zone.cricket')}`;
  if (z.kind === 'food' && z.spot) {
    const f = FOOD_STALLS.find((q) => q.id === z.spot);
    return `${f?.icon ?? '🍽'} ${t(`food.${z.spot}` as StringKey)} · ${FOOD_PRICE}`;
  }
  if (z.kind === 'souvenir') return `🎁 ${t('zone.souvenir')}`;
  if (z.kind === 'rest' && z.spot) return `${REST_ICON[z.spot as RestKind] ?? ''} ${t(`rest.${z.spot}` as StringKey)}`;
  return null;
}

const REST_ICON: Record<RestKind, string> = { sofa: '🛋', bed: '🛏', tea: '🫖', plants: '🪴', records: '🎶', pet: '🐾', cook: '🍳' };

// ————— models —————

const INK = '#2b2622';

/** A bamboo fishing rod (held in the right hand; the tip is +Y, 2.6 m up). */
export function buildRod(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.022, 0.035, 2.6, 6, '#c9a860', { position: [0, 1.3, 0] });
  for (const y of [0.5, 1.1, 1.7, 2.2]) k.cylinder(0.04, 0.04, 0.05, 6, '#8a6a3a', { position: [0, y, 0] });
  k.cylinder(0.08, 0.08, 0.06, 10, INK, { position: [0.06, 0.35, 0], rotation: [0, 0, Math.PI / 2] });
  return k.build(0);
}

/** The float: red on top, white below. */
export function buildFloat(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.12, '#d8463a', { position: [0, 0.08, 0], scale: [1, 0.8, 1], detail: 1 });
  k.blob(0.1, '#f6f0e4', { position: [0, -0.04, 0], scale: [1, 0.7, 1], detail: 1 });
  k.cylinder(0.012, 0.012, 0.2, 4, INK, { position: [0, 0.22, 0] });
  return k.build(0);
}

/** A caught fish to hold up (coloured by rarity), about 1 unit long along X. */
export function buildFishModel(colour: string, fin: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.5, colour, { scale: [1, 0.42, 0.22], detail: 1 });
  k.box(0.3, 0.34, 0.04, fin, { position: [-0.55, 0, 0], rotation: [0, 0, Math.PI / 4] });
  k.box(0.22, 0.14, 0.03, fin, { position: [0, 0.22, 0], rotation: [0, 0, 0.3] });
  k.blob(0.05, INK, { position: [0.34, 0.06, 0.1], detail: 0 });
  return k.build(0);
}

/** A DJ booth: decks on a painted table, speakers, a light truss with lamps. Faces −Z (local). */
export function buildDjBooth(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(4.2, 1.1, 1.4, '#2b2622', { position: [0, 0.55, 0], pattern: Pattern.Planks });
  k.box(4.4, 0.08, 1.6, '#9a5bd6', { position: [0, 1.14, 0] });
  for (const s of [-1, 1]) {
    k.cylinder(0.42, 0.42, 0.06, 20, '#1d1a18', { position: [s * 1.1, 1.2, 0] });
    k.cylinder(0.14, 0.14, 0.07, 12, '#f4d23b', { position: [s * 1.1, 1.22, 0] });
    // Speakers.
    k.box(1.1, 2.2, 1.0, '#3a3430', { position: [s * 3.1, 1.1, 0.1] });
    k.cylinder(0.36, 0.36, 0.08, 16, '#1d1a18', { position: [s * 3.1, 0.7, -0.44], rotation: [Math.PI / 2, 0, 0] });
    k.cylinder(0.2, 0.2, 0.08, 16, '#1d1a18', { position: [s * 3.1, 1.6, -0.44], rotation: [Math.PI / 2, 0, 0] });
    // Truss posts.
    k.box(0.18, 4.2, 0.18, '#c9c9d6', { position: [s * 3.9, 2.1, 0.6] });
  }
  k.box(0.6, 0.12, 0.5, '#f6f0e4', { position: [0, 1.22, 0.1] });
  k.box(8.0, 0.2, 0.2, '#c9c9d6', { position: [0, 4.2, 0.6] });
  // A low stage underfoot.
  k.box(9.4, 0.25, 4.4, '#e3c07a', { position: [0, 0.12, 0.6], pattern: Pattern.Planks });
  return k.build(0.02);
}

/** A stage lamp: a can that points down at the dance floor (lit separately). */
export function buildLamp(): THREE.BufferGeometry {
  return new ModelKit().cylinder(0.18, 0.26, 0.45, 10, '#1d1a18', { position: [0, -0.2, 0] }).build(0);
}

export { HOME_SPOT };

let boothGeo: THREE.BufferGeometry | null = null;

/**
 * Add an area's leisure zones (call before the area draws its rings and labels),
 * and build its DJ stages (solid booth and speakers; the dance floor is open).
 */
export function addLeisure(area: { zones: AreaZone[]; world: FreeWorld; group: THREE.Group }, id: string): void {
  area.zones.push(...leisureZones(id));
  for (const d of DJ_STAGES.filter((s) => s.area === id)) {
    boothGeo ??= buildDjBooth();
    const m = new THREE.Mesh(boothGeo, new PaintMaterial({ vertexColors: true, flat: true }));
    m.name = `dj:${d.id}`;
    m.position.set(d.x, 0, d.z);
    m.rotation.y = d.yaw;
    area.group.add(m);
    const c = Math.cos(d.yaw);
    const s = Math.sin(d.yaw);
    // Local (x, z) → world; the table and both speakers are solid.
    const at = (lx: number, lz: number): [number, number] => [d.x + lx * c + lz * s, d.z - lx * s + lz * c];
    const swap = Math.abs(s) > 0.7;
    const [tx, tz] = at(0, 0);
    area.world.box(tx, tz, swap ? 0.7 : 2.1, swap ? 2.1 : 0.7);
    for (const k of [-1, 1]) {
      const [sx, sz] = at(k * 3.1, 0.1);
      area.world.box(sx, sz, 0.55, 0.5);
    }
  }
}

/** Where the DJ stands behind the decks (and faces the dance floor). */
export function djPlace(id: string): { x: number; z: number; yaw: number } | null {
  const d = DJ_STAGES.find((s) => s.id === id);
  if (!d) return null;
  return { x: d.x + Math.sin(d.yaw) * 1.3, z: d.z + Math.cos(d.yaw) * 1.3, yaw: d.yaw };
}

/** The middle of a stage's dance floor. */
export function danceFloor(id: string): { x: number; z: number } | null {
  const d = DJ_STAGES.find((s) => s.id === id);
  if (!d) return null;
  return { x: d.x - Math.sin(d.yaw) * 7, z: d.z - Math.cos(d.yaw) * 7 };
}
