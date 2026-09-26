import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import type { FreeWorld } from '../gameplay/FreeRoam';

/**
 * Hidden pockets: twenty little scenes tucked into corners of the free-roam
 * towns — off the map and off the roads — that you only find by exploring.
 * Each pays out once and fills a page of the sticker book.
 */
export type PocketKind = 'picnic' | 'shrine' | 'easel' | 'cats' | 'hammock' | 'lookout' | 'bottle' | 'stones' | 'campfire' | 'books';

export interface PocketDef {
  id: string;
  area: 'harbour' | 'village' | 'city';
  name: string;
  kind: PocketKind;
  /** Roughly where it is; the scene settles on the nearest open ground. */
  x: number;
  z: number;
}

export const POCKET_INK = 40;
export const POCKET_REACH = 5;

export const POCKETS: PocketDef[] = [
  { id: 'h-picnic', area: 'harbour', name: 'Picnic under the palms', kind: 'picnic', x: 104, z: 58 },
  { id: 'h-cats', area: 'harbour', name: 'The harbour cats', kind: 'cats', x: -104, z: 58 },
  { id: 'h-easel', area: 'harbour', name: 'A painter’s lost easel', kind: 'easel', x: 108, z: -104 },
  { id: 'h-stones', area: 'harbour', name: 'The stone circle', kind: 'stones', x: -108, z: -108 },
  { id: 'h-bottle', area: 'harbour', name: 'Message in a bottle', kind: 'bottle', x: 30, z: 66 },
  { id: 'v-shrine', area: 'village', name: 'Moss shrine', kind: 'shrine', x: 105, z: -100 },
  { id: 'v-hammock', area: 'village', name: 'A hammock in the bamboo', kind: 'hammock', x: -105, z: -95 },
  { id: 'v-campfire', area: 'village', name: 'Fishermen’s campfire', kind: 'campfire', x: 95, z: 60 },
  { id: 'v-books', area: 'village', name: 'The reading nook', kind: 'books', x: -60, z: -110 },
  { id: 'v-lookout', area: 'village', name: 'Fuji lookout', kind: 'lookout', x: 30, z: -112 },
  { id: 'c-lookout', area: 'city', name: 'Rooftop-high lookout', kind: 'lookout', x: -600, z: -560 },
  { id: 'c-cats', area: 'city', name: 'Temple cats', kind: 'cats', x: 600, z: -560 },
  { id: 'c-picnic', area: 'city', name: 'Picnic by the lake', kind: 'picnic', x: 560, z: -300 },
  { id: 'c-easel', area: 'city', name: 'Sunset easel', kind: 'easel', x: -560, z: 200 },
  { id: 'c-shrine', area: 'city', name: 'Roadside kovil', kind: 'shrine', x: 300, z: 300 },
  { id: 'c-hammock', area: 'city', name: 'Beach hammock', kind: 'hammock', x: -420, z: 530 },
  { id: 'c-campfire', area: 'city', name: 'Night-market campfire', kind: 'campfire', x: 0, z: -580 },
  { id: 'c-books', area: 'city', name: 'The little free library', kind: 'books', x: -300, z: -300 },
  { id: 'c-stones', area: 'city', name: 'Old boundary stones', kind: 'stones', x: 620, z: 100 },
  { id: 'c-bottle', area: 'city', name: 'Bottle on the sand', kind: 'bottle', x: 460, z: 535 },
];

