import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Australia: Sydney, the Blue
 * Mountains, Melbourne, the Great Ocean Road, the Outback, Uluru, the
 * Daintree, the Great Barrier Reef, Byron Bay and the Gold Coast.
 */

const INK = '#2b2622';
const OCHRE = '#c8603a';
const WHITE = '#f6f0e4';
const RED = '#d8263a';

/** A eucalyptus (gum tree): pale smooth trunk, open grey-green crown. */
export function buildGumTree(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(8, 14);
  k.cylinder(0.3, 0.6, h * 0.7, 7, '#e8e0d0', { position: [0, h * 0.35, 0] });
  for (let i = 0; i < 3; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.cylinder(0.12, 0.25, h * 0.35, 5, '#e0d8c8', { position: [Math.cos(a) * 1, h * 0.72, Math.sin(a) * 1], rotation: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5] });
  }
  for (let i = 0; i < 6; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.5, 2.6);
    k.blob(rnd.range(1.4, 2.4), rnd.pick(['#7a9a6a', '#6a8a5a', '#8aa878']), { position: [Math.cos(a) * r, h * rnd.range(0.8, 1), Math.sin(a) * r], scale: [1, 0.6, 1], detail: 1, roughness: 0.3, pattern: Pattern.Grass, seed: i });
  }
  return k.build(0.04, rnd.int(0, 999));
}

/** A koala hugging a branch stub. */
export function buildKoala(): THREE.BufferGeometry {
  const k = new ModelKit();
  const fur = '#9a9a9e';
  k.cylinder(0.25, 0.3, 4, 6, '#e8e0d0', { position: [0, 2, 0] });
  k.blob(0.45, fur, { position: [0, 3, 0.35], scale: [0.9, 1.1, 0.8], detail: 1 });
  k.blob(0.35, fur, { position: [0, 3.65, 0.45], detail: 1 });
  for (const s of [-1, 1]) k.blob(0.2, '#c8c8cc', { position: [s * 0.35, 3.85, 0.4], scale: [1, 1, 0.5], detail: 0 });
  k.blob(0.12, INK, { position: [0, 3.55, 0.78], scale: [0.8, 1.2, 0.6], detail: 0 });
  return k.build(0.02, 1001);
}

/** A kangaroo sitting up. */
export function buildKangaroo(): THREE.BufferGeometry {
  const k = new ModelKit();
  const fur = '#b8784a';
  k.blob(0.55, fur, { position: [0, 1, 0], scale: [0.8, 1.2, 1], detail: 1 });
  k.blob(0.3, fur, { position: [0, 1.85, 0.25], scale: [0.8, 1, 1.2], detail: 1 });
  for (const s of [-1, 1]) k.blob(0.12, fur, { position: [s * 0.15, 2.15, 0.2], scale: [0.5, 1.6, 0.4], detail: 0 });
  k.cylinder(0.12, 0.2, 1.5, 5, fur, { position: [0, 0.4, -0.9], rotation: [1.2, 0, 0] });
  for (const s of [-1, 1]) k.box(0.2, 0.15, 0.8, fur, { position: [s * 0.25, 0.08, 0.3] });
  return k.build(0.02, 1002);
}

/** The Three Sisters: three sandstone pillars on the escarpment edge. */
export function buildThreeSisters(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(40, '#6a7a5a', { scale: [1.2, 0.6, 1], roughness: 0.2, seed: 5, pattern: Pattern.Grass });
  for (let i = 0; i < 3; i++) {
    const h = 34 - i * 4;
    const x = -14 + i * 14;
    for (let j = 0; j < 5; j++) k.cylinder(5 - j * 0.6, 5.4 - j * 0.6, h / 5 + 0.2, 7, '#c8a070', { position: [x, 20 + (j + 0.5) * (h / 5), 16], rotation: [0, j, 0], pattern: Pattern.Sandstone });
  }
  return k.build(0.03, 1003);
}

/** A Melbourne W-class tram: green and gold. Along Z. */
export function buildTram(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.6, 2.6, 14, '#2f6a4a', { position: [0, 1.9, 0] });
  k.box(2.65, 0.9, 13, '#f3dca0', { position: [0, 2.4, 0], nightGlow: 1 });
  k.box(2.7, 0.4, 14.2, '#d8b33a', { position: [0, 1, 0] });
  k.gable(2.8, 0.6, 14.4, '#8a3a2a', { position: [0, 3.2, 0] });
  k.cylinder(0.04, 0.04, 2.4, 3, INK, { position: [0, 4.4, 2], rotation: [0.6, 0, 0] });
  return k.build(0.01, 1004);
}

