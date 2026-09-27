import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';
import { archWall } from './LandmarksSriLanka';

/**
 * Landmarks for Chapter 6 · City Lights (Paris, London, Venice, Amsterdam,
 * Barcelona, Istanbul, Dubai) and Chapter 7 · Skylines (New York, San
 * Francisco, Rio, Tokyo, Singapore, Sydney). Painted, simplified shapes that
 * read at a glance from the road; not architectural surveys.
 */

const INK = '#2b2622';
const GOLD = '#d4a943';
const GLASS = '#9fc3dc';

// ————— Paris —————

/** The Eiffel Tower: four splayed lattice legs, two platforms and the spire. Base at 0, ~110 m tall. */
export function buildEiffelTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  const iron = '#8a6a4a';
  const legs = (y0: number, y1: number, r0: number, r1: number, t: number): void => {
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const p0 = new THREE.Vector3(Math.cos(a) * r0, y0, Math.sin(a) * r0);
      const p1 = new THREE.Vector3(Math.cos(a) * r1, y1, Math.sin(a) * r1);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const len = p0.distanceTo(p1);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      const e = new THREE.Euler().setFromQuaternion(q);
      k.box(t, len, t, iron, { position: [mid.x, mid.y, mid.z], rotation: [e.x, e.y, e.z], pattern: Pattern.Planks });
      // Cross-bracing on each face.
      for (let j = 1; j < 4; j++) {
        const f = j / 4;
        const y = y0 + (y1 - y0) * f;
        const r = r0 + (r1 - r0) * f;
        k.box(r * 1.35, t * 0.35, t * 0.35, iron, { position: [0, y, 0], rotation: [0, a + Math.PI / 4, 0] });
      }
    }
  };
  legs(0, 38, 26, 12, 3.4);
  k.box(30, 2, 30, iron, { position: [0, 38, 0] });
  // The big arches between the legs.
  for (let i = 0; i < 4; i++) k.add(new THREE.TorusGeometry(13, 0.8, 4, 16, Math.PI), iron, { position: [0, 16, 0], rotation: [0, (i * Math.PI) / 2, 0] });
  legs(38, 76, 12, 5, 2.2);
  k.box(13, 1.6, 13, iron, { position: [0, 76, 0] });
  k.cylinder(1.4, 3.2, 30, 4, iron, { position: [0, 91, 0], rotation: [0, Math.PI / 4, 0] });
  k.box(5, 3, 5, iron, { position: [0, 106, 0] });
  k.cylinder(0.3, 0.5, 8, 5, iron, { position: [0, 112, 0] });
  k.blob(0.8, '#fff1b0', { position: [0, 116, 0], detail: 0, nightGlow: 1 });
  return k.build(0.05, 61);
}

/** The Arc de Triomphe. */
export function buildArcDeTriomphe(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#e6dcc6';
  k.add(archWall(45, 50, 22, 1, 15, 29), stone, { pattern: Pattern.Stone });
  k.add(archWall(22, 30, 45, 1, 8, 18).rotateY(Math.PI / 2), stone, { pattern: Pattern.Stone });
  k.box(47, 4, 24, '#d6c9ae', { position: [0, 51, 0] });
  for (const s of [-1, 1]) k.box(10, 14, 0.8, '#cbbd9f', { position: [s * 15, 20, 11.4] });
  return k.build(0.1, 62);
}

/** A Parisian café awning front with a zinc mansard roof on top (Haussmann style). */
export function buildHaussmann(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(10, 14);
  const h = rnd.range(16, 20);
  const d = 10;
  k.box(w, h, d, '#efe3cb', { position: [0, h / 2, 0], pattern: Pattern.Stone });
  // Balcony band on the second and fifth floors.
  for (const y of [7, 15.5]) k.box(w + 0.4, 0.4, 1, INK, { position: [0, y, d / 2 + 0.4] });
  for (let x = -w / 2 + 1.6; x < w / 2 - 1; x += 2.4) for (let y = 4.5; y < h - 1; y += 3.2) k.box(1.2, 2, 0.1, '#6f86a8', { position: [x, y, d / 2 + 0.05], nightGlow: rnd.chance(0.3) ? 1 : 0 });
  // Mansard roof with dormers.
  k.add(new THREE.CylinderGeometry(0.72, 1, 1, 4, 1).rotateY(Math.PI / 4), '#7f8ea0', { position: [0, h + 2, 0], scale: [w * 0.72, 4, d * 0.72], pattern: Pattern.RoofTiles });
  for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3) k.gable(1.4, 1, 1.2, '#efe3cb', { position: [x, h + 2, d / 2 - 0.8] });
  // The café on the ground floor: a striped awning.
  const stripe = rnd.pick(['#b0352a', '#2d6f4f', '#2d4f8f']);
  for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) k.box(0.6, 0.08, 2.2, (Math.round(x * 10) % 2 ? stripe : '#f6f0e4'), { position: [x, 3.4, d / 2 + 1], rotation: [0.35, 0, 0] });
  return k.build(0.03, Math.round(w * 13));
}

// ————— London —————

