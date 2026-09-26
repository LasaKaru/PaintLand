import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks for Chapter 5 · Postcards: the pyramids and the Nile, Santorini,
 * Kyoto at night, Kandy's Temple of the Tooth and the hills of Ella.
 */

const INK = '#2b2622';
const SAND = '#e3c07a';

/** A square pyramid with stepped sandstone courses and a pale cap. */
export function buildPyramid(base: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.add(new THREE.ConeGeometry(base / Math.SQRT2, height, 4, 1).rotateY(Math.PI / 4), SAND, { position: [0, height / 2, 0], pattern: Pattern.Sandstone });
  k.add(new THREE.ConeGeometry(base / Math.SQRT2 / 10, height / 10, 4, 1).rotateY(Math.PI / 4), '#f3e3b8', { position: [0, height * 0.95, 0] });
  return k.build(0.2, Math.round(base));
}

/** The Sphinx: a lion's body and a headdressed head, facing -Z. */
export function buildSphinx(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(9, 6, 26, SAND, { position: [0, 3, 3], pattern: Pattern.Sandstone });
  for (const s of [-1, 1]) k.box(2.4, 2, 12, SAND, { position: [s * 3, 1, -12], pattern: Pattern.Sandstone });
  k.box(6, 7, 6, SAND, { position: [0, 9, -8], pattern: Pattern.Sandstone });
  // The striped nemes headdress.
  for (const s of [-1, 1]) k.box(1.6, 6, 5, '#d8b36a', { position: [s * 3.6, 7.8, -7.5] });
  k.box(4.6, 5.4, 1, '#caa35a', { position: [0, 9, -11.2] });
  k.box(1, 1.2, 0.4, INK, { position: [0, 9.6, -11.8] });
  return k.build(0.12, 3);
}

/** A felucca: white lateen sail on a wooden hull. */
export function buildFelucca(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.4, 0.9, 8, '#8a5a32', { position: [0, 0.45, 0], pattern: Pattern.Planks });
  k.box(2.6, 0.2, 8.2, '#c8955a', { position: [0, 0.95, 0] });
  k.cylinder(0.08, 0.1, 7, 5, '#5a3a22', { position: [0, 4.2, -0.8] });
  k.add(new THREE.ConeGeometry(3, 9, 3, 1), '#f6f0e4', { position: [0, 5.2, 0.4], rotation: [0.35, 0, 0], scale: [0.08, 1, 1] });
  return k.build(0.03, 4);
}

/** A whitewashed Cycladic house, sometimes with a blue dome (a chapel). */
export function buildCycladic(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(4, 7);
  const d = rnd.range(4, 6);
  const h = rnd.range(3, 5);
  k.box(w, h, d, '#fbf8f2', { position: [0, h / 2, 0] });
  if (rnd.chance(0.45)) k.box(w * 0.6, h * 0.7, d * 0.6, '#fbf8f2', { position: [w * 0.15, h + h * 0.35, -d * 0.1] });
  k.box(1, 1.8, 0.1, rnd.pick(['#2d6fb7', '#3e86c9', '#1f5c9e']), { position: [rnd.range(-w / 4, w / 4), 0.9, -d / 2 - 0.05] });
  for (const x of [-w / 3, w / 3]) k.box(0.8, 0.8, 0.1, '#2d6fb7', { position: [x, h * 0.65, -d / 2 - 0.05] });
  if (rnd.chance(0.3)) {
    k.blob(1.6, '#2d6fb7', { position: [0, h + 0.4, 0], scale: [1, 0.8, 1], detail: 2, roughness: 0 });
    k.cylinder(0.05, 0.05, 1, 4, INK, { position: [0, h + 2, 0] });
    k.box(0.5, 0.06, 0.06, INK, { position: [0, h + 2.2, 0] });
  }
  if (rnd.chance(0.5)) k.blob(0.9, '#e8559a', { position: [w / 2, 0.8, -d / 2 + 0.5], scale: [0.6, 1, 0.8], detail: 0, pattern: Pattern.Leaves });
  return k.build(0.02, Math.round(w * 10));
}

/** A Cycladic windmill: white tower, thatched cap and six sails. */
export function buildWindmill(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(2.2, 2.6, 8, 12, '#fbf8f2', { position: [0, 4, 0] });
  k.add(new THREE.ConeGeometry(2.6, 2.2, 12), '#b8955a', { position: [0, 9.1, 0], pattern: Pattern.Thatch });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box(0.12, 5.5, 0.12, '#7a5a3a', { position: [Math.sin(a) * 2.6, 8 + Math.cos(a) * 2.6, -2.8], rotation: [0, 0, -a] });
    k.box(1.2, 4, 0.04, '#f6f0e4', { position: [Math.sin(a) * 2.8 + Math.cos(a) * 0.5, 8 + Math.cos(a) * 2.8 - Math.sin(a) * 0.5, -2.85], rotation: [0, 0, -a] });
  }
  return k.build(0.03, 5);
}

