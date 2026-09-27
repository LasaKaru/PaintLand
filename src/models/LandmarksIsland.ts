import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';
import { archWall } from './LandmarksSriLanka';

/**
 * Landmarks for Chapter 8 · Island Road Trip (Sri Lanka, top to bottom):
 * Colombo's Pettah, Kandy's perahera day, Nuwara Eliya, Ella, Yala and Galle.
 */

const INK = '#2b2622';
const GOLD = '#d4a943';

/** Colombo's Jami Ul-Alfar ("red mosque"): candy-striped red and white, with onion domes. */
export function buildRedMosque(): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = 20;
  const h = 16;
  // Red and white striped facade.
  for (let y = 0; y < h; y += 1) k.box(w, 1, 14, y % 2 ? '#f6f0e4' : '#c0282a', { position: [0, y + 0.5, 0] });
  k.add(archWall(w + 0.1, 9, 14.2, 3, 4, 6), '#f6f0e4', {});
  for (const x of [-w / 2, w / 2]) {
    for (let y = 0; y < 24; y += 1) k.cylinder(1.6, 1.6, 1, 10, y % 2 ? '#f6f0e4' : '#c0282a', { position: [x, y + 0.5, 6] });
    k.blob(2, '#c0282a', { position: [x, 25.4, 6], scale: [1, 1.3, 1], detail: 1 });
    k.cylinder(0.1, 0.1, 2, 4, GOLD, { position: [x, 28.5, 6] });
  }
  k.blob(4, '#c0282a', { position: [0, h + 2, 0], scale: [1, 1.2, 1], detail: 2 });
  for (let i = 0; i < 9; i++) k.box(1, 0.8, 0.8, '#f6f0e4', { position: [-8 + i * 2, h + 0.4, 7] });
  return k.build(0.03, 201);
}