/** Flinders Street Station: yellow stone, a green copper dome and a row of clocks. Faces +Z. */
export function buildFlindersStation(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#e8c060';
  k.box(80, 14, 20, stone, { position: [0, 7, 0], pattern: Pattern.Sandstone });
  for (let i = 0; i < 16; i++) k.box(2, 4, 0.2, '#6a3a2a', { position: [-37 + i * 5, 9, 10.1] });
  k.box(22, 22, 20, stone, { position: [0, 11, 2], pattern: Pattern.Sandstone });
  k.blob(10, '#4f9a7a', { position: [0, 24, 2], scale: [1, 0.9, 1], detail: 1 });
  k.cylinder(0.6, 1, 6, 6, '#4f9a7a', { position: [0, 34, 2] });
  k.box(24, 3, 0.4, '#3a3230', { position: [0, 4, 12.3] });
  for (let i = 0; i < 8; i++) k.cylinder(0.5, 0.5, 0.2, 10, WHITE, { position: [-7 + i * 2, 3.5, 12.6], rotation: [Math.PI / 2, 0, 0] });
  k.box(8, 18, 8, stone, { position: [36, 9, 0], pattern: Pattern.Sandstone });
  k.cylinder(2.2, 2.2, 0.3, 16, WHITE, { position: [36, 14, 4.2], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.02, 1005);
}

/** One of the Twelve Apostles: a limestone sea stack. Origin at the waterline. */
export function buildSeaStack(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(26, 44);
  const r = rnd.range(5, 8);
  for (let i = 0; i < 5; i++) {
    const rr = r * (1 - i * 0.1) * rnd.range(0.85, 1.1);
    k.cylinder(rr * 0.9, rr, h / 5 + 0.3, 7, i % 2 ? '#d8a878' : '#e0b888', { position: [rnd.range(-0.8, 0.8), (i + 0.5) * (h / 5) - 1, rnd.range(-0.8, 0.8)], rotation: [0, rnd.range(0, 3), 0], pattern: Pattern.Sandstone });
  }
  k.blob(r * 0.7, '#8a9a5a', { position: [0, h - 1, 0], scale: [1, 0.3, 1], detail: 0, pattern: Pattern.Grass });
  return k.build(0.03, rnd.int(0, 999));
}

/** A limestone cliff wall along the Great Ocean Road, `length` along X. */
export function buildCliffWall(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 30, 12, '#d8a878', { position: [0, 15, 0], pattern: Pattern.Sandstone });
  k.box(length, 2, 13, '#7a9a5a', { position: [0, 31, 0], pattern: Pattern.Grass });
  for (let i = 0; i < 6; i++) k.box(length, 0.6, 12.2, '#c89868', { position: [0, 4 + i * 4.4, 0] });
  return k.build(0.02, 1006);
}

/** Uluru: the great red monolith, rounded and ribbed. */
export function buildUluru(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, '#c8582a', { scale: [180, 60, 90], roughness: 0.06, seed: 2, pattern: Pattern.Sandstone });
  for (let i = 0; i < 9; i++) k.box(1.5, 40, 80, '#a8482a', { position: [-120 + i * 30, 22, 0], rotation: [0, 0.1 * (i % 3), 0] });
  return k.build(0.02, 1007);
}

/** A termite mound in the red earth. */
export function buildTermiteMound(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(2, 5);
  k.add(new THREE.ConeGeometry(h * 0.35, h, 7), rnd.pick(['#b8683a', '#c8784a', '#a85a32']), { position: [0, h / 2, 0], pattern: Pattern.Sandstone });
  k.blob(h * 0.2, '#b8683a', { position: [h * 0.15, h * 0.4, 0], detail: 0 });
  return k.build(0.05, rnd.int(0, 999));
}

/** An outback wind pump over a water tank. */
export function buildWindPump(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) k.cylinder(0.08, 0.08, 10, 4, '#8a8a8a', { position: [x * 0.6, 5, z * 0.6], rotation: [z * 0.06, 0, -x * 0.06] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box(0.5, 1.8, 0.05, '#c8c8c8', { position: [Math.cos(a) * 1.2, 10 + Math.sin(a) * 1.2, 0.3], rotation: [0, 0, a] });
  }
  k.box(0.1, 1, 2.4, '#d8263a', { position: [0, 10, -1.4] });
  k.cylinder(2.4, 2.4, 2.4, 14, '#8a9aa8', { position: [4, 1.2, 0] });
  return k.build(0.02, 1008);
}

/** A road train: a truck pulling three trailers. Along Z. */
export function buildRoadTrain(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const cab = rnd.pick(['#d8263a', '#3e6fa8', '#f4d23b', '#2f6a4a']);
  k.box(2.6, 3.4, 5, cab, { position: [0, 2, 0] });
  k.box(2.4, 1, 1.6, '#3a4a5a', { position: [0, 3, 2.4] });
  k.box(2.8, 0.8, 0.6, '#c8c8c8', { position: [0, 1, 2.8] });
  for (let i = 0; i < 3; i++) k.box(2.6, 3, 12, '#c8c0b0', { position: [0, 2, -9 - i * 12.6], pattern: Pattern.Planks });
  for (let i = 0; i < 12; i++) k.cylinder(0.5, 0.5, 0.3, 10, INK, { position: [1.3, 0.5, 1 - i * 3.6], rotation: [0, 0, Math.PI / 2] });
  return k.build(0.01, rnd.int(0, 9999));
}

