import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Great Britain: Edinburgh to
 * Brighton by way of the Highlands, the Lakes, York, the Cotswolds, Bath,
 * Stonehenge, Cornwall and Wales. Everything is painted-toy scale.
 */

const INK = '#2b2622';
const SLATE = '#4f5a66';
const HONEY = '#e2bf7a';
const GREY_STONE = '#9a968c';
const WHITE = '#f6f0e4';

/** A crenellated wall run along X (castle walls, York's city walls). */
function battlements(k: ModelKit, length: number, height: number, thick: number, colour: string, at: [number, number, number], yaw = 0): void {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const place = (lx: number, y: number): [number, number, number] => [at[0] + lx * c, at[1] + y, at[2] - lx * s];
  k.box(length, height, thick, colour, { position: place(0, height / 2), rotation: [0, yaw, 0], pattern: Pattern.Stone });
  const n = Math.max(2, Math.floor(length / 1.6));
  for (let i = 0; i < n; i += 2) {
    const lx = -length / 2 + (i + 0.5) * (length / n);
    k.box(length / n, 0.9, thick + 0.1, colour, { position: place(lx, height + 0.45), rotation: [0, yaw, 0], pattern: Pattern.Stone });
  }
}

/** A round tower with a crenellated top and an optional cone roof. */
function roundTower(k: ModelKit, x: number, z: number, r: number, h: number, colour: string, roof: string | null, y0 = 0): void {
  k.cylinder(r, r * 1.05, h, 12, colour, { position: [x, y0 + h / 2, z], pattern: Pattern.Stone });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(r * 0.5, 0.9, r * 0.35, colour, { position: [x + Math.cos(a) * r * 0.92, y0 + h + 0.45, z + Math.sin(a) * r * 0.92], rotation: [0, -a, 0], pattern: Pattern.Stone });
  }
  if (roof) k.add(new THREE.ConeGeometry(r * 1.1, r * 2, 12), roof, { position: [x, y0 + h + r, z], pattern: Pattern.RoofTiles });
}

// ————— Edinburgh —————

/** Edinburgh Castle on its volcanic rock. */
export function buildEdinburghCastle(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(34, '#6d6a62', { position: [0, 4, 0], scale: [1.4, 0.75, 1], roughness: 0.25, seed: 3, pattern: Pattern.Stone });
  k.blob(22, '#7c7a6e', { position: [-18, 14, 6], scale: [1.2, 0.8, 1], roughness: 0.2, seed: 5, pattern: Pattern.Stone });
  const y = 26;
  battlements(k, 60, 6, 2, GREY_STONE, [0, y, 14]);
  battlements(k, 50, 6, 2, GREY_STONE, [-4, y, -14]);
  battlements(k, 28, 6, 2, GREY_STONE, [-30, y, 0], Math.PI / 2);
  battlements(k, 28, 6, 2, GREY_STONE, [30, y, 0], Math.PI / 2);
  // The palace block, the great hall and the half-moon battery.
  k.box(22, 14, 12, '#a8a397', { position: [-8, y + 7, -2], pattern: Pattern.Stone });
  k.gable(22, 5, 12, SLATE, { position: [-8, y + 14, -2], pattern: Pattern.RoofTiles });
  k.box(16, 10, 10, '#b2ad9f', { position: [14, y + 5, 2], pattern: Pattern.Stone });
  k.gable(16, 4, 10, SLATE, { position: [14, y + 10, 2], pattern: Pattern.RoofTiles });
  roundTower(k, 26, 10, 7, 9, GREY_STONE, null, y);
  roundTower(k, -26, -10, 4, 16, GREY_STONE, SLATE, y);
  // A Saltire on the flagpole.
  k.cylinder(0.2, 0.2, 10, 5, INK, { position: [-26, y + 25, -10] });
  k.box(5, 3, 0.2, '#2f62c8', { position: [-23.4, y + 28.5, -10] });
  k.box(5.6, 0.5, 0.25, WHITE, { position: [-23.4, y + 28.5, -10], rotation: [0, 0, 0.5] });
  k.box(5.6, 0.5, 0.25, WHITE, { position: [-23.4, y + 28.5, -10], rotation: [0, 0, -0.5] });
  return k.build(0.05, 301);
}