/** A Kyoto machiya townhouse: dark timber lattice, tiled eaves and a glowing paper lantern. */
export function buildMachiya(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(5, 7);
  k.box(w, 6, 7, '#5a3a2a', { position: [0, 3, 0], pattern: Pattern.Planks });
  k.box(w + 0.6, 0.3, 1.4, '#3a3a44', { position: [0, 3.2, -3.8], pattern: Pattern.RoofTiles });
  k.box(w + 0.8, 0.4, 7.8, '#3a3a44', { position: [0, 6.3, 0], pattern: Pattern.RoofTiles });
  // Lattice (koshi) over glowing paper windows.
  k.box(w - 1, 2, 0.1, '#ffe6a8', { position: [0, 1.5, -3.55], nightGlow: 1 });
  for (let i = 0; i < Math.floor(w * 3); i++) k.box(0.06, 2.1, 0.08, '#3a2418', { position: [-(w - 1) / 2 + i * 0.33, 1.5, -3.62] });
  k.box(1.2, 1.4, 0.05, rnd.pick(['#2d4f7a', '#8a2a2a', '#f6f0e4']), { position: [w / 2 - 1.2, 2.2, -3.66] });
  k.box(w - 1.4, 1.4, 0.1, '#ffe6a8', { position: [0, 4.6, -3.55], nightGlow: 1 });
  k.blob(0.45, '#f6e6c8', { position: [-w / 2 + 0.8, 2.6, -3.9], scale: [1, 1.3, 1], detail: 1, nightGlow: 1 });
  return k.build(0.02, Math.round(w * 10) + 1);
}

/**
 * Sri Dalada Maligawa (Kandy): the white temple with its octagonal
 * pattirippuwa tower and the golden canopy over the shrine.
 */
export function buildTempleOfTooth(): THREE.BufferGeometry {
  const k = new ModelKit();
  const white = '#f7f3ea';
  const roof = '#a0442e';
  k.box(40, 7, 22, white, { position: [0, 3.5, 0] });
  k.box(42, 1, 24, roof, { position: [0, 7.4, 0], pattern: Pattern.RoofTiles });
  for (let i = 0; i < 12; i++) k.box(1.6, 2.4, 0.2, '#6a3a2a', { position: [-17 + i * 3.1, 3.4, -11.05] });
  // The octagon, over the moat.
  k.cylinder(7, 7.4, 12, 8, white, { position: [-14, 6, -16] });
  k.add(new THREE.ConeGeometry(8.6, 5, 8), roof, { position: [-14, 14.2, -16], pattern: Pattern.RoofTiles });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    k.box(1.4, 2, 0.2, '#6a3a2a', { position: [-14 + Math.cos(a) * 7.2, 8.5, -16 + Math.sin(a) * 7.2], rotation: [0, -a + Math.PI / 2, 0] });
  }
  // The golden canopy (ran vahalkada) rising over the main shrine.
  k.box(9, 5, 9, white, { position: [8, 10, 0] });
  k.add(new THREE.ConeGeometry(6.8, 4, 4).rotateY(Math.PI / 4), '#e8b83c', { position: [8, 14.5, 0] });
  k.cylinder(0.2, 0.5, 2.4, 6, '#e8b83c', { position: [8, 17.6, 0] });
  // Moat wall.
  k.box(46, 1.2, 1.2, white, { position: [0, 0.6, -24] });
  return k.build(0.05, 6);
}

/** The Walakulu cloud wall around Kandy Lake: a white parapet with scalloped openings. */
export function buildCloudWall(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.4, 0.6, '#f7f3ea', { position: [0, 1.25, 0] });
  k.box(length, 0.3, 0.6, '#f7f3ea', { position: [0, 0.15, 0] });
  for (let x = -length / 2 + 0.6; x < length / 2; x += 1.2) k.blob(0.42, '#f7f3ea', { position: [x, 0.72, 0], scale: [1, 1, 0.5], detail: 0 });
  return k.build(0.01, Math.round(length));
}

/** A tall waterfall (Ravana Falls, Ella) down a rock face. */
export function buildWaterfall(height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(24, height, 10, '#6f6a62', { position: [0, height / 2, 4], pattern: Pattern.Stone });
  for (const [x, w] of [[-2, 3], [2.5, 2]] as const) k.box(w, height, 0.4, '#dff0fb', { position: [x, height / 2, -1.1], nightGlow: 0 });
  k.blob(4, '#e8f4fb', { position: [0, 0.6, -2], scale: [2, 0.4, 1], detail: 1 });
  for (let i = 0; i < 6; i++) k.blob(2.5, '#3f7a3a', { position: [-10 + i * 4, height + 1, 4 + (i % 2) * 2], detail: 1, pattern: Pattern.Leaves });
  return k.build(0.08, 7);
}

/** A tea-picker's shelter on the hillside, with a red roof. */
export function buildTeaHut(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(4, 2.4, 3, '#f0e2c4', { position: [0, 1.2, 0] });
  k.gable(4.8, 1.4, 3.6, '#b0452e', { position: [0, 3, 0] });
  k.box(0.9, 1.6, 0.1, '#6a3a2a', { position: [0, 0.8, -1.55] });
  return k.build(0.03, 8);
}