/** The Elizabeth Tower (Big Ben): clock faces, a gilded belfry and a spire. */
export function buildBigBen(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d9c49a';
  k.box(12, 55, 12, stone, { position: [0, 27.5, 0], pattern: Pattern.Sandstone });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const n = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    k.cylinder(4.4, 4.4, 0.6, 24, '#f6f0e4', { position: [n.x * 6.2, 62, n.z * 6.2], rotation: [Math.PI / 2, a, 0], nightGlow: 1 });
    k.add(new THREE.TorusGeometry(4.6, 0.35, 4, 24), GOLD, { position: [n.x * 6.4, 62, n.z * 6.4], rotation: [0, a, 0] });
    k.box(0.3, 3.4, 0.3, INK, { position: [n.x * 6.6, 63.2, n.z * 6.6], rotation: [0, a, 0] });
  }
  k.box(13, 14, 13, stone, { position: [0, 62, 0], pattern: Pattern.Sandstone });
  k.box(11, 8, 11, GOLD, { position: [0, 73, 0] });
  k.add(new THREE.ConeGeometry(7.5, 22, 4).rotateY(Math.PI / 4), '#4f5d6a', { position: [0, 88, 0], pattern: Pattern.RoofTiles });
  k.cylinder(0.2, 0.4, 6, 5, GOLD, { position: [0, 102, 0] });
  for (const x of [-5.5, 5.5]) for (const z of [-5.5, 5.5]) k.cylinder(0.3, 0.8, 7, 5, stone, { position: [x, 58.5, z] });
  return k.build(0.05, 71);
}

/** Tower Bridge: two Gothic towers, the road deck (the player drives it) and the high walkways. */
export function buildTowerBridge(span: number, deckY: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d6ccb4';
  const blue = '#5f8fb4';
  for (const s of [-1, 1]) {
    const x = (s * span) / 2;
    k.box(14, deckY + 38, 14, stone, { position: [x, (deckY + 38) / 2 - 6, 0], pattern: Pattern.Stone });
    for (const dx of [-6, 6]) for (const dz of [-6, 6]) k.add(new THREE.ConeGeometry(1.6, 7, 4), '#5a6470', { position: [x + dx, deckY + 36, dz], rotation: [0, Math.PI / 4, 0] });
    k.add(new THREE.ConeGeometry(6, 10, 4).rotateY(Math.PI / 4), '#5a6470', { position: [x, deckY + 38, 0], pattern: Pattern.RoofTiles });
    k.add(archWall(10, 14, 14.4, 1, 6, 10), stone, { position: [x, deckY - 1, 0], rotation: [0, Math.PI / 2, 0] });
  }
  for (const z of [-2.5, 2.5]) k.box(span - 14, 4, 2.4, blue, { position: [0, deckY + 30, z] });
  // Suspension chains to the shore.
  for (const s of [-1, 1]) for (const z of [-7, 7]) {
    const x0 = (s * span) / 2;
    const x1 = x0 + s * 50;
    k.box(Math.hypot(50, 26), 1.2, 1, blue, { position: [(x0 + x1) / 2, deckY + 14, z], rotation: [0, 0, s * Math.atan2(26, 50)] });
  }
  return k.build(0.06, 72);
}

/** The London Eye wheel (spun by the decorator) — rim, spokes and capsules; axis along X. */
export function buildLondonEyeWheel(radius: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.add(new THREE.TorusGeometry(radius, 0.8, 6, 48).rotateY(Math.PI / 2), '#e9edf2', {});
  k.add(new THREE.TorusGeometry(radius * 0.92, 0.4, 5, 48).rotateY(Math.PI / 2), '#cfd6df', {});
  for (let i = 0; i < 16; i++) k.box(0.3, radius * 2, 0.3, '#cfd6df', { rotation: [(i * Math.PI) / 16, 0, 0] });
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    k.blob(1.3, '#dff1ff', { position: [0, Math.cos(a) * radius, Math.sin(a) * radius], scale: [1.4, 0.9, 1], detail: 1, pattern: Pattern.Glass, nightGlow: i % 2 });
  }
  k.cylinder(2, 2, 3, 12, '#cfd6df', { rotation: [0, 0, Math.PI / 2] });
  return k.build(0.02, 73);
}

/** The London Eye's A-frame legs (static). */
export function buildLondonEyeFrame(radius: number): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const z of [-radius * 0.55, radius * 0.1]) k.box(1.4, radius * 1.1, 1.4, '#cfd6df', { position: [-2, radius * 0.52, z], rotation: [z < 0 ? 0.5 : -0.1, 0, 0] });
  k.box(40, 1.5, 12, '#bfc6cf', { position: [0, 0.75, 0] });
  return k.build(0.02, 74);
}

/** A red London double-decker bus. */
export function buildDoubleDecker(): THREE.BufferGeometry {
  const k = new ModelKit();
  const red = '#d0282a';
  k.box(2.6, 4.3, 10, red, { position: [0, 2.6, 0] });
  for (const y of [2.2, 4.1]) k.box(2.64, 1, 9, '#c9e2f0', { position: [0, y, 0.2], pattern: Pattern.Glass, nightGlow: 1 });
  k.box(2.66, 0.25, 10, '#f6f0e4', { position: [0, 3.25, 0] });
  for (const z of [-3.4, 3.2]) for (const x of [-1.25, 1.25]) k.cylinder(0.55, 0.55, 0.4, 12, INK, { position: [x, 0.55, z], rotation: [0, 0, Math.PI / 2] });
  return k.build(0.02, 75);
}