/** A tall Old Town tenement: grey stone, crow-stepped gable, many small windows. */
export function buildTenement(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(8, 11);
  const floors = rnd.int(4, 6);
  const h = floors * 3.4;
  const d = 10;
  const stone = rnd.pick(['#8f8b82', '#a39f94', '#7f7c75', '#b5ab98']);
  k.box(w, h, d, stone, { position: [0, h / 2, 0], pattern: Pattern.Stone });
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < Math.floor(w / 2.4); i++) {
      const x = -w / 2 + 1.4 + i * 2.4;
      k.box(1, 1.6, 0.2, '#f3dca0', { position: [x, 2 + f * 3.4, d / 2 + 0.05], nightGlow: rnd.chance(0.4) ? 1 : 0 });
    }
  }
  // Crow-stepped gable.
  for (let i = 0; i < 4; i++) k.box(w - i * (w / 4.5), 1.2, d * 0.98, stone, { position: [0, h + 0.6 + i * 1.2, 0], pattern: Pattern.Stone });
  k.box(1.2, 3, 1.2, '#6d6a62', { position: [w / 2 - 1, h + 3, 0] });
  k.box(2.2, 3, 0.25, rnd.pick(['#2f5aa8', '#2d6a4f', '#8a2a2a']), { position: [0, 1.5, d / 2 + 0.1] });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w, depth: d, height: h + 6 };
}

// ————— Highlands and Lakes —————

/** A shaggy Highland cow. */
export function buildHighlandCow(): THREE.BufferGeometry {
  const k = new ModelKit();
  const fur = '#c46a2e';
  k.blob(1.1, fur, { position: [0, 1.4, 0], scale: [1, 0.8, 1.6], roughness: 0.3, seed: 2 });
  k.blob(0.55, fur, { position: [0, 1.6, 1.6], scale: [1, 0.9, 1.1], roughness: 0.35, seed: 4 });
  k.blob(0.35, '#a85524', { position: [0, 1.95, 1.75], scale: [1.4, 0.6, 0.8], roughness: 0.5, seed: 5 });
  for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.1, 0.9, 5), '#efe3c8', { position: [s * 0.55, 2.05, 1.55], rotation: [0, 0, s * -1.1] });
  for (const x of [-0.5, 0.5]) for (const z of [-0.8, 0.8]) k.cylinder(0.14, 0.12, 1, 5, '#8a4a22', { position: [x, 0.5, z] });
  k.box(0.35, 0.25, 0.12, INK, { position: [0, 1.45, 2.1] });
  return k.build(0.04, 311);
}

/** A woolly sheep. */
export function buildSheep(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.6, '#f4f1ea', { position: [0, 0.85, 0], scale: [1, 0.85, 1.35], roughness: 0.35, seed: 7 });
  k.blob(0.28, '#2f2a28', { position: [0, 0.95, 0.85], scale: [0.9, 1, 1.2], roughness: 0.05, seed: 8 });
  for (const x of [-0.25, 0.25]) for (const z of [-0.4, 0.4]) k.cylinder(0.06, 0.06, 0.55, 4, '#2f2a28', { position: [x, 0.27, z] });
  return k.build(0.03, 312);
}

/** A dry-stone wall, `length` metres along X. */
export function buildStoneWall(length: number, colour = '#8e8a7e'): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 1.1, 0.7, colour, { position: [0, 0.55, 0], pattern: Pattern.Stone });
  for (let x = -length / 2 + 0.4; x < length / 2; x += 0.8) k.box(0.7, 0.25, 0.8, '#7a766c', { position: [x, 1.2, 0], rotation: [0, 0, (x * 1.7) % 0.3] });
  return k.build(0.05, 313);
}

/** A little humpbacked stone bridge over a beck. */
export function buildStoneBridge(): THREE.BufferGeometry {
  const k = new ModelKit();
  const s = new THREE.Shape();
  s.moveTo(-9, 0);
  s.lineTo(-9, 1.5);
  s.quadraticCurveTo(0, 4.2, 9, 1.5);
  s.lineTo(9, 0);
  s.lineTo(3, 0);
  s.absarc(0, 0, 3, 0, Math.PI, false);
  s.lineTo(-9, 0);
  k.add(new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -2), GREY_STONE, { pattern: Pattern.Stone });
  return k.build(0.04, 314);
}