/** A colonial clock tower (Galle Fort / Colombo style). */
export function buildClockTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(4, 16, 4, '#f2ead8', { position: [0, 8, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.cylinder(1.3, 1.3, 0.2, 18, '#f6f0e4', { position: [Math.sin(a) * 2.05, 13.5, Math.cos(a) * 2.05], rotation: [Math.PI / 2, a, 0], nightGlow: 1 });
  }
  k.add(new THREE.ConeGeometry(3.2, 4, 4).rotateY(Math.PI / 4), '#b0452a', { position: [0, 18, 0], pattern: Pattern.RoofTiles });
  return k.build(0.02, 202);
}

/** A Kandy perahera elephant in an embroidered caparison. */
export function buildPeraheraElephant(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  const skin = '#7a7478';
  k.blob(2, skin, { position: [0, 2.8, 0], scale: [1, 0.85, 1.5], detail: 1 });
  for (const [x, z] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) k.cylinder(0.45, 0.5, 2.2, 8, skin, { position: [x, 1.1, z] });
  k.blob(1.2, skin, { position: [0, 3.6, -2.6], detail: 1 });
  k.cylinder(0.25, 0.45, 2.8, 8, skin, { position: [0, 2.2, -3.4], rotation: [0.2, 0, 0] });
  for (const s of [-1, 1]) k.blob(0.9, skin, { position: [s * 1.1, 3.8, -2.3], scale: [0.2, 1, 0.8], detail: 0 });
  // The caparison: a bright cloth with gold trim and little lights, covering head and body.
  k.blob(2.1, colour, { position: [0, 3.1, 0], scale: [1.02, 0.7, 1.45], detail: 1 });
  k.box(3.8, 0.2, 4.4, GOLD, { position: [0, 2.05, 0] });
  k.blob(1.25, colour, { position: [0, 3.7, -2.7], scale: [1, 0.9, 0.5], detail: 1 });
  for (let i = 0; i < 12; i++) k.blob(0.12, '#fff1b0', { position: [Math.sin(i) * 1.9, 2.2 + (i % 3) * 0.6, Math.cos(i) * 2.6], detail: 0, nightGlow: 1 });
  k.box(1.2, 0.8, 1.4, GOLD, { position: [0, 4.9, 0] });
  return k.build(0.03, 203);
}

/** The Nuwara Eliya post office: red-brick Tudor with white timbering and a clock turret. */
export function buildTudorPostOffice(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(22, 9, 12, '#a8452e', { position: [0, 4.5, 0], pattern: Pattern.Brick });
  for (let x = -10; x <= 10; x += 2.5) k.box(0.3, 4, 0.1, '#f6f0e4', { position: [x, 7, 6.05] });
  k.box(22, 0.3, 0.12, '#f6f0e4', { position: [0, 5.2, 6.05] });
  for (const x of [-7, 0, 7]) k.gable(6, 3.4, 12.4, '#3a3f4a', { position: [x, 10.7, 0] });
  k.box(3.4, 8, 3.4, '#a8452e', { position: [0, 13, 0], pattern: Pattern.Brick });
  k.cylinder(1.1, 1.1, 0.2, 16, '#f6f0e4', { position: [0, 15, 1.75], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  k.add(new THREE.ConeGeometry(2.8, 4, 4).rotateY(Math.PI / 4), '#3a3f4a', { position: [0, 19, 0] });
  for (let x = -9; x <= 9; x += 3) k.box(1.4, 2.2, 0.1, '#3f4f78', { position: [x, 2.6, 6.05], nightGlow: 1 });
  return k.build(0.03, 204);
}

/** A swan pedal boat (Gregory Lake). */
export function buildSwanBoat(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1.3, '#f6f0e4', { position: [0, 0.6, 0], scale: [0.9, 0.5, 1.3], detail: 1 });
  k.cylinder(0.2, 0.3, 1.6, 6, '#f6f0e4', { position: [0, 1.4, -1.2], rotation: [-0.3, 0, 0] });
  k.blob(0.35, '#f6f0e4', { position: [0, 2.2, -1.5], detail: 0 });
  k.cylinder(0, 0.12, 0.4, 5, '#f08a2e', { position: [0, 2.2, -1.9], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.01, 205);
}

/** A green safari jeep with a roll bar. */
export function buildSafariJeep(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.2, 1.1, 4.4, '#5a6f3a', { position: [0, 1.1, 0] });
  k.box(2.1, 0.8, 1.4, '#5a6f3a', { position: [0, 1.9, -1.1] });
  k.box(2.1, 0.6, 0.1, '#c9e2f0', { position: [0, 2.1, -1.8], pattern: Pattern.Glass });
  for (const z of [-0.2, 1.8]) k.box(2.1, 0.1, 0.1, INK, { position: [0, 2.8, z] });
  for (const x of [-1.05, 1.05]) k.box(0.1, 1.2, 2.1, INK, { position: [x, 2.2, 0.8] });
  for (const z of [-1.4, 1.4]) for (const x of [-1.05, 1.05]) k.cylinder(0.45, 0.45, 0.35, 10, INK, { position: [x, 0.45, z], rotation: [0, 0, Math.PI / 2] });
  k.cylinder(0.45, 0.45, 0.3, 10, INK, { position: [0, 1.3, 2.3], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.01, 206);
}

/** A leopard lounging on a rock (Yala). */
export function buildLeopardOnRock(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(4, '#9a8f84', { position: [0, 2, 0], scale: [1.3, 0.6, 1], detail: 2, pattern: Pattern.Stone });
  const fur = '#e0a94a';
  k.blob(0.6, fur, { position: [0, 4.6, 0], scale: [1, 0.7, 2.2], detail: 1 });
  k.blob(0.42, fur, { position: [0, 4.9, -1.5], detail: 1 });
  for (const s of [-1, 1]) k.cylinder(0.05, 0.12, 0.25, 4, fur, { position: [s * 0.25, 5.3, -1.5] });
  k.cylinder(0.08, 0.14, 1.8, 6, fur, { position: [0.4, 4.2, 1.6], rotation: [0.8, 0, -0.6] });
  for (let i = 0; i < 18; i++) k.blob(0.07, INK, { position: [rnd.range(-0.45, 0.45), 4.85 + rnd.range(-0.1, 0.1), rnd.range(-1.2, 1.2)], detail: 0 });
  return k.build(0.02, 207);
}

/** A peacock with its tail fanned. */
export function buildPeacock(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.35, '#2d4f9e', { position: [0, 0.8, 0], scale: [0.8, 1, 1.2], detail: 1 });
  k.cylinder(0.08, 0.1, 0.7, 6, '#2d6fb7', { position: [0, 1.3, -0.25] });
  k.blob(0.12, '#2d6fb7', { position: [0, 1.7, -0.3], detail: 0 });
  for (let i = 0; i < 13; i++) {
    const a = -1.2 + (i / 12) * 2.4;
    k.box(0.12, 1.8, 0.05, '#3a8a5a', { position: [Math.sin(a) * 0.9, 1.4 + Math.cos(a) * 0.9 * 0.6, 0.5], rotation: [0, 0, -a] });
    k.blob(0.1, '#3a4faa', { position: [Math.sin(a) * 1.7, 1.4 + Math.cos(a) * 1.6 * 0.6, 0.52], detail: 0 });
  }
  for (const s of [-0.1, 0.1]) k.cylinder(0.03, 0.03, 0.5, 4, '#8a7a5a', { position: [s, 0.25, 0] });
  return k.build(0.01, 208);
}

/** A dry-zone tree (Yala's scrub): short trunk, flat spreading crown. */
export function buildScrubTree(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.3, 0.45, 3, 6, '#6a5040', { position: [0, 1.5, 0], rotation: [rnd.range(-0.15, 0.15), 0, rnd.range(-0.15, 0.15)] });
  for (let i = 0; i < 4; i++) k.blob(rnd.range(1.4, 2.2), '#7a8a3a', { position: [rnd.range(-1.5, 1.5), 3.4 + rnd.range(0, 0.6), rnd.range(-1.5, 1.5)], scale: [1.3, 0.45, 1.3], detail: 1, pattern: Pattern.Leaves });
  return k.build(0.03, Math.round(rnd.next() * 100));
}

/** The Galle lighthouse: white tower with a lantern room on the fort bastion. */
export function buildGalleLighthouse(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(3, 3.6, 24, 16, '#fbf8f2', { position: [0, 12, 0] });
  k.cylinder(3.8, 3.8, 0.5, 16, INK, { position: [0, 24.3, 0] });
  k.cylinder(2.2, 2.2, 3, 16, '#fff3c4', { position: [0, 26, 0], pattern: Pattern.Glass, nightGlow: 1 });
  k.add(new THREE.ConeGeometry(2.8, 2.4, 16), '#b0452a', { position: [0, 28.7, 0] });
  for (let y = 5; y < 22; y += 5) k.box(1, 1.4, 0.1, '#3f4f78', { position: [0, y, 3.35] });
  return k.build(0.02, 209);
}

/** Galle Fort's rampart wall with a bastion (the road runs along its top). */
export function buildRampart(length: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, height, 10, '#9a9384', { position: [0, height / 2, 0], pattern: Pattern.Stone });
  for (let x = -length / 2 + 2; x < length / 2; x += 4) k.box(2, 1.2, 1.2, '#8a8374', { position: [x, height + 0.6, 4.6], pattern: Pattern.Stone });
  return k.build(0.05, Math.round(length));
}