/** A red telephone box. */
export function buildPhoneBox(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.1, 2.6, 1.1, '#d0282a', { position: [0, 1.3, 0] });
  k.box(1.2, 0.3, 1.2, '#d0282a', { position: [0, 2.7, 0] });
  for (let i = 0; i < 4; i++) k.box(0.8, 1.5, 0.05, '#c9e2f0', { position: [Math.sin((i * Math.PI) / 2) * 0.56, 1.5, Math.cos((i * Math.PI) / 2) * 0.56], rotation: [0, (i * Math.PI) / 2, 0], nightGlow: 1 });
  return k.build(0.01, 76);
}

// ————— Venice —————

/** A gondola with its oarsman's post. */
export function buildGondola(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.4, 0.6, 10, INK, { position: [0, 0.3, 0] });
  for (const s of [-1, 1]) k.box(0.5, 0.6, 1.6, INK, { position: [0, 0.8, s * 5.3], rotation: [s * -0.6, 0, 0] });
  k.box(0.1, 1.1, 0.5, '#cfd6df', { position: [0, 1.6, -5.9] });
  k.box(1.2, 0.3, 2, '#b0352a', { position: [0, 0.75, 0.5] });
  k.cylinder(0.05, 0.05, 3, 4, '#c8955a', { position: [0.3, 1.8, 3.6], rotation: [0, 0, 0.4] });
  return k.build(0.01, 81);
}

/** The Campanile of St Mark's: a brick tower, an arcaded belfry and a green spire. */
export function buildCampanile(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(12, 50, 12, '#b85a3a', { position: [0, 25, 0], pattern: Pattern.Brick });
  k.add(archWall(12.6, 8, 12.6, 4, 2, 6), '#efe3cb', { position: [0, 50, 0] });
  k.add(archWall(12.6, 8, 12.6, 4, 2, 6).rotateY(Math.PI / 2), '#efe3cb', { position: [0, 50, 0] });
  k.box(13, 1.2, 13, '#efe3cb', { position: [0, 58.6, 0] });
  k.box(10, 7, 10, '#efe3cb', { position: [0, 62.5, 0] });
  k.add(new THREE.ConeGeometry(7, 18, 4).rotateY(Math.PI / 4), '#5f9a7a', { position: [0, 75, 0] });
  k.blob(0.9, GOLD, { position: [0, 85, 0], detail: 0 });
  return k.build(0.05, 82);
}

/** A Venetian palazzo facing the canal: pointed Gothic windows and a water door. */
export function buildPalazzo(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(9, 14);
  const h = rnd.range(12, 17);
  const wall = rnd.pick(['#e8b98a', '#d98c6a', '#f0d6a8', '#e6c3c3', '#c9a07a']);
  k.box(w, h, 9, wall, { position: [0, h / 2, 0], pattern: Pattern.Brick });
  for (let x = -w / 2 + 1.4; x < w / 2 - 1; x += 1.8) for (const y of [5, 9]) {
    k.box(1, 2.2, 0.1, '#3f4f78', { position: [x, y, 4.55], nightGlow: rnd.chance(0.3) ? 1 : 0 });
    k.add(new THREE.ConeGeometry(0.72, 0.8, 4), '#f6f0e4', { position: [x, y + 1.4, 4.5], rotation: [0, Math.PI / 4, 0], scale: [1, 1, 0.1] });
  }
  k.box(w * 0.9, 0.3, 1.2, '#f6f0e4', { position: [0, 7.2, 5] });
  k.box(2.4, 3, 0.1, '#5a3a22', { position: [0, 1.5, 4.55] });
  k.box(w + 0.5, 0.5, 9.5, '#f6f0e4', { position: [0, h, 0] });
  // Mooring poles.
  for (const x of [-1.8, 1.8]) k.cylinder(0.15, 0.15, 4, 6, x > 0 ? '#2d4f8f' : '#f6f0e4', { position: [x, 1.4, 6.5] });
  return k.build(0.03, Math.round(w * 17));
}

// ————— Amsterdam —————

/** A narrow canal house with a stepped or bell gable and a hoisting beam. */
export function buildCanalHouse(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(4.2, 6);
  const h = rnd.range(11, 15);
  const wall = rnd.pick(['#6a3a2a', '#3a3f4a', '#8a4a32', '#2f4a3a', '#c9a07a', '#f6f0e4']);
  k.box(w, h, 9, wall, { position: [0, h / 2, 0], pattern: Pattern.Brick });
  for (let x = -w / 2 + 1; x < w / 2 - 0.6; x += 1.6) for (let y = 2; y < h - 1; y += 3) k.box(1, 2, 0.1, '#f6f0e4', { position: [x, y, 4.55] }), k.box(0.8, 1.7, 0.12, '#4f6f88', { position: [x, y, 4.56], nightGlow: rnd.chance(0.3) ? 1 : 0 });
  if (rnd.chance(0.5)) {
    // Stepped gable.
    for (let i = 0; i < 4; i++) k.box(w - i * (w / 4.5), 1.1, 1, wall, { position: [0, h + 0.55 + i * 1.1, 4.1], pattern: Pattern.Brick });
  } else {
    k.blob(w / 2.4, wall, { position: [0, h + 0.5, 4.1], scale: [1, 1.2, 0.2], detail: 1 });
  }
  k.box(0.2, 0.2, 1.2, INK, { position: [0, h + 1.6, 4.9] });
  return k.build(0.02, Math.round(h * 11));
}