/** A slate-roofed Lakeland farmhouse, whitewashed. */
export function buildLakelandFarm(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(10, 5, 6, rnd.pick([WHITE, '#e8e2d2', '#cfc8b8']), { position: [0, 2.5, 0], pattern: Pattern.Brick });
  k.gable(10.6, 3, 6.6, SLATE, { position: [0, 5, 0], pattern: Pattern.RoofTiles });
  k.box(0.9, 2.6, 0.9, '#7a766c', { position: [4, 7, 0] });
  k.box(6, 3.5, 5, '#8e8a7e', { position: [8, 1.75, 0.5], pattern: Pattern.Stone });
  k.gable(6.4, 2, 5.4, SLATE, { position: [8, 3.5, 0.5], pattern: Pattern.RoofTiles });
  for (const x of [-3, 0, 3]) k.box(1, 1.2, 0.15, '#3e5a6a', { position: [x, 3.2, 3.02], nightGlow: 1 });
  return k.build(0.03, rnd.int(0, 9999));
}

// ————— York —————

/** York Minster: the nave, two west towers and the big central tower. */
export function buildMinster(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d8cdb2';
  k.box(20, 24, 70, stone, { position: [0, 12, 0], pattern: Pattern.Sandstone });
  k.gable(20.5, 10, 70, '#6d7580', { position: [0, 24, 0], pattern: Pattern.RoofTiles });
  k.box(46, 22, 16, stone, { position: [0, 11, 8], pattern: Pattern.Sandstone });
  k.gable(46.5, 9, 16, '#6d7580', { position: [0, 22, 8], rotation: [0, 0, 0], pattern: Pattern.RoofTiles });
  k.box(18, 26, 18, stone, { position: [0, 38, 8], pattern: Pattern.Sandstone });
  for (const x of [-7, 7]) k.box(9, 52, 9, stone, { position: [x, 26, -35], pattern: Pattern.Sandstone });
  for (const [x, z, h] of [[-9, 1, 52], [9, 1, 52], [-9, 17, 52], [9, 17, 52]] as const) k.cylinder(0.6, 0.9, 5, 5, stone, { position: [x, h, z - 0] });
  for (const x of [-11, -3, 3, 11]) for (const z of [-38, -32]) k.cylinder(0.5, 0.8, 5, 5, stone, { position: [x * 0.8, 54, z] });
  // The great west window and the rose window.
  k.box(8, 14, 0.4, '#5b7fb4', { position: [0, 16, -35.1], nightGlow: 1, pattern: Pattern.Glass });
  k.cylinder(4, 4, 0.4, 16, '#c85a8a', { position: [23.1, 15, 8], rotation: [0, 0, Math.PI / 2], nightGlow: 1, pattern: Pattern.Glass });
  return k.build(0.04, 321);
}

/** A jettied timber-framed house of the Shambles: each floor leans out over the street. */
export function buildTudorHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(5, 7);
  const d = 8;
  const plaster = rnd.pick(['#f2ead8', '#efe0b8', '#e8d4c8', '#f4e6c8']);
  const beam = '#3a2a22';
  for (let f = 0; f < 3; f++) {
    const lean = f * 0.6;
    const y = f * 3.2;
    k.box(w, 3.2, d, plaster, { position: [0, y + 1.6, lean], pattern: f === 0 ? Pattern.Brick : Pattern.None });
    k.box(w + 0.1, 0.25, 0.3, beam, { position: [0, y + 3.1, d / 2 + lean + 0.02] });
    for (let i = 0; i <= 3; i++) k.box(0.22, 3.2, 0.3, beam, { position: [-w / 2 + (i * w) / 3, y + 1.6, d / 2 + lean + 0.02] });
    if (f > 0) {
      k.box(0.2, 2.8, 0.25, beam, { position: [-w / 4, y + 1.6, d / 2 + lean + 0.05], rotation: [0, 0, 0.6] });
      k.box(1.2, 1.2, 0.15, '#f3dca0', { position: [w / 4, y + 1.7, d / 2 + lean + 0.1], nightGlow: rnd.chance(0.5) ? 1 : 0 });
    }
  }
  k.gable(w + 0.4, 3, d + 1.6, rnd.pick(['#8a3a2a', '#6a4a3a', SLATE]), { position: [0, 9.6, 1.2], pattern: Pattern.RoofTiles });
  k.box(1.6, 2.2, 0.2, rnd.pick(['#2d6a4f', '#8a2a2a', '#2f5aa8']), { position: [-w / 4, 1.1, d / 2 + 0.1] });
  return { geometry: k.build(0.035, rnd.int(0, 9999)), width: w, depth: d, height: 12 };
}

