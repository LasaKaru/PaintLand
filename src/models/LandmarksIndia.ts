import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of India: Delhi, Varanasi, Agra,
 * Jaipur, the Thar Desert, Mumbai, Goa, Kerala, Madurai and Kanyakumari.
 */

const INK = '#2b2622';
const RED_SANDSTONE = '#b8573a';
const PINK = '#e59a78';
const GOLD_STONE = '#d9a860';
const WHITE = '#f6f0e4';
const MARBLE = '#f6f2ea';

/** A chhatri: a little domed pavilion on four posts. */
function chhatri(k: ModelKit, x: number, y: number, z: number, r: number, colour: string, dome = colour): void {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) k.cylinder(r * 0.12, r * 0.12, r * 1.4, 5, colour, { position: [x + sx * r * 0.7, y + r * 0.7, z + sz * r * 0.7] });
  k.box(r * 2, r * 0.2, r * 2, colour, { position: [x, y + r * 1.45, z] });
  k.blob(r * 0.85, dome, { position: [x, y + r * 1.6, z], scale: [1, 0.9, 1], detail: 1, roughness: 0 });
  k.add(new THREE.ConeGeometry(r * 0.12, r * 0.7, 6), '#d8b33a', { position: [x, y + r * 2.6, z] });
}

/** A curving Nagara temple spire (shikhara), made of stacked, narrowing ribbed drums. */
function shikhara(k: ModelKit, x: number, z: number, r: number, h: number, colour: string, y0 = 0): void {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const rr = r * (1 - t * t * 0.85);
    k.cylinder(rr * 0.94, rr, h / n + 0.05, 8, colour, { position: [x, y0 + (i + 0.5) * (h / n), z], pattern: Pattern.Sandstone });
  }
  k.cylinder(r * 0.3, r * 0.3, r * 0.2, 12, colour, { position: [x, y0 + h + r * 0.1, z] });
  k.add(new THREE.ConeGeometry(r * 0.08, r * 0.6, 6), '#d8b33a', { position: [x, y0 + h + r * 0.5, z] });
  k.box(0.08, r * 0.5, r * 0.35, '#e0432f', { position: [x + r * 0.05, y0 + h + r * 0.9, z + r * 0.15] });
}

/** India Gate: the war-memorial arch on Rajpath. */
export function buildIndiaGate(half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d9b28a';
  const w = half * 2 + 18;
  for (const s of [-1, 1]) {
    k.box(9, 30, 10, stone, { position: [s * (half + 4.5), 15, 0], pattern: Pattern.Sandstone });
    // Eternal-flame urns at the foot of each pier.
    k.box(1.6, 1.6, 1.6, '#3a3230', { position: [s * (half + 4.5), 0.8, 6.5] });
    k.blob(0.5, '#f4a13b', { position: [s * (half + 4.5), 2, 6.5], scale: [0.6, 1.4, 0.6], detail: 0, nightGlow: 1 });
  }
  // The round arch over the opening.
  const arch = new THREE.Shape();
  arch.moveTo(-half, 22);
  arch.absarc(0, 22, half, Math.PI, 0, true);
  arch.lineTo(half, 30);
  arch.lineTo(-half, 30);
  k.add(new THREE.ExtrudeGeometry(arch, { depth: 10, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -5), stone, { pattern: Pattern.Sandstone });
  k.box(w, 8, 10, stone, { position: [0, 34, 0], pattern: Pattern.Sandstone });
  k.box(w + 2, 1.2, 11, '#c9a27a', { position: [0, 30.2, 0] });
  k.box(w * 0.66, 4, 7, stone, { position: [0, 40, 0], pattern: Pattern.Sandstone });
  k.cylinder(3, 3, 1.4, 16, '#c9a27a', { position: [0, 42.7, 0] });
  k.blob(2.8, stone, { position: [0, 43.4, 0], scale: [1, 0.4, 1], detail: 1 });
  k.box(w * 0.3, 0.8, 0.3, '#8a6a4a', { position: [0, 36, 5.1] });
  return k.build(0.02, 501);
}

/** The Red Fort: a long red-sandstone wall with the Lahori Gate and chhatris. `length` along X. */
export function buildRedFort(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 18, 6, RED_SANDSTONE, { position: [0, 9, 0], pattern: Pattern.Sandstone });
  for (let x = -length / 2 + 2; x < length / 2; x += 3.2) k.box(1.6, 1.8, 6.2, RED_SANDSTONE, { position: [x, 18.9, 0] });
  for (const s of [-1, 1]) {
    k.cylinder(4, 4.6, 22, 8, RED_SANDSTONE, { position: [s * length / 2, 11, 0], pattern: Pattern.Sandstone });
    chhatri(k, s * length / 2, 22, 0, 3, RED_SANDSTONE, MARBLE);
  }
  // Lahori Gate in the middle, with a row of little white-domed chhatris.
  k.box(22, 26, 12, RED_SANDSTONE, { position: [0, 13, 0], pattern: Pattern.Sandstone });
  k.box(8, 13, 12.4, '#4a2a22', { position: [0, 6.5, 0] });
  for (let i = 0; i < 7; i++) chhatri(k, -9 + i * 3, 26, 3, 1.1, MARBLE);
  for (const s of [-1, 1]) chhatri(k, s * 10, 26, -2, 2.4, RED_SANDSTONE, MARBLE);
  k.cylinder(0.15, 0.15, 7, 5, INK, { position: [0, 32, 0] });
  k.box(3.6, 0.8, 0.1, '#f08a2e', { position: [1.8, 34.6, 0] });
  k.box(3.6, 0.8, 0.1, WHITE, { position: [1.8, 33.8, 0] });
  k.box(3.6, 0.8, 0.1, '#3f8a3a', { position: [1.8, 33, 0] });
  return k.build(0.02, 502);
}