/** A Dutch windmill: a tall tapered tower and four lattice sails (spun by the decorator). */
export function buildDutchMillTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(3, 5, 16, 8, '#4f5a4a', { position: [0, 8, 0], pattern: Pattern.Planks });
  k.box(12, 0.3, 12, '#6a5a4a', { position: [0, 6, 0] });
  k.add(new THREE.ConeGeometry(3.6, 4, 8), '#3a3f3a', { position: [0, 18, 0], pattern: Pattern.Thatch });
  return k.build(0.02, 83);
}

export function buildDutchMillSails(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.box(0.4, 11, 0.3, '#5a3a22', { position: [0, Math.cos(a) * 5.5, Math.sin(a) * 5.5], rotation: [a, 0, 0] });
    k.box(0.1, 9, 1.8, '#f6f0e4', { position: [0, Math.cos(a) * 6, Math.sin(a) * 6 + Math.cos(a) * 1], rotation: [a, 0, 0] });
  }
  return k.build(0.01, 84);
}

/** A strip of tulips in one colour. */
export function buildTulipRow(colour: string, length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.3, 2.4, '#4f8a3a', { position: [0, 0.15, 0], pattern: Pattern.Grass });
  for (let x = -length / 2 + 0.3; x < length / 2; x += 0.55) for (const z of [-0.7, 0, 0.7]) k.blob(0.18, colour, { position: [x + (z * 0.3), 0.7, z], scale: [0.8, 1.2, 0.8], detail: 0 });
  return k.build(0.01, Math.round(length));
}

// ————— Barcelona —————

/** The Sagrada Família: a cluster of tall, porous spires with bright finials. */
export function buildSagradaFamilia(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#cdbb98';
  k.box(40, 22, 30, stone, { position: [0, 11, 0], pattern: Pattern.Sandstone });
  const spire = (x: number, z: number, h: number, r: number): void => {
    k.cylinder(r * 0.35, r, h, 12, stone, { position: [x, 22 + h / 2, z], pattern: Pattern.Sandstone });
    for (let y = 6; y < h - 4; y += 4) k.cylinder(r * 0.5, r * 0.5, 0.6, 12, '#b8a680', { position: [x, 22 + y, z] });
    k.blob(r * 0.55, rnd.pick(['#e0432f', '#f4d23b', '#3e86c9', '#5dbb3f']), { position: [x, 22 + h + 0.8, z], detail: 1 });
  };
  for (const x of [-12, -4, 4, 12]) spire(x, -13, 48 + Math.abs(x) * -0.8, 2.6);
  for (const x of [-12, -4, 4, 12]) spire(x, 13, 42 - Math.abs(x) * 0.5, 2.4);
  spire(0, 0, 80, 5);
  for (const x of [-9, 9]) spire(x, 0, 62, 3.6);
  return k.build(0.08, 85);
}

/** A Park Güell mosaic bench / wall: a wavy strip of bright tiles. */
export function buildMosaicBench(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#e0432f', '#f4d23b', '#3e86c9', '#5dbb3f', '#f6f0e4', '#e8559a', '#f08a2e'];
  for (let i = 0; i < length; i++) k.box(1.05, 1 + Math.sin(i * 0.8) * 0.25, 1.2, colours[(i * 5) % colours.length], { position: [i - length / 2, 0.6, Math.sin(i * 0.5) * 1.2] });
  return k.build(0.02, length);
}

// ————— Istanbul —————