/** A stretch of York's city walls with a gatehouse bar. */
export function buildCityWallBar(): THREE.BufferGeometry {
  const k = new ModelKit();
  battlements(k, 40, 5, 3, '#cfc2a4', [0, 0, 0]);
  k.box(10, 12, 8, '#d6c9aa', { position: [0, 6, 0], pattern: Pattern.Sandstone });
  for (const x of [-4, 4]) roundTower(k, x, 4, 1.5, 13, '#d6c9aa', null);
  k.box(4, 6, 8.4, '#3a3230', { position: [0, 3, 0] });
  return k.build(0.04, 322);
}

// ————— Cotswolds, Bath, Stonehenge —————

/** A honey-stone Cotswold cottage with a thatched or stone-slate roof. */
export function buildCotswoldCottage(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(7, 10);
  const d = 6;
  const stone = rnd.pick([HONEY, '#e8c88a', '#d9b474']);
  k.box(w, 4.2, d, stone, { position: [0, 2.1, 0], pattern: Pattern.Stone });
  const thatch = rnd.chance(0.5);
  if (thatch) k.blob(1, '#c9a25a', { position: [0, 5, 0], scale: [w * 0.58, 2.2, d * 0.62], roughness: 0.08, seed: rnd.int(0, 99), pattern: Pattern.Thatch });
  else k.gable(w + 0.5, 3.2, d + 0.5, '#a8987a', { position: [0, 4.2, 0], pattern: Pattern.RoofTiles });
  k.box(0.9, 2.4, 0.9, stone, { position: [w / 2 - 1, 6, 0] });
  for (const x of [-w / 4, w / 4]) k.box(1.2, 1, 0.15, '#f3dca0', { position: [x, 2.6, d / 2 + 0.05], nightGlow: 1 });
  k.box(1.1, 2, 0.2, rnd.pick(['#6a8f5a', '#2f5aa8', '#8a2a2a']), { position: [0, 1, d / 2 + 0.1] });
  // Roses round the door.
  k.blob(0.6, '#e8559a', { position: [-0.9, 2.2, d / 2 + 0.3], scale: [0.6, 1.4, 0.4], detail: 0, roughness: 0.3 });
  return { geometry: k.build(0.035, rnd.int(0, 9999)), width: w, depth: d, height: 8 };
}

/** A village church with a square tower (Cotswolds, Wales). */
export function buildVillageChurch(stone = HONEY): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(9, 7, 20, stone, { position: [0, 3.5, 0], pattern: Pattern.Stone });
  k.gable(9.4, 4.5, 20.4, '#8a8272', { position: [0, 7, 0], pattern: Pattern.RoofTiles });
  k.box(6, 18, 6, stone, { position: [0, 9, -12], pattern: Pattern.Stone });
  for (const x of [-2.4, 2.4]) for (const z of [-14.4, -9.6]) k.add(new THREE.ConeGeometry(0.5, 2, 4), stone, { position: [x, 19, z] });
  k.cylinder(1.2, 1.2, 0.3, 14, WHITE, { position: [0, 14, -8.9], rotation: [Math.PI / 2, 0, 0] });
  k.box(2, 4, 0.2, '#5b7fb4', { position: [0, 4, 10.1], nightGlow: 1, pattern: Pattern.Glass });
  return k.build(0.03, 331);
}

/** Bath's Royal Crescent: a sweeping Georgian terrace on a quarter circle of radius `r`, open to +Z. */
export function buildRoyalCrescent(r: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const bath = '#e6d3a4';
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.2 + (i / (n - 1)) * Math.PI * 0.6;
    const x = Math.cos(a) * r;
    const z = -Math.sin(a) * r;
    const yaw = Math.PI / 2 - a;
    k.box(7.6, 15, 12, bath, { position: [x, 7.5, z], rotation: [0, yaw, 0], pattern: Pattern.Sandstone });
    k.box(7.8, 1, 12.4, '#d4c090', { position: [x, 15.5, z], rotation: [0, yaw, 0] });
    // Two giant Ionic columns and three rows of windows on each bay.
    const fx = Math.cos(a) * (r - 6.2);
    const fz = -Math.sin(a) * (r - 6.2);
    for (const s of [-1, 1]) {
      const cx = fx + Math.cos(yaw) * s * 2.6;
      const cz = fz - Math.sin(yaw) * s * 2.6;
      k.cylinder(0.45, 0.5, 9, 8, '#efe2bd', { position: [cx, 9, cz] });
    }
    for (let f = 0; f < 3; f++) k.box(1.4, 2, 0.2, f === 0 ? '#3e4a5a' : '#f3dca0', { position: [fx * 1.002, 3 + f * 4.4, fz * 1.002], rotation: [0, yaw, 0], nightGlow: f > 0 && i % 3 === 0 ? 1 : 0 });
  }
  return k.build(0.02, 341);
}