/** A stilt fisherman on his pole in the surf. */
export function buildStiltFisher(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.12, 0.15, 5, 6, '#7a5a3a', { position: [0, 2.5, 0], rotation: [0, 0, 0.12] });
  k.box(0.8, 0.08, 0.12, '#7a5a3a', { position: [0.3, 3.8, 0] });
  k.blob(0.35, '#e8559a', { position: [0.3, 4.4, 0], scale: [0.8, 1.2, 0.8], detail: 0 });
  k.blob(0.2, '#8a5a3a', { position: [0.3, 4.95, 0], detail: 0 });
  k.cylinder(0.2, 0.2, 0.08, 8, '#e8c872', { position: [0.3, 5.15, 0] });
  k.cylinder(0.02, 0.02, 3.2, 3, INK, { position: [1.4, 4.2, 0], rotation: [0, 0, -1.1] });
  return k.build(0.01, 210);
}

/** Colombo's Independence Memorial Hall: an open stone pavilion with a tiered roof. */
export function buildIndependenceHall(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(30, 2, 20, '#e8dfcc', { position: [0, 1, 0], pattern: Pattern.Stone });
  for (let x = -12; x <= 12; x += 4) for (const z of [-7, 7]) k.cylinder(0.7, 0.8, 8, 10, '#f2ead8', { position: [x, 6, z] });
  k.box(28, 1.2, 18, '#f2ead8', { position: [0, 10.4, 0] });
  k.add(new THREE.CylinderGeometry(0.7, 1, 1, 4, 1).rotateY(Math.PI / 4), '#b0452a', { position: [0, 13, 0], scale: [20, 4, 14], pattern: Pattern.RoofTiles });
  k.add(new THREE.CylinderGeometry(0.5, 0.8, 1, 4, 1).rotateY(Math.PI / 4), '#b0452a', { position: [0, 16.5, 0], scale: [11, 3, 7.5], pattern: Pattern.RoofTiles });
  return k.build(0.04, 211);
}