/** A grand mosque: stacked domes and slender minarets (after the Blue Mosque). */
export function buildMosque(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#e3dccd';
  const lead = '#8e9aa8';
  k.box(46, 16, 46, stone, { position: [0, 8, 0], pattern: Pattern.Stone });
  k.cylinder(15, 15, 6, 24, stone, { position: [0, 19, 0] });
  k.blob(15, lead, { position: [0, 22, 0], scale: [1, 0.72, 1], detail: 2, roughness: 0 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    k.blob(8, lead, { position: [Math.sin(a) * 15, 17, Math.cos(a) * 15], scale: [1, 0.6, 1], detail: 2, roughness: 0 });
    const c = (i * Math.PI) / 2 + Math.PI / 4;
    k.blob(4.5, lead, { position: [Math.sin(c) * 18, 17, Math.cos(c) * 18], scale: [1, 0.6, 1], detail: 1, roughness: 0 });
  }
  k.cylinder(0.3, 0.3, 5, 5, GOLD, { position: [0, 35, 0] });
  // Six minarets.
  for (const [x, z] of [[-28, -28], [28, -28], [-28, 28], [28, 28], [-40, 0], [40, 0]]) {
    k.cylinder(1.4, 1.6, 50, 12, stone, { position: [x, 25, z] });
    for (const y of [20, 32, 42]) k.cylinder(2.3, 2.3, 0.8, 12, stone, { position: [x, y, z] });
    k.add(new THREE.ConeGeometry(1.5, 8, 12), lead, { position: [x, 54, z] });
  }
  return k.build(0.06, 86);
}

/** The Galata Tower: a round stone tower with a conical cap. */
export function buildGalataTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(7, 8, 44, 20, '#cdbfa6', { position: [0, 22, 0], pattern: Pattern.Stone });
  k.cylinder(8.4, 8.4, 3, 20, '#b8a888', { position: [0, 45, 0] });
  for (let i = 0; i < 12; i++) k.box(1.2, 2, 0.2, '#3f4f78', { position: [Math.sin((i / 12) * Math.PI * 2) * 7.1, 40, Math.cos((i / 12) * Math.PI * 2) * 7.1], rotation: [0, (i / 12) * Math.PI * 2, 0], nightGlow: 1 });
  k.add(new THREE.ConeGeometry(8.6, 14, 20), '#5a6a7a', { position: [0, 53.5, 0], pattern: Pattern.RoofTiles });
  return k.build(0.04, 87);
}

// ————— Dubai —————

/** The Burj Khalifa: a Y-plan spire stepping back in setbacks to a needle, ~260 m. */
export function buildBurjKhalifa(): THREE.BufferGeometry {
  const k = new ModelKit();
  let y = 0;
  const tiers = 11;
  for (let i = 0; i < tiers; i++) {
    const h = 20 - i * 0.6;
    const r = 13 - i * 1.05;
    for (let w = 0; w < 3; w++) {
      const a = (w * Math.PI * 2) / 3;
      const reach = r * (1 - (i % 3) * 0.12);
      k.box(r * 0.8, h, reach, GLASS, { position: [Math.sin(a) * reach * 0.45, y + h / 2, Math.cos(a) * reach * 0.45], rotation: [0, a, 0], pattern: Pattern.Glass, nightGlow: i % 2 });
    }
    k.cylinder(r * 0.45, r * 0.5, h, 6, '#cfd6df', { position: [0, y + h / 2, 0], pattern: Pattern.Glass });
    y += h;
  }
  k.cylinder(0.6, 2.2, 50, 6, '#e0e6ee', { position: [0, y + 25, 0], pattern: Pattern.Glass });
  k.blob(0.8, '#ff8a6a', { position: [0, y + 51, 0], detail: 0, nightGlow: 1 });
  return k.build(0.05, 91);
}

/** The Burj Al Arab: a white sail on its own island. */
export function buildBurjAlArab(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(26, 30, 3, 24, '#e8d8b0', { position: [0, 1.5, 0] });
  const sail = new THREE.Shape();
  sail.moveTo(0, 0);
  sail.quadraticCurveTo(30, 40, 4, 90);
  sail.lineTo(0, 90);
  sail.closePath();
  k.add(new THREE.ExtrudeGeometry(sail, { depth: 22, bevelEnabled: false }).translate(0, 0, -11), '#f6f7f9', { position: [-8, 3, 0], pattern: Pattern.Glass });
  k.box(3, 96, 3, '#cfd6df', { position: [-9, 51, 0] });
  k.cylinder(7, 7, 1, 16, '#cfd6df', { position: [6, 64, 0] });
  return k.build(0.04, 92);
}

// ————— New York —————

/** The Empire State Building: stepped Art Deco tower and mast. */
export function buildEmpireState(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#d8d0c0';
  const tiers: [number, number, number][] = [[46, 26, 30], [34, 60, 22], [26, 60, 17], [18, 30, 12], [12, 16, 8]];
  let y = 0;
  for (const [w, h, d] of tiers) {
    k.box(w, h, d, stone, { position: [0, y + h / 2, 0], pattern: Pattern.Stone });
    for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2.2) k.box(0.9, h - 2, 0.1, '#6a7f98', { position: [x, y + h / 2, d / 2 + 0.05], nightGlow: (Math.round(x) % 3 === 0 ? 1 : 0) });
    y += h;
  }
  k.cylinder(2, 3, 16, 8, '#cfd6df', { position: [0, y + 8, 0], nightGlow: 1 });
  k.cylinder(0.3, 0.8, 22, 6, '#cfd6df', { position: [0, y + 27, 0] });
  return k.build(0.04, 101);
}