/** The Roman Baths: a green pool ringed by a colonnade with statues. */
export function buildRomanBaths(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d9c8a0';
  k.box(34, 1, 22, stone, { position: [0, 0.5, 0], pattern: Pattern.Sandstone });
  k.box(26, 0.3, 14, '#5f9a7a', { position: [0, 0.9, 0], pattern: Pattern.Glass });
  for (let i = 0; i < 12; i++) {
    const x = -15 + (i % 6) * 6;
    const z = i < 6 ? -10 : 10;
    k.cylinder(0.6, 0.7, 7, 8, stone, { position: [x, 4.5, z] });
    k.blob(0.5, '#cfc5ad', { position: [x, 8.6, z], scale: [0.7, 1.4, 0.7], detail: 0, roughness: 0.2 });
  }
  k.box(34, 1.2, 1.5, stone, { position: [0, 8, -10] });
  k.box(34, 1.2, 1.5, stone, { position: [0, 8, 10] });
  k.box(12, 14, 10, '#e2d2a8', { position: [0, 7, -18], pattern: Pattern.Sandstone });
  k.box(4, 22, 4, '#e2d2a8', { position: [0, 11, -18], pattern: Pattern.Sandstone });
  return k.build(0.03, 342);
}

/** Stonehenge: an outer ring of sarsens with lintels, and the great trilithons inside. */
export function buildStonehenge(): THREE.BufferGeometry {
  const k = new ModelKit();
  const sarsen = '#a7a295';
  const R = 16;
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i % 9 === 4) continue; // fallen gaps
    k.box(2, 5.2, 1.2, sarsen, { position: [Math.cos(a) * R, 2.6, Math.sin(a) * R], rotation: [0, -a, (i % 5) * 0.02], pattern: Pattern.Stone });
    if (i % 2 === 0 && i % 9 !== 3 && i % 9 !== 5) k.box(4, 0.9, 1.1, sarsen, { position: [Math.cos(a + 0.1) * R, 5.6, Math.sin(a + 0.1) * R], rotation: [0, -a - 0.1 - Math.PI / 2 + Math.PI / 2, 0], pattern: Pattern.Stone });
  }
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * 0.2 + (i / 4) * Math.PI * 1.1;
    const r = 8;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    for (const s of [-1, 1]) k.box(2, 7 + (i === 2 ? 1.5 : 0), 1.4, sarsen, { position: [cx + Math.sin(a) * s * 1.4, 3.5, cz - Math.cos(a) * s * 1.4], rotation: [0, -a, 0], pattern: Pattern.Stone });
    k.box(1.4, 1, 5, sarsen, { position: [cx, 7.5 + (i === 2 ? 1.5 : 0), cz], rotation: [0, -a, 0], pattern: Pattern.Stone });
  }
  k.box(3.4, 0.6, 1, '#8e8a7e', { position: [0, 0.3, 0], rotation: [0, 0.4, 0] });
  // A fallen lintel in the grass.
  k.box(4, 0.9, 1.1, sarsen, { position: [R * 0.4, 0.45, -R * 0.75], rotation: [0, 0.8, 0], pattern: Pattern.Stone });
  return k.build(0.06, 351);
}

// ————— Cornwall —————

/** A whitewashed fisherman's cottage with a slate roof. */
export function buildCornishCottage(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(6, 8);
  const d = 6;
  k.box(w, 5, d, rnd.pick([WHITE, '#eaf2f4', '#f4e8d8', '#e0ecf2']), { position: [0, 2.5, 0], pattern: Pattern.Brick });
  k.gable(w + 0.4, 2.6, d + 0.4, SLATE, { position: [0, 5, 0], pattern: Pattern.RoofTiles });
  k.box(1.1, 2.2, 0.2, rnd.pick(['#2f7ab8', '#3a9a8a', '#d8a23a', '#c84a3a']), { position: [0, 1.1, d / 2 + 0.1] });
  for (const x of [-w / 3, w / 3]) k.box(1, 1, 0.15, '#f3dca0', { position: [x, 3.4, d / 2 + 0.05], nightGlow: 1 });
  return { geometry: k.build(0.035, rnd.int(0, 9999)), width: w, depth: d, height: 7 };
}