/** A saltwater crocodile basking on the bank. */
export function buildCroc(): THREE.BufferGeometry {
  const k = new ModelKit();
  const skin = '#4a5a3a';
  k.blob(0.6, skin, { position: [0, 0.35, 0], scale: [0.9, 0.5, 3], detail: 1 });
  k.blob(0.35, skin, { position: [0, 0.3, 2.3], scale: [0.8, 0.5, 2.2], detail: 1 });
  k.cylinder(0.05, 0.4, 2.8, 6, skin, { position: [0, 0.3, -3], rotation: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) k.box(0.15, 0.2, 0.3, '#3a4a2a', { position: [0, 0.65, -1.5 + i * 0.45] });
  for (const s of [-1, 1]) for (const z of [-0.8, 0.9]) k.box(0.5, 0.2, 0.3, skin, { position: [s * 0.6, 0.1, z] });
  return k.build(0.02, 1009);
}

/** Coral heads seen through the shallows of the reef. Origin at the water surface. */
export function buildCoral(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#e8559a', '#f08a2e', '#f4d23b', '#9a5bd6', '#3ef0c0', '#e0432f'];
  for (let i = 0; i < 9; i++) k.blob(rnd.range(0.8, 2), rnd.pick(colours), { position: [rnd.range(-5, 5), -0.6, rnd.range(-5, 5)], scale: [1, 0.4, 1], detail: 1, roughness: 0.35, seed: i });
  return k.build(0.03, rnd.int(0, 999));
}

/** A reef dive boat. Along Z. */
export function buildDiveBoat(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(5, 1.6, 16, WHITE, { position: [0, 0.8, 0] });
  k.box(4, 2.4, 6, WHITE, { position: [0, 2.8, -2] });
  k.box(4.1, 0.8, 6.1, '#3a6a9a', { position: [0, 3.2, -2], nightGlow: 1 });
  k.box(0.2, 3, 0.2, INK, { position: [0, 5.5, -3] });
  k.box(1.6, 1, 0.1, '#d8263a', { position: [0.8, 6.4, -3] });
  return k.build(0.01, 1010);
}

/** A tall rainforest tree with buttress roots (Daintree). */
export function buildRainforestTree(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(16, 26);
  k.cylinder(0.6, 1, h, 7, '#6a5a4a', { position: [0, h / 2, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    k.box(0.3, 2.4, 2, '#5a4a3a', { position: [Math.cos(a) * 1, 1.2, Math.sin(a) * 1], rotation: [0, -a, 0] });
  }
  for (let i = 0; i < 5; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.blob(rnd.range(3, 5), rnd.pick(['#2f6a2a', '#3f7a32', '#4a8a3a']), { position: [Math.cos(a) * 2.5, h + rnd.range(-2, 2), Math.sin(a) * 2.5], scale: [1, 0.55, 1], detail: 1, roughness: 0.25, pattern: Pattern.Grass, seed: i });
  }
  for (let i = 0; i < 3; i++) k.cylinder(0.05, 0.05, h * 0.8, 3, '#4a6a3a', { position: [rnd.range(-2, 2), h * 0.45, rnd.range(-2, 2)] });
  return k.build(0.03, rnd.int(0, 999));
}

/** A tree fern. */
export function buildTreeFern(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(3, 5);
  k.cylinder(0.2, 0.25, h, 6, '#4a3a2a', { position: [0, h / 2, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(0.5, 0.08, 2.6, '#4f8a3a', { position: [Math.cos(a) * 1.2, h + 0.1, Math.sin(a) * 1.2], rotation: [0.35, -a + Math.PI / 2, 0], pattern: Pattern.Grass });
  }
  return k.build(0.02, rnd.int(0, 999));
}

/** A surf lifesaving tower in red and yellow. */
export function buildLifesaverTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const [x, z] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) k.cylinder(0.12, 0.12, 5, 4, WHITE, { position: [x, 2.5, z] });
  k.box(3.6, 2.4, 3.6, '#f4d23b', { position: [0, 6.2, 0] });
  k.box(3.62, 1.2, 3.62, RED, { position: [0, 6.8, 0] });
  k.gable(4.2, 1, 4.2, RED, { position: [0, 7.4, 0] });
  k.box(0.1, 2.4, 1.6, RED, { position: [2.3, 8.4, 0] });
  return k.build(0.01, 1011);
}

/** A surfboard stuck upright in the sand. */
export function buildSurfboard(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, colour, { position: [0, 1.2, 0], scale: [0.3, 1.2, 0.06], detail: 1 });
  k.box(0.04, 1.8, 0.07, WHITE, { position: [0, 1.2, 0] });
  return k.build(0.01, 1012);
}

/** The red-dirt verge: a flat ochre strip. */
export function buildRedEarth(length: number, width: number): THREE.BufferGeometry {
  return new ModelKit().box(length, 0.3, width, OCHRE, { position: [0, 0.15, 0], pattern: Pattern.Sandstone }).build(0.01, 1013);
}