/** The Statue of Liberty on her star-shaped plinth. */
export function buildStatueOfLiberty(): THREE.BufferGeometry {
  const k = new ModelKit();
  const copper = '#7fb8a0';
  k.box(24, 12, 24, '#bfb5a0', { position: [0, 6, 0], pattern: Pattern.Stone });
  k.box(12, 26, 12, '#cfc6b0', { position: [0, 25, 0], pattern: Pattern.Stone });
  k.cylinder(3.2, 5.5, 26, 10, copper, { position: [0, 51, 0] });
  k.blob(2.4, copper, { position: [0, 66, 0], detail: 1 });
  for (let i = 0; i < 7; i++) k.cylinder(0, 0.5, 3, 4, copper, { position: [Math.sin(i - 3) * 2.8, 68.5, Math.cos(i - 3) * 1.2 - 0.6], rotation: [Math.cos(i - 3) * -0.6, 0, Math.sin(i - 3) * 0.7] });
  // Raised arm and torch.
  k.cylinder(0.9, 1, 12, 8, copper, { position: [3.4, 67, 0], rotation: [0, 0, -0.18] });
  k.cylinder(1.4, 0.8, 2, 8, GOLD, { position: [4.6, 74, 0] });
  k.add(new THREE.ConeGeometry(1.2, 3, 8), '#ffb347', { position: [4.6, 76.5, 0], nightGlow: 1 });
  k.box(3, 4, 1, '#6fa890', { position: [-3, 58, -2], rotation: [0.2, 0, 0.3] });
  return k.build(0.05, 102);
}

/** A yellow New York taxi. */
export function buildTaxi(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2, 0.8, 4.6, '#f4c21b', { position: [0, 0.75, 0] });
  k.box(1.8, 0.7, 2.4, '#f4c21b', { position: [0, 1.5, -0.2] });
  k.box(1.82, 0.5, 2.2, '#c9e2f0', { position: [0, 1.5, -0.2], pattern: Pattern.Glass });
  k.box(0.8, 0.25, 0.3, '#f6f0e4', { position: [0, 1.95, -0.2], nightGlow: 1 });
  for (const z of [-1.5, 1.5]) for (const x of [-0.95, 0.95]) k.cylinder(0.38, 0.38, 0.3, 10, INK, { position: [x, 0.38, z], rotation: [0, 0, Math.PI / 2] });
  return k.build(0.01, 103);
}

/** A Times Square wall of glowing billboards. */
export function buildNeonWall(rnd: Random, width: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(width, height, 6, '#3a3a4a', { position: [0, height / 2, 0] });
  const colours = ['#ff4fa0', '#3ef0ff', '#ffcc33', '#5dff7a', '#ff7a3e', '#9a7aff', '#f6f0e4'];
  let y = 4;
  while (y < height - 3) {
    let x = -width / 2 + 0.5;
    const rowH = rnd.range(3, 7);
    while (x < width / 2 - 2) {
      const w = Math.min(rnd.range(4, 10), width / 2 - x - 0.5);
      k.box(w - 0.4, rowH - 0.4, 0.3, rnd.pick(colours), { position: [x + w / 2, y + rowH / 2, 3.1], nightGlow: 1 });
      x += w;
    }
    y += rowH;
  }
  return k.build(0.01, Math.round(width * height));
}

// ————— San Francisco —————

/** One Golden Gate tower (red, two legs with cross-braces). */
export function buildGoldenGateTower(height: number, gap: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const red = '#c0412a';
  for (const s of [-1, 1]) k.box(3.4, height, 4, red, { position: [(s * gap) / 2, height / 2, 0] });
  for (const y of [height * 0.35, height * 0.6, height * 0.82, height * 0.98]) k.box(gap + 3.4, 3, 3.6, red, { position: [0, y, 0] });
  return k.build(0.02, 111);
}

/** A main cable swooping from tower top down to the deck and up again (along Z, length `span`). */
export function buildCableSag(span: number, top: number, low: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const y = (t: number): number => low + (top - low) * (2 * t - 1) ** 2;
    const z0 = -span / 2 + t0 * span;
    const z1 = -span / 2 + t1 * span;
    const a = Math.atan2(y(t1) - y(t0), z1 - z0);
    k.box(0.8, 0.8, Math.hypot(z1 - z0, y(t1) - y(t0)), '#c0412a', { position: [0, (y(t0) + y(t1)) / 2, (z0 + z1) / 2], rotation: [-a, 0, 0] });
    if (i % 2 === 0) k.box(0.15, y(t0) - low + 2, 0.15, '#c0412a', { position: [0, (y(t0) + low - 2) / 2, z0] });
  }
  return k.build(0, 112);
}

/** A San Francisco cable car. */
export function buildCableCar(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.4, 2.6, 8, '#b0352a', { position: [0, 1.9, 0] });
  k.box(2.46, 1, 7.2, '#c9e2f0', { position: [0, 2.4, 0], pattern: Pattern.Glass, nightGlow: 1 });
  k.box(2.6, 0.2, 8.2, '#f4d23b', { position: [0, 3.3, 0] });
  k.box(2.7, 0.3, 8.4, '#3a3a3a', { position: [0, 3.5, 0] });
  for (const z of [-2.6, 2.6]) for (const x of [-0.9, 0.9]) k.cylinder(0.4, 0.4, 0.2, 10, INK, { position: [x, 0.4, z], rotation: [0, 0, Math.PI / 2] });
  return k.build(0.01, 113);
}