function buildPocket(kind: PocketKind): THREE.BufferGeometry {
  const k = new ModelKit();
  switch (kind) {
    case 'picnic':
      k.box(3, 0.04, 2.4, '#d8463a', { position: [0, 0.02, 0] });
      for (let i = 0; i < 2; i++) k.box(0.5, 0.045, 2.4, '#f6f0e4', { position: [-0.75 + i * 1.5, 0.025, 0] });
      k.box(0.8, 0.5, 0.5, '#c8955a', { position: [0.8, 0.3, 0.5], pattern: Pattern.Thatch });
      k.blob(0.18, '#d8463a', { position: [-0.6, 0.15, -0.3], detail: 0 });
      k.blob(0.16, '#f4d23b', { position: [-0.3, 0.14, -0.5], detail: 0 });
      break;
    case 'shrine':
      k.box(1.4, 0.4, 1.2, '#8f8a80', { position: [0, 0.2, 0], pattern: Pattern.Stone });
      k.box(1, 1.2, 0.8, '#b8b0a4', { position: [0, 1, 0], pattern: Pattern.Stone });
      k.gable(1.5, 0.6, 1.2, '#5a7a3a', { position: [0, 1.9, 0] });
      k.cylinder(0.08, 0.08, 0.2, 6, '#ffb347', { position: [0, 0.55, -0.55], nightGlow: 1 });
      for (let i = 0; i < 5; i++) k.blob(0.15, ['#f4d23b', '#e8559a', '#f6f0e4'][i % 3], { position: [-0.5 + i * 0.25, 0.45, -0.5], detail: 0 });
      break;
    case 'easel':
      for (const s of [-1, 1]) k.box(0.08, 2.2, 0.08, '#7a5a3a', { position: [s * 0.45, 1.1, 0], rotation: [0, 0, s * -0.12] });
      k.box(0.08, 2, 0.08, '#7a5a3a', { position: [0, 1, 0.45], rotation: [0.25, 0, 0] });
      k.box(1.3, 1, 0.05, '#f6f0e4', { position: [0, 1.5, -0.05] });
      k.box(0.9, 0.35, 0.06, '#3e86c9', { position: [0, 1.35, -0.08] });
      k.blob(0.2, '#f4d23b', { position: [0.3, 1.75, -0.08], scale: [1, 1, 0.2], detail: 0 });
      k.box(0.5, 0.05, 0.35, '#c8955a', { position: [0.8, 0.5, 0.3] });
      break;
    case 'cats':
      for (let i = 0; i < 3; i++) {
        const c = ['#f08a2e', '#2b2622', '#8c8a94'][i];
        const x = -0.9 + i * 0.9;
        k.blob(0.28, c, { position: [x, 0.25, 0], scale: [0.8, 0.7, 1.3], detail: 0 });
        k.blob(0.18, c, { position: [x, 0.5, -0.3], detail: 0 });
        for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.06, 0.12, 4), c, { position: [x + s * 0.09, 0.66, -0.3] });
      }
      k.cylinder(0.25, 0.2, 0.08, 10, '#3e6fa8', { position: [0, 0.04, 0.6] });
      break;
    case 'hammock':
      for (const s of [-1, 1]) k.cylinder(0.12, 0.14, 2.4, 6, '#7a5a3a', { position: [s * 1.8, 1.2, 0] });
      k.add(new THREE.CylinderGeometry(0.5, 0.5, 3.2, 10, 1, true, Math.PI, Math.PI).rotateZ(Math.PI / 2), '#e8559a', { position: [0, 1.3, 0] });
      break;
    case 'lookout':
      k.box(2, 0.12, 0.5, '#9a5a32', { position: [0, 0.5, 0], pattern: Pattern.Planks });
      for (const s of [-1, 1]) k.box(0.1, 0.5, 0.4, '#5a3a22', { position: [s * 0.9, 0.25, 0] });
      k.cylinder(0.03, 0.03, 1.3, 5, '#2b2622', { position: [1.4, 0.65, -0.3] });
      k.cylinder(0.07, 0.1, 0.7, 8, '#d4a943', { position: [1.4, 1.35, -0.4], rotation: [1.2, 0, 0] });
      break;
    case 'bottle':
      k.cylinder(1.4, 1.5, 0.06, 16, '#ead7ae', { position: [0, 0.03, 0] });
      k.cylinder(0.12, 0.14, 0.45, 8, '#6fd0a0', { position: [0, 0.14, 0], rotation: [0, 0, 1.4], pattern: Pattern.Glass });
      k.box(0.1, 0.08, 0.2, '#f6f0e4', { position: [0.05, 0.14, 0] });
      k.blob(0.2, '#f08a2e', { position: [0.8, 0.08, 0.5], scale: [1, 0.3, 1], detail: 0 });
      break;
    case 'stones':
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        k.box(0.5, 1.2 + (i % 3) * 0.3, 0.4, '#9a958c', { position: [Math.cos(a) * 1.8, 0.6, Math.sin(a) * 1.8], rotation: [0, -a, 0], pattern: Pattern.Stone });
      }
      k.blob(0.3, '#5dbb3f', { position: [0, 0.1, 0], scale: [1, 0.3, 1], detail: 0 });
      break;
    case 'campfire':
      for (let i = 0; i < 4; i++) k.cylinder(0.08, 0.08, 1, 5, '#6a3a2a', { position: [0, 0.12, 0], rotation: [Math.PI / 2, (i / 4) * Math.PI, 0] });
      k.add(new THREE.ConeGeometry(0.3, 0.7, 6), '#ffb347', { position: [0, 0.45, 0], nightGlow: 1 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.blob(0.15, '#8f8a80', { position: [Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6], detail: 0 });
      }
      for (const s of [-1, 1]) k.cylinder(0.2, 0.2, 1.4, 6, '#7a5a3a', { position: [s * 1.4, 0.2, 0], rotation: [Math.PI / 2, 0, 0] });
      break;
    case 'books':
      k.box(1.2, 1.6, 0.5, '#9a5a32', { position: [0, 0.8, 0.4], pattern: Pattern.Planks });
      for (let i = 0; i < 6; i++) k.box(0.14, 0.4, 0.3, ['#d8463a', '#3e6fa8', '#5dbb3f', '#f4d23b', '#9a5bd6', '#f08a2e'][i], { position: [-0.4 + i * 0.16, 1.2, 0.3] });
      k.box(0.7, 0.4, 0.7, '#3e6fa8', { position: [0.2, 0.2, -0.7] });
      k.box(0.7, 0.6, 0.12, '#3e6fa8', { position: [0.2, 0.5, -0.4] });
      break;
  }
  return k.build(0.01, kind.length);
}