/** A small painted fishing boat. */
export function buildFishingBoat(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const hull = rnd.pick(['#2f7ab8', '#c84a3a', '#3a9a8a', '#f4d23b']);
  k.box(2.4, 1, 6, hull, { position: [0, 0.5, 0], pattern: Pattern.Planks });
  k.add(new THREE.ConeGeometry(1.2, 1.6, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), hull, { position: [0, 0.5, 3.6], scale: [1.4, 0.7, 1] });
  k.box(2.2, 0.15, 5.6, WHITE, { position: [0, 1.05, 0] });
  k.box(1.4, 1.4, 1.6, WHITE, { position: [0, 1.8, -1] });
  k.cylinder(0.08, 0.08, 4, 4, INK, { position: [0, 3, 0.8] });
  return k.build(0.03, rnd.int(0, 9999));
}

// ————— Wales —————

/** Caernarfon-style castle: polygonal towers, curtain walls and banded stone. */
export function buildWelshCastle(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#8c8a80';
  const band = '#b2a58c';
  const towers: [number, number, number, number][] = [
    [-30, -10, 6, 22], [-10, -16, 5, 18], [10, -16, 5, 18], [30, -10, 7, 26], [30, 12, 5, 18], [0, 16, 6, 20], [-30, 12, 5, 18],
  ];
  for (const [x, z, r, h] of towers) {
    k.cylinder(r, r * 1.08, h, 8, stone, { position: [x, h / 2, z], pattern: Pattern.Stone });
    for (const y of [h * 0.3, h * 0.6]) k.cylinder(r * 1.02, r * 1.02, 1, 8, band, { position: [x, y, z] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      if (i % 2) k.box(r * 0.6, 1, 0.8, stone, { position: [x + Math.cos(a) * r, h + 0.5, z + Math.sin(a) * r], rotation: [0, -a + Math.PI / 2, 0] });
    }
    // Eagle Tower's three turrets.
    if (h > 24) for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      k.cylinder(1, 1, 5, 6, stone, { position: [x + Math.cos(a) * r * 0.6, h + 2.5, z + Math.sin(a) * r * 0.6] });
    }
  }
  const walls: [number, number, number, number][] = [
    [-20, -13, 20, 0.3], [0, -16, 20, 0], [20, -13, 20, -0.3], [30, 1, 22, Math.PI / 2], [15, 14, 30, -0.1], [-15, 14, 30, 0.1], [-30, 1, 22, Math.PI / 2],
  ];
  for (const [x, z, len, yaw] of walls) battlements(k, len, 12, 3, stone, [x, 0, z], yaw);
  return k.build(0.04, 361);
}

/** Y Ddraig Goch: the Welsh flag on a pole (white over green, a red dragon). */
export function buildDragonFlag(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.15, 0.2, 12, 6, INK, { position: [0, 6, 0] });
  k.box(6, 1.8, 0.15, WHITE, { position: [3, 11, 0] });
  k.box(6, 1.8, 0.15, '#2f8a3a', { position: [3, 9.2, 0] });
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(1.2, 0.8);
  s.lineTo(2.4, 0.3);
  s.lineTo(3.2, 1.2);
  s.lineTo(2.8, 1.6);
  s.lineTo(1.8, 1.2);
  s.lineTo(1, 1.8);
  s.lineTo(0.6, 1);
  s.lineTo(0, 0);
  k.add(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false }), '#d8263a', { position: [1.5, 9.2, 0.08] });
  return k.build(0.02, 362);
}

// ————— Brighton —————