/** A painted-lady Victorian house (steep bay-windowed row house). */
export function buildPaintedLady(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const wall = rnd.pick(['#f2b8c6', '#9fd3c7', '#f6e29a', '#c3b1e1', '#f7c59f', '#a8d0f0']);
  const w = 6;
  k.box(w, 10, 9, wall, { position: [0, 5, 0], pattern: Pattern.Planks });
  k.box(2.6, 7, 1.6, wall, { position: [-1.4, 4.5, 5.2], pattern: Pattern.Planks });
  k.gable(w + 0.4, 3.4, 9.4, shadeHex(wall), { position: [0, 11.7, 0] });
  for (const y of [3, 6.5]) k.box(1.8, 2, 0.1, '#3f4f78', { position: [-1.4, y, 6.05], nightGlow: rnd.chance(0.3) ? 1 : 0 });
  k.box(w + 0.2, 0.3, 9.2, '#f6f0e4', { position: [0, 10, 0] });
  return k.build(0.02, Math.round(rnd.next() * 100));
}

function shadeHex(hex: string): string {
  const c = new THREE.Color(hex).multiplyScalar(0.7);
  return `#${c.getHexString()}`;
}

// ————— Rio de Janeiro —————

/** Sugarloaf Mountain: a steep rounded dome of rock with green on its flanks. */
export function buildSugarloaf(height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(height * 0.55, '#8a8f86', { position: [0, height * 0.42, 0], scale: [0.8, 1.05, 0.7], detail: 2, pattern: Pattern.Stone, roughness: 0.08 });
  k.blob(height * 0.5, '#5a8f4a', { position: [height * 0.18, height * 0.2, 0], scale: [0.9, 0.5, 0.8], detail: 2, pattern: Pattern.Leaves });
  return k.build(0.05, 121);
}

/** Copacabana's wave promenade: black and white wavy bands. */
export function buildWavePavement(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.12, 6, '#f6f0e4', { position: [0, 0.06, 0] });
  for (let x = -length / 2; x < length / 2; x += 0.8) for (let row = 0; row < 3; row++) {
    const z = -2 + row * 2 + Math.sin((x / length) * Math.PI * 16 + row) * 0.6;
    k.box(0.85, 0.14, 0.5, INK, { position: [x, 0.08, z] });
  }
  return k.build(0, Math.round(length));
}

/** A beach umbrella. */
export function buildBeachUmbrella(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.05, 0.05, 2.4, 5, '#f6f0e4', { position: [0, 1.2, 0] });
  k.cylinder(0, 1.5, 0.6, 10, colour, { position: [0, 2.5, 0] });
  return k.build(0.01, 122);
}

// ————— Tokyo —————

/** Tokyo Tower: red and white lattice with two observation decks. */
export function buildTokyoTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  const bands = 10;
  for (let i = 0; i < bands; i++) {
    const y0 = i * 11;
    const r = 18 - i * 1.6;
    const colour = i % 2 ? '#f6f0e4' : '#e0432f';
    for (let j = 0; j < 4; j++) {
      const a = Math.PI / 4 + (j * Math.PI) / 2;
      k.box(1.6, 11.4, 1.6, colour, { position: [Math.cos(a) * r, y0 + 5.5, Math.sin(a) * r], rotation: [Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14] });
    }
    k.box(r * 1.5, 0.6, r * 1.5, colour, { position: [0, y0 + 11, 0], rotation: [0, 0, 0] });
  }
  k.box(12, 6, 12, '#f6f0e4', { position: [0, 55, 0], nightGlow: 1 });
  k.box(7, 4, 7, '#e0432f', { position: [0, 88, 0], nightGlow: 1 });
  k.cylinder(0.4, 1.2, 30, 6, '#e0432f', { position: [0, 125, 0] });
  return k.build(0.03, 131);
}

/** A tall vertical neon sign board. */
export function buildNeonSign(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = rnd.pick(['#ff4fa0', '#3ef0ff', '#ffcc33', '#5dff7a', '#ff7a3e']);
  k.box(1.6, 8, 0.4, '#2b2b35', { position: [0, 6, 0] });
  for (let i = 0; i < 5; i++) k.box(1.2, 1.1, 0.5, i % 2 ? c : '#f6f0e4', { position: [0, 2.8 + i * 1.5, 0], nightGlow: 1 });
  return k.build(0.01, Math.round(rnd.next() * 100));
}

/** A vending machine (Japan's roadside kind). */
export function buildVendingMachine(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.1, 1.9, 0.8, '#f6f0e4', { position: [0, 0.95, 0] });
  k.box(0.9, 0.9, 0.1, '#c9e2f0', { position: [0, 1.35, 0.42], nightGlow: 1 });
  for (let i = 0; i < 6; i++) k.box(0.1, 0.25, 0.12, ['#e0432f', '#3e86c9', '#5dbb3f'][i % 3], { position: [-0.3 + (i % 3) * 0.3, 1.2 + Math.floor(i / 3) * 0.35, 0.45], nightGlow: 1 });
  return k.build(0.01, 132);
}

// ————— Singapore —————