/** Varanasi's ghats: broad steps down to the river, temples and a pilgrim's umbrella. Faces +Z (the river). */
export function buildGhat(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = rnd.pick(['#d8b890', '#e0c8a0', '#cfae84']);
  const w = 40;
  for (let i = 0; i < 8; i++) k.box(w, 0.6, 3, stone, { position: [0, 0.3 + i * 0.6, -i * 2.2], pattern: Pattern.Stone });
  k.box(w, 8, 10, rnd.pick(['#e8c878', '#e59a78', '#f0e0c0', '#d88a5a']), { position: [0, 8.8, -22], pattern: Pattern.Brick });
  for (let i = 0; i < 6; i++) k.box(2, 3, 0.2, '#3a2a22', { position: [-15 + i * 6, 7.5, -16.9] });
  shikhara(k, -12, -22, 3.2, 14, '#e0b870', 12.8);
  shikhara(k, 10, -24, 2.4, 10, '#f0e0c0', 12.8);
  // Straw umbrellas on the steps.
  for (const x of [-8, 4, 14]) {
    k.cylinder(0.08, 0.08, 3, 4, '#6a4a32', { position: [x, 3.4, -4] });
    k.cylinder(0.1, 2, 0.8, 10, '#d8b060', { position: [x, 5, -4], pattern: Pattern.Thatch });
  }
  return k.build(0.03, rnd.int(0, 9999));
}

/** A wooden rowing boat on the Ganges. */
export function buildRiverBoat(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const hull = rnd.pick(['#2f7ab8', '#e0432f', '#3a9a8a', '#f4d23b', '#6a4a32']);
  k.box(1.8, 0.8, 6, hull, { position: [0, 0.4, 0], pattern: Pattern.Planks });
  k.add(new THREE.ConeGeometry(0.9, 1.4, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), hull, { position: [0, 0.4, 3.6], scale: [1.4, 0.6, 1] });
  k.box(1.6, 0.1, 5.6, '#8a6a4a', { position: [0, 0.82, 0] });
  k.box(1.4, 1.2, 1.8, rnd.pick(['#f08a2e', '#e8559a', '#f4d23b']), { position: [0, 1.4, -1.2] });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A floating diya: a clay lamp in a leaf boat. */
export function buildDiya(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.35, 0.2, 0.15, 8, '#6fae3a', { position: [0, 0.08, 0] });
  k.cylinder(0.14, 0.08, 0.1, 8, '#b8573a', { position: [0, 0.2, 0] });
  k.blob(0.07, '#f4a13b', { position: [0, 0.32, 0], scale: [0.6, 1.4, 0.6], detail: 0, nightGlow: 1 });
  return k.build(0, 503);
}