export interface RoadSeg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  w: number;
}

/** Distance from (x, z) to the edge of a road (negative = on it). */
export function roadGap(x: number, z: number, r: RoadSeg): number {
  const dx = r.x2 - r.x1;
  const dz = r.z2 - r.z1;
  const t = Math.max(0, Math.min(1, ((x - r.x1) * dx + (z - r.z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (r.x1 + dx * t), z - (r.z1 + dz * t)) - r.w / 2;
}

/** Where a pocket actually sits: the nearest open ground, off the roads, to its rough spot. */
export function settlePocket(world: FreeWorld, def: PocketDef, roads: RoadSeg[] = []): { x: number; z: number } {
  for (let r = 0; r <= 60; r += 2)
    for (let a = 0; a < Math.PI * 2; a += r ? 0.5 / Math.max(1, r / 6) : 7) {
      const x = def.x + Math.cos(a) * r;
      const z = def.z + Math.sin(a) * r;
      const b = world.bounds;
      if (x < b.minX + 3 || x > b.maxX - 3 || z < b.minZ + 3 || z > b.maxZ - 3) continue;
      if (roads.some((road) => roadGap(x, z, road) < 3.5)) continue;
      if (world.resolve({ x, z }, 2.8) === null) return { x, z };
    }
  return { x: def.x, z: def.z };
}

export interface PlacedPocket {
  def: PocketDef;
  x: number;
  z: number;
}

/** Build an area's pockets into its group. */
export function addPockets(area: { id: string; world: FreeWorld; group: THREE.Group; mapInfo(paint: (d: string) => number): { roads: RoadSeg[] } }): PlacedPocket[] {
  const mat = new PaintMaterial({ vertexColors: true, flat: true });
  const out: PlacedPocket[] = [];
  const roads = area.mapInfo(() => 0).roads;
  for (const def of POCKETS.filter((p) => p.area === area.id)) {
    const at = settlePocket(area.world, def, roads);
    const m = new THREE.Mesh(buildPocket(def.kind), mat);
    m.position.set(at.x, 0, at.z);
    m.rotation.y = (def.id.length * 1.7) % (Math.PI * 2);
    m.castShadow = true;
    m.name = `pocket-${def.id}`;
    area.group.add(m);
    out.push({ def, ...at });
  }
  return out;
}