/** Marina Bay Sands: three leaning towers under a boat-shaped SkyPark. */
export function buildMarinaBaySands(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const x of [-26, 0, 26]) {
    for (const s of [-1, 1]) k.box(14, 72, 9, '#dfe6ee', { position: [x, 36, s * 5], rotation: [s * 0.08, 0, 0], pattern: Pattern.Glass, nightGlow: 1 });
  }
  k.box(96, 4, 16, '#e9edf2', { position: [6, 74, 0] });
  k.add(new THREE.ConeGeometry(8, 22, 3), '#e9edf2', { position: [58, 74, 0], rotation: [0, 0, -Math.PI / 2], scale: [0.5, 1, 1] });
  for (let x = -40; x < 50; x += 6) k.blob(1.2, '#4f9a5a', { position: [x, 77, 4], detail: 0, pattern: Pattern.Leaves });
  k.box(40, 0.6, 5, '#5ab8e0', { position: [0, 76.4, -3], pattern: Pattern.Glass });
  return k.build(0.03, 141);
}

/** A Gardens by the Bay Supertree: a funnel of purple and green that glows at night. */
export function buildSupertree(height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(1.2, 2.4, height * 0.75, 10, '#7a4a8a', { position: [0, height * 0.375, 0], pattern: Pattern.Leaves });
  k.cylinder(height * 0.3, 1.4, height * 0.28, 16, '#8a5a9a', { position: [0, height * 0.86, 0] });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.blob(0.8, i % 2 ? '#ff4fa0' : '#5dff7a', { position: [Math.cos(a) * height * 0.28, height, Math.sin(a) * height * 0.28], detail: 0, nightGlow: 1 });
  }
  return k.build(0.02, Math.round(height));
}

/** The Merlion: a lion's head on a fish's body, spouting water. */
export function buildMerlion(): THREE.BufferGeometry {
  const k = new ModelKit();
  const white = '#ece8e0';
  k.box(6, 3, 6, '#b8b0a4', { position: [0, 1.5, 0], pattern: Pattern.Stone });
  k.cylinder(1.4, 2.4, 6, 10, white, { position: [0, 6, 0], rotation: [0.25, 0, 0] });
  k.blob(2.2, white, { position: [0, 10.5, -1.2], detail: 1 });
  for (let i = 0; i < 8; i++) k.blob(0.8, '#ddd6c8', { position: [Math.sin(i) * 1.8, 11 + Math.cos(i) * 1.6, -0.2], detail: 0 });
  k.cylinder(0.25, 0.6, 7, 6, '#bfe6f5', { position: [0, 9.5, -5], rotation: [1.3, 0, 0], pattern: Pattern.Glass });
  return k.build(0.02, 142);
}

// ————— Sydney —————

/** The Sydney Opera House: interlocking white shell sails on a podium. */
export function buildOperaHouse(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(60, 6, 34, '#d8b48a', { position: [0, 3, 0], pattern: Pattern.Sandstone });
  const shell = (x: number, z: number, h: number, yaw: number): void => {
    const g = new THREE.SphereGeometry(h, 16, 12, 0, Math.PI, 0, Math.PI / 2).scale(0.55, 1, 1).rotateY(Math.PI / 2);
    k.add(g, '#f7f6f2', { position: [x, 6, z], rotation: [0, yaw, 0], pattern: Pattern.RoofTiles });
  };
  for (const [x, h] of [[-20, 20], [-10, 17], [-2, 13]] as const) shell(x, -7, h, 0);
  for (const [x, h] of [[8, 16], [16, 13], [23, 10]] as const) shell(x, 8, h, 0);
  return k.build(0.03, 151);
}

/** Sydney Harbour Bridge: a great steel arch over the water (along X, span). */
export function buildHarbourBridge(span: number, rise: number, deckY: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const steel = '#8e969e';
  const n = 20;
  for (const z of [-7, 7]) for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const y = (t: number): number => rise * 4 * t * (1 - t);
    const x0 = -span / 2 + t0 * span;
    const x1 = -span / 2 + t1 * span;
    const a = Math.atan2(y(t1) - y(t0), x1 - x0);
    k.box(Math.hypot(x1 - x0, y(t1) - y(t0)) + 0.4, 3, 2, steel, { position: [(x0 + x1) / 2, (y(t0) + y(t1)) / 2, z], rotation: [0, 0, a] });
    if (i % 2 === 0 && y(t0) > deckY) k.box(0.6, y(t0) - deckY, 0.6, steel, { position: [x0, (y(t0) + deckY) / 2, z] });
  }
  for (const s of [-1, 1]) k.box(14, deckY + 20, 18, '#cdbb98', { position: [(s * span) / 2, (deckY + 20) / 2, 0], pattern: Pattern.Stone });
  return k.build(0.03, 152);
}

/** A green-and-cream Sydney ferry. */
export function buildFerry(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(6, 2, 22, '#2d6f4f', { position: [0, 1, 0] });
  k.box(5.4, 2.4, 16, '#f2e6c4', { position: [0, 3.2, 0] });
  k.box(5.6, 0.3, 17, '#2d6f4f', { position: [0, 4.5, 0] });
  k.box(3, 1.6, 5, '#f2e6c4', { position: [0, 5.4, 0] });
  for (let z = -7; z <= 7; z += 2) k.box(5.5, 1, 1.4, '#3f4f78', { position: [0, 3.4, z], nightGlow: 1 });
  return k.build(0.02, 153);
}