/** The Hawa Mahal: Jaipur's pink "Palace of Winds", a honeycomb of little windows. Faces +Z. */
export function buildHawaMahal(): THREE.BufferGeometry {
  const k = new ModelKit();
  const tiers = [[34, 6], [30, 5], [24, 5], [16, 4], [8, 4]] as const;
  let y = 0;
  for (const [w, h] of tiers) {
    k.box(w, h, 8, PINK, { position: [0, y + h / 2, 0], pattern: Pattern.Sandstone });
    // Rows of projecting jharokha windows with white trim and little domes.
    const n = Math.floor(w / 2.2);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 1.1 + i * 2.2;
      k.box(1.6, h * 0.6, 1, PINK, { position: [x, y + h * 0.45, 4.3] });
      k.box(0.9, h * 0.4, 0.1, '#6a3a3a', { position: [x, y + h * 0.45, 4.85], nightGlow: i % 3 === 0 ? 1 : 0 });
      k.blob(0.55, WHITE, { position: [x, y + h * 0.82, 4.3], scale: [1, 0.6, 0.8], detail: 0 });
    }
    y += h;
  }
  chhatri(k, 0, y, 0, 1.6, PINK, WHITE);
  return k.build(0.02, 504);
}

/** A pink-city shop front with an arcade (Jaipur's bazaars). */
export function buildPinkShop(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(8, 11);
  k.box(w, 9, 8, rnd.pick([PINK, '#e0906a', '#e8a684']), { position: [0, 4.5, 0], pattern: Pattern.Sandstone });
  for (let i = 0; i < 3; i++) k.box(w / 3 - 0.8, 3, 0.3, '#5a3a2a', { position: [-w / 3 + i * (w / 3), 1.5, 4.1] });
  for (let i = 0; i < 3; i++) k.box(1.2, 1.8, 0.2, WHITE, { position: [-w / 3 + i * (w / 3), 6, 4.1], nightGlow: rnd.chance(0.4) ? 1 : 0 });
  k.box(w, 0.6, 8.4, WHITE, { position: [0, 9.3, 0] });
  k.box(w * 0.8, 0.8, 0.2, rnd.pick(['#f4d23b', '#3e9fd8', '#5dbb3f', '#e0432f']), { position: [0, 3.5, 4.2] });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w, depth: 8, height: 10 };
}

/** Jaisalmer's golden fort on its hill, bastions all round. */
export function buildDesertFort(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(40, '#c89a5a', { position: [0, 0, 0], scale: [1.4, 0.45, 1], roughness: 0.2, seed: 7, pattern: Pattern.Sandstone });
  const y = 16;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = Math.cos(a) * 44;
    const z = Math.sin(a) * 30;
    k.cylinder(4, 4.6, 12, 10, GOLD_STONE, { position: [x, y + 6, z], pattern: Pattern.Sandstone });
    k.box(18, 10, 3, GOLD_STONE, { position: [x * 0.92, y + 5, z * 0.92], rotation: [0, -a + Math.PI / 2, 0], pattern: Pattern.Sandstone });
  }
  for (let i = 0; i < 10; i++) k.box(10, 8 + (i % 3) * 3, 10, GOLD_STONE, { position: [-30 + i * 7, y + 6, (i % 2) * 8 - 4], pattern: Pattern.Sandstone });
  chhatri(k, 0, y + 14, 0, 3, GOLD_STONE);
  chhatri(k, 20, y + 11, 6, 2.2, GOLD_STONE);
  return k.build(0.03, 505);
}

/** A sand dune: a long, lopsided mound. */
export function buildDune(rnd: Random, length: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, rnd.pick(['#e8c080', '#e0b070', '#f0cc90']), { scale: [length, height, length * 0.35], roughness: 0.12, seed: rnd.int(0, 99), pattern: Pattern.Sandstone });
  return k.build(0.02, rnd.int(0, 999));
}