/** Brighton Palace Pier: the deck on iron legs, the domed pavilion and kiosks. */
export function buildPier(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(12, 0.8, length, '#e8dcc0', { position: [0, 6, length / 2], pattern: Pattern.Planks });
  for (let z = 4; z < length; z += 8) for (const x of [-5, 5]) k.cylinder(0.35, 0.35, 7, 6, '#5a6a78', { position: [x, 2.8, z] });
  for (let z = 2; z < length; z += 4) for (const x of [-6, 6]) k.cylinder(0.08, 0.08, 1.2, 4, WHITE, { position: [x, 7, z] });
  for (let z = 20; z < length - 30; z += 24) {
    k.box(4, 3.5, 4, WHITE, { position: [-3.5, 8.2, z] });
    k.blob(1.6, '#e8559a', { position: [-3.5, 10.4, z], scale: [1, 0.8, 1], detail: 1 });
  }
  k.box(11, 7, 26, WHITE, { position: [0, 9.9, length - 16] });
  for (const x of [-4, 0, 4]) k.blob(2.2, '#f4d23b', { position: [x, 14, length - 16], scale: [1, 1.2, 1], detail: 1 });
  k.box(11.5, 1.2, 1, '#e0432f', { position: [0, 12.5, length - 29.2], nightGlow: 1 });
  return k.build(0.02, 371);
}

/** A striped helter-skelter. */
export function buildHelterSkelter(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 6; i++) k.cylinder(2.4 - i * 0.1, 2.5 - i * 0.1, 2, 10, i % 2 ? '#e0432f' : WHITE, { position: [0, 1 + i * 2, 0] });
  k.add(new THREE.ConeGeometry(3, 3, 10), '#2f5aa8', { position: [0, 13.5, 0] });
  for (let i = 0; i < 28; i++) {
    const a = i * 0.55;
    k.box(1.8, 0.2, 1.2, '#f4d23b', { position: [Math.cos(a) * 3, 0.6 + i * 0.42, Math.sin(a) * 3], rotation: [0, -a, 0.15] });
  }
  return k.build(0.02, 372);
}

/** A seaside beach hut. */
export function buildBeachHut(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.6, 2.6, 2.4, colour, { position: [0, 1.5, 0], pattern: Pattern.Planks });
  for (let i = 0; i < 5; i++) k.box(0.3, 2.6, 0.05, i % 2 ? WHITE : colour, { position: [-1 + i * 0.5, 1.5, 1.22] });
  k.gable(2.9, 1, 2.7, WHITE, { position: [0, 2.8, 0] });
  k.box(2.8, 0.2, 1.2, '#c9a878', { position: [0, 0.1, 1.8], pattern: Pattern.Planks });
  return k.build(0.03, 373);
}

/** The Royal Pavilion: onion domes and minarets on a pale palace. */
export function buildRoyalPavilion(): THREE.BufferGeometry {
  const k = new ModelKit();
  const wall = '#f0e6cf';
  k.box(46, 9, 16, wall, { position: [0, 4.5, 0] });
  for (let i = 0; i < 9; i++) k.box(1.6, 5, 0.3, '#d8c8a0', { position: [-20 + i * 5, 5, 8.05] });
  const dome = (x: number, z: number, r: number, y: number): void => {
    k.cylinder(r * 0.9, r * 0.9, 2.5, 12, wall, { position: [x, y + 1.2, z] });
    k.blob(r, '#f6efe0', { position: [x, y + 2.5 + r * 0.7, z], scale: [1, 1.25, 1], detail: 1, roughness: 0 });
    k.add(new THREE.ConeGeometry(r * 0.3, r * 1.2, 8), '#f6efe0', { position: [x, y + 2.5 + r * 2.2, z] });
    k.cylinder(0.08, 0.08, 1.4, 4, '#d8b33a', { position: [x, y + 2.5 + r * 3, z] });
  };
  dome(0, 0, 6, 9);
  dome(-14, 0, 3.5, 9);
  dome(14, 0, 3.5, 9);
  for (const x of [-21, -7, 7, 21]) {
    k.cylinder(0.6, 0.7, 9, 8, wall, { position: [x, 13, 6] });
    k.add(new THREE.ConeGeometry(0.9, 2.4, 8), '#f6efe0', { position: [x, 18.6, 6] });
  }
  return k.build(0.02, 374);
}

/** A red pillar box. */
export function buildPillarBox(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.35, 0.38, 1.4, 12, '#d8263a', { position: [0, 0.7, 0] });
  k.blob(0.37, '#d8263a', { position: [0, 1.45, 0], scale: [1, 0.45, 1], detail: 1, roughness: 0 });
  k.box(0.4, 0.06, 0.05, INK, { position: [0, 1.15, 0.36] });
  k.box(0.3, 0.2, 0.03, '#f4d23b', { position: [0, 0.9, 0.37] });
  return k.build(0.01, 375);
}