/** The Gateway of India: a basalt arch with four turrets on Mumbai's waterfront. */
export function buildGatewayOfIndia(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d8c098';
  k.box(30, 4, 16, stone, { position: [0, 2, 0], pattern: Pattern.Stone });
  for (const s of [-1, 1]) k.box(9, 20, 14, stone, { position: [s * 10.5, 14, 0], pattern: Pattern.Sandstone });
  k.box(12, 6, 14, stone, { position: [0, 21, 0], pattern: Pattern.Sandstone });
  const arch = new THREE.Shape();
  arch.moveTo(-6, 0);
  arch.lineTo(-6, 11);
  arch.absarc(0, 11, 6, Math.PI, 0, true);
  arch.lineTo(6, 0);
  const hole = new THREE.Path();
  hole.moveTo(-4.5, 0);
  hole.lineTo(-4.5, 11);
  hole.absarc(0, 11, 4.5, Math.PI, 0, true);
  hole.lineTo(4.5, 0);
  arch.holes.push(hole);
  k.add(new THREE.ExtrudeGeometry(arch, { depth: 14, bevelEnabled: false, curveSegments: 10 }).translate(0, 4, -7), stone, { pattern: Pattern.Sandstone });
  for (const [x, z] of [[-13, -5], [13, -5], [-13, 5], [13, 5]]) {
    k.cylinder(1.6, 1.6, 6, 8, stone, { position: [x, 27, z] });
    k.blob(1.7, stone, { position: [x, 30.5, z], scale: [1, 1.2, 1], detail: 1 });
  }
  k.blob(5, stone, { position: [0, 26, 0], scale: [1, 0.55, 1], detail: 1 });
  return k.build(0.02, 506);
}

/** A black-and-yellow Mumbai taxi. */
export function buildKaaliPeeli(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.7, 0.7, 4, '#1f1f24', { position: [0, 0.75, 0] });
  k.box(1.6, 0.7, 2.1, '#f4d23b', { position: [0, 1.45, -0.1] });
  k.box(1.5, 0.5, 0.05, '#8ab0c8', { position: [0, 1.5, 0.96] });
  k.box(0.6, 0.25, 0.3, '#f4d23b', { position: [0, 1.95, 0] });
  for (const x of [-0.8, 0.8]) for (const z of [-1.3, 1.3]) k.cylinder(0.32, 0.32, 0.25, 10, INK, { position: [x, 0.35, z], rotation: [0, 0, Math.PI / 2] });
  return k.build(0.01, 507);
}

/** A whitewashed Goan church with a twin-towered baroque front and a flight of steps. Faces +Z. */
export function buildGoanChurch(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 6; i++) k.box(26 - i * 1.6, 1, 4, '#f0e8d8', { position: [0, 0.5 + i, 18 - i * 2.2], pattern: Pattern.Stone });
  k.box(22, 14, 24, WHITE, { position: [0, 13, -2] });
  k.box(22.4, 1, 24.4, '#d8cfb8', { position: [0, 20.5, -2] });
  k.gable(22, 6, 24, '#c8603a', { position: [0, 20, -4], pattern: Pattern.RoofTiles });
  for (const s of [-1, 1]) {
    k.box(6, 26, 6, WHITE, { position: [s * 9, 19, 10] });
    k.box(6.6, 0.8, 6.6, '#d8cfb8', { position: [s * 9, 32.4, 10] });
    k.blob(2.6, WHITE, { position: [s * 9, 33.4, 10], scale: [1, 1.1, 1], detail: 1 });
    k.box(0.2, 2.2, 0.2, '#d8b33a', { position: [s * 9, 37.3, 10] });
    k.box(1.2, 0.2, 0.2, '#d8b33a', { position: [s * 9, 37.7, 10] });
  }
  k.box(12, 20, 2, WHITE, { position: [0, 16, 12] });
  k.box(4, 7, 0.3, '#6a4a32', { position: [0, 9.5, 13.1] });
  k.cylinder(1.6, 1.6, 0.3, 16, '#5b7fb4', { position: [0, 20, 13.1], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  return k.build(0.02, 508);
}

/** A beach shack with a palm-thatch roof and a string of lights. */
export function buildBeachShack(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const col = rnd.pick(['#3e9fd8', '#e8559a', '#f4d23b', '#5dbb3f']);
  for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) k.cylinder(0.15, 0.15, 3, 5, '#8a6a4a', { position: [x, 1.5, z] });
  k.box(6.4, 0.3, 4.4, '#b89a6a', { position: [0, 0.15, 0], pattern: Pattern.Planks });
  k.box(6, 1, 0.2, col, { position: [0, 1, 2.1], pattern: Pattern.Planks });
  k.gable(7.4, 1.6, 5.6, '#c9a25a', { position: [0, 3, 0], pattern: Pattern.Thatch });
  for (let i = 0; i < 6; i++) k.blob(0.12, rnd.pick(['#f4d23b', '#e8559a', '#3ef0ff']), { position: [-3 + i * 1.2, 2.8, 2.8], detail: 0, nightGlow: 1 });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A Kerala houseboat (kettuvallam): a long wooden hull under a curved thatch roof. Along Z. */
export function buildHouseboat(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const len = rnd.range(18, 24);
  k.box(4, 1.4, len, '#5a3a22', { position: [0, 0.4, 0], pattern: Pattern.Planks });
  for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(2, 4, 4).rotateX((s * Math.PI) / 2).rotateY(Math.PI / 4), '#5a3a22', { position: [0, 0.8, s * (len / 2 + 1.6)], scale: [1, 0.5, 1] });
  // The rounded roof: a half-cylinder of woven palm.
  k.add(new THREE.CylinderGeometry(2.4, 2.4, len * 0.8, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), '#c9a25a', { position: [0, 2.2, 0], scale: [1, 0.8, 1], pattern: Pattern.Thatch });
  for (let i = 0; i < 4; i++) k.box(0.1, 1, 1.4, '#f3dca0', { position: [2.1, 2, -len * 0.3 + i * len * 0.2], nightGlow: 1 });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A Chinese fishing net of Kochi: a cantilevered frame dipping over the water. */
export function buildFishingNet(): THREE.BufferGeometry {
  const k = new ModelKit();
  const wood = '#6a4a32';
  k.box(3, 0.4, 3, wood, { position: [0, 0.2, 0], pattern: Pattern.Planks });
  k.cylinder(0.2, 0.25, 12, 5, wood, { position: [0, 5, 3], rotation: [0.7, 0, 0] });
  for (const s of [-1, 1]) k.cylinder(0.12, 0.15, 14, 5, wood, { position: [s * 2.5, 8, 7], rotation: [0.9, 0, s * 0.35] });
  k.add(new THREE.CylinderGeometry(6, 0.4, 3, 4, 1, true).rotateX(Math.PI), '#d8cfb8', { position: [0, 4, 12.5], rotation: [0, Math.PI / 4, 0] });
  for (let i = 0; i < 4; i++) k.blob(0.4, '#a8a39a', { position: [-0.6 + i * 0.4, 0.7, -2], detail: 0 });
  return k.build(0.02, 509);
}

/** A gopuram of Madurai's Meenakshi temple: a tall tapering tower crowded with painted figures. */
export function buildGopuram(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#e0432f', '#3e9fd8', '#f4d23b', '#5dbb3f', '#e8559a', '#f08a2e', '#9a5bd6', '#f6f0e4'];
  k.box(22, 8, 14, '#d8cfb8', { position: [0, 4, 0], pattern: Pattern.Stone });
  k.box(6, 6, 14.4, '#3a2a22', { position: [0, 3, 0] });
  const tiers = 10;
  let y = 8;
  for (let i = 0; i < tiers; i++) {
    const w = 20 - i * 1.5;
    const d = 12 - i * 0.8;
    k.box(w, 3.4, d, rnd.pick(colours), { position: [0, y + 1.7, 0] });
    // Rows of little painted figures along each tier.
    for (let j = 0; j < Math.floor(w / 1.6); j++) k.blob(0.45, rnd.pick(colours), { position: [-w / 2 + 0.8 + j * 1.6, y + 2, d / 2 + 0.3], scale: [0.7, 1.4, 0.5], detail: 0 });
    k.box(w + 0.6, 0.4, d + 0.6, '#f6f0e4', { position: [0, y + 3.5, 0] });
    y += 3.7;
  }
  // The barrel-vaulted crown with its row of golden finials.
  k.add(new THREE.CylinderGeometry(2.6, 2.6, 7, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), '#e0432f', { position: [0, y, 0] });
  for (let i = 0; i < 7; i++) k.add(new THREE.ConeGeometry(0.3, 1.8, 6), '#d8b33a', { position: [-3 + i, y + 3.4, 0] });
  for (const s of [-1, 1]) k.blob(1, '#5dbb3f', { position: [s * 4.2, y + 1.5, 0], scale: [0.6, 1.2, 0.6], detail: 0 });
  return k.build(0.02, rnd.int(0, 9999));
}

/** The Vivekananda Rock Memorial and the Thiruvalluvar statue on their islets off Kanyakumari. */
export function buildRockMemorials(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(22, '#6a6258', { position: [0, -4, 0], scale: [1.2, 0.5, 1], roughness: 0.25, seed: 3, pattern: Pattern.Stone });
  k.box(18, 10, 12, '#c9a27a', { position: [0, 11, 0], pattern: Pattern.Sandstone });
  k.box(8, 4, 8, '#c9a27a', { position: [0, 18, 0], pattern: Pattern.Sandstone });
  k.blob(4, '#c9a27a', { position: [0, 20, 0], scale: [1, 1.1, 1], detail: 1 });
  k.add(new THREE.ConeGeometry(0.4, 2.4, 6), '#d8b33a', { position: [0, 25.5, 0] });
  for (const s of [-1, 1]) chhatri(k, s * 7, 16, 4, 1.6, '#c9a27a');
  // The poet's statue on the second islet.
  k.blob(12, '#6a6258', { position: [40, -4, 12], scale: [1, 0.6, 1], roughness: 0.25, seed: 5, pattern: Pattern.Stone });
  k.box(8, 12, 8, '#b8a88a', { position: [40, 7, 12], pattern: Pattern.Stone });
  k.cylinder(2.2, 2.6, 16, 10, '#b8a88a', { position: [40, 21, 12], pattern: Pattern.Stone });
  k.blob(1.8, '#b8a88a', { position: [40, 31, 12], scale: [1, 1.2, 1], detail: 1 });
  k.cylinder(0.3, 0.3, 8, 5, '#b8a88a', { position: [42.4, 26, 12], rotation: [0, 0, -0.3] });
  return k.build(0.03, 510);
}

/** A sacred cow, resting. */
export function buildCow(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const coat = rnd.pick(['#f0ece0', '#d8cfc0', '#b89a7a']);
  k.blob(0.7, coat, { position: [0, 0.8, 0], scale: [0.9, 0.7, 1.6], detail: 1 });
  k.blob(0.35, coat, { position: [0, 1.1, 1.2], scale: [0.8, 0.8, 1.2], detail: 1 });
  k.blob(0.3, coat, { position: [0, 1.35, 0.1], scale: [0.7, 0.6, 1], detail: 0 });
  for (const s of [-1, 1]) {
    k.add(new THREE.ConeGeometry(0.06, 0.45, 5), '#e0432f', { position: [s * 0.18, 1.55, 1.1], rotation: [0, 0, -s * 0.5] });
    k.cylinder(0.08, 0.07, 0.6, 4, coat, { position: [s * 0.3, 0.3, 0.8] });
    k.cylinder(0.08, 0.07, 0.6, 4, coat, { position: [s * 0.3, 0.3, -0.8] });
  }
  k.box(0.5, 0.08, 0.08, '#f4a13b', { position: [0, 1.0, 1.45] });
  return k.build(0.02, rnd.int(0, 9999));
}

/** A marigold garland arch over the road, with little bells. `half` is the road half-width. */
export function buildMarigoldArch(rnd: Random, half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) {
    k.cylinder(0.25, 0.3, 7, 6, '#e0432f', { position: [s * half, 3.5, 0] });
    for (let i = 0; i < 12; i++) k.blob(0.25, rnd.pick(['#f4a13b', '#f4d23b', '#f08a2e']), { position: [s * half, 0.6 + i * 0.55, 0.3], detail: 0 });
  }
  const n = Math.round(half * 3);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -half + t * 2 * half;
    const y = 7 - Math.sin(t * Math.PI) * 1.2;
    k.blob(0.3, rnd.pick(['#f4a13b', '#f4d23b', '#f08a2e', '#e0432f']), { position: [x, y, 0], detail: 0 });
    if (i % 3 === 1) k.cylinder(0.02, 0.02, 1.4, 3, '#f4a13b', { position: [x, y - 0.8, 0] });
  }
  return k.build(0.02, rnd.int(0, 9999));
}
