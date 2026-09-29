import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Germany: Berlin, Hamburg, the
 * Autobahn, Cologne, the Rhine, Rothenburg, the Black Forest, Munich,
 * Neuschwanstein and the Alps.
 */

const INK = '#2b2622';
const SANDSTONE = '#d8c8a0';
const WHITE = '#f6f0e4';
const BRICK = '#a8503a';
const SLATE = '#4f5a66';

/** The Brandenburg Gate, built across the road with its quadriga on top. `half` is the half-width kept clear for the road. */
export function buildBrandenburgGate(half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = half * 2 + 20;
  // Six Doric columns each side of the central passage (the road runs through the middle).
  const xs: number[] = [];
  for (let i = 0; i < 3; i++) xs.push(half + 1 + i * 3.4);
  for (const s of [-1, 1]) {
    for (const x of xs) for (const z of [-3, 3]) k.cylinder(0.9, 1, 14, 12, SANDSTONE, { position: [s * x, 7, z], pattern: Pattern.Stone });
    k.box(3, 14, 8, SANDSTONE, { position: [s * (half + 10), 7, 0], pattern: Pattern.Stone });
  }
  k.box(w, 3, 9, SANDSTONE, { position: [0, 15.5, 0], pattern: Pattern.Stone });
  k.box(w * 0.5, 3, 7, SANDSTONE, { position: [0, 18.5, 0], pattern: Pattern.Stone });
  // The quadriga: four horses and the chariot, in verdigris copper.
  const green = '#5a9a8a';
  for (let i = 0; i < 4; i++) {
    const x = -2.4 + i * 1.6;
    k.blob(0.7, green, { position: [x, 21.2, 1.2], scale: [0.5, 0.8, 1.3], detail: 0 });
    k.blob(0.35, green, { position: [x, 22.2, 2.3], scale: [0.6, 1, 1], detail: 0 });
  }
  k.box(3, 1.4, 1.6, green, { position: [0, 21, -1] });
  k.cylinder(0.3, 0.4, 2.6, 6, green, { position: [0, 22.8, -1.2] });
  k.cylinder(0.05, 0.05, 2, 4, green, { position: [0.5, 24.4, -1.2] });
  return k.build(0.02, 801);
}

/** The Fernsehturm: Berlin's TV tower, a concrete needle with a sphere. */
export function buildFernsehturm(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(4, 7, 130, 16, '#d8d8d8', { position: [0, 65, 0] });
  k.blob(16, '#b8c0c8', { position: [0, 140, 0], detail: 2, roughness: 0, pattern: Pattern.Glass });
  k.cylinder(16.2, 16.2, 3, 24, '#3a4a5a', { position: [0, 140, 0], nightGlow: 1 });
  k.cylinder(2, 3, 20, 10, '#d8d8d8', { position: [0, 166, 0] });
  k.cylinder(0.7, 1.2, 30, 8, '#e0302a', { position: [0, 190, 0] });
  k.box(40, 10, 10, '#c8c0b8', { position: [0, 5, 0] });
  return k.build(0.01, 802);
}

/** The Reichstag with its glass dome. Faces +Z. */
export function buildReichstag(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(90, 22, 60, SANDSTONE, { position: [0, 11, 0], pattern: Pattern.Stone });
  for (const [x, z] of [[-45, -30], [45, -30], [-45, 30], [45, 30]]) k.box(12, 30, 12, SANDSTONE, { position: [x, 15, z], pattern: Pattern.Stone });
  for (let i = 0; i < 6; i++) k.cylinder(1, 1, 16, 10, '#e0d8c0', { position: [-10 + i * 4, 12, 31] });
  k.gable(30, 5, 4, SANDSTONE, { position: [0, 20, 31], pattern: Pattern.Stone });
  k.blob(16, '#8ab0c8', { position: [0, 22, 0], scale: [1, 1.1, 1], detail: 2, roughness: 0, pattern: Pattern.Glass, nightGlow: 0.6 });
  for (const s of [-1, 1]) k.box(0.4, 1.2, 8, INK, { position: [s * 20, 20, 31] });
  // Black, red and gold on the flagpoles.
  for (const s of [-1, 1]) {
    k.cylinder(0.15, 0.15, 8, 5, INK, { position: [s * 45, 34, 30] });
    for (let i = 0; i < 3; i++) k.box(4, 0.8, 0.1, ['#1a1a1a', '#d8263a', '#f4c23b'][i], { position: [s * 45 + 2, 37.2 - i * 0.8, 30] });
  }
  return k.build(0.02, 803);
}

/** A Speicherstadt warehouse: red brick, stepped gothic gables, green copper turrets. Faces +Z (onto the canal). */
export function buildSpeicher(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(14, 20);
  const h = rnd.range(18, 24);
  k.box(w, h, 16, BRICK, { position: [0, h / 2, 0], pattern: Pattern.Brick });
  for (let f = 0; f < 6; f++) for (let i = 0; i < Math.floor(w / 3); i++) k.box(1.2, 1.8, 0.2, '#3a3230', { position: [-w / 2 + 1.8 + i * 3, 2.5 + f * (h / 6.5), 8.05] });
  for (let i = 0; i < 4; i++) k.box(w - i * 3.4, 1.8, 1, BRICK, { position: [0, h + 0.9 + i * 1.8, 7.6], pattern: Pattern.Brick });
  k.gable(w, 5, 16, '#3f7a6a', { position: [0, h, -0.5], pattern: Pattern.RoofTiles });
  if (rnd.chance(0.5)) {
    k.cylinder(1.4, 1.4, 5, 8, BRICK, { position: [w / 2 - 1, h + 2.5, 7] });
    k.add(new THREE.ConeGeometry(1.8, 4, 8), '#3f7a6a', { position: [w / 2 - 1, h + 7, 7] });
  }
  // A hoist beam over each loading door.
  k.box(0.3, 0.3, 2.2, '#5a3a22', { position: [0, h - 2, 9] });
  return { geometry: k.build(0.02, rnd.int(0, 9999)), width: w, depth: 16, height: h + 8 };
}

/** The Elbphilharmonie: a glass wave-crested hall on a brick warehouse. */
export function buildElbphilharmonie(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(100, 36, 36, BRICK, { position: [0, 18, 0], pattern: Pattern.Brick });
  k.box(100, 50, 36, '#b8c8d8', { position: [0, 61, 0], pattern: Pattern.Glass, nightGlow: 0.5 });
  // The rolling roof: a row of scooped waves.
  for (let i = 0; i < 6; i++) {
    const x = -42 + i * 17;
    k.add(new THREE.CylinderGeometry(9, 9, 36, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(i % 2 ? 0.2 : -0.2), '#e8eef4', { position: [x, 86 + (i % 3) * 4, 0], scale: [1, 0.6 + (i % 2) * 0.4, 1] });
  }
  return k.build(0.02, 804);
}

/** A wind turbine mast and nacelle (the rotor spins separately). Rotor hub at y = `height`. */
export function buildTurbineMast(height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(1, 2.2, height, 12, '#eef0f2', { position: [0, height / 2, 0] });
  k.box(3, 3, 8, '#eef0f2', { position: [0, height, -1.5] });
  return k.build(0.005, 805);
}

/** A three-bladed wind-turbine rotor, spinning about its local Z. */
export function buildTurbineRotor(r: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1.3, '#eef0f2', { position: [0, 0, 0.8], scale: [1, 1, 1.5], detail: 1 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.box(1.4, r, 0.4, '#f6f8fa', { position: [Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.5, 0.6], rotation: [0, 0, -a] });
  }
  k.box(1.5, 2, 0.45, '#e0302a', { position: [0, r - 1, 0.65] });
  return k.build(0.005, 806);
}

/** Cologne Cathedral: the twin gothic spires over a long nave. Facade faces +Z. */
export function buildKolnerDom(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#6a665e';
  k.box(40, 40, 120, stone, { position: [0, 20, -60], pattern: Pattern.Stone });
  k.gable(40, 20, 120, '#4f5866', { position: [0, 40, -60], pattern: Pattern.RoofTiles });
  for (let i = 0; i < 10; i++) for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(1.2, 10, 4), stone, { position: [s * 21, 44, -110 + i * 11] });
  for (const s of [-1, 1]) {
    const x = s * 14;
    k.box(18, 80, 18, stone, { position: [x, 40, 0], pattern: Pattern.Stone });
    k.box(14, 30, 14, stone, { position: [x, 95, 0], pattern: Pattern.Stone });
    k.add(new THREE.ConeGeometry(8, 48, 8), stone, { position: [x, 134, 0], pattern: Pattern.Stone });
    for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) k.add(new THREE.ConeGeometry(1.3, 12, 4), stone, { position: [x + dx, 116, dz] });
    k.box(8, 30, 0.4, '#3a4a6a', { position: [x, 40, 9.1], nightGlow: 0.6, pattern: Pattern.Glass });
  }
  k.box(10, 20, 0.4, '#3a4a6a', { position: [0, 22, 9.1], nightGlow: 0.6, pattern: Pattern.Glass });
  return k.build(0.02, 807);
}

/** A Rhine castle on its crag above the vineyards (Marksburg style). */
export function buildRhineCastle(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(40, '#6a7a4a', { scale: [1.2, 0.8, 1], roughness: 0.2, seed: rnd.int(0, 99), pattern: Pattern.Grass });
  const y = 30;
  k.box(34, 14, 22, '#e8dcc0', { position: [0, y + 7, 0], pattern: Pattern.Stone });
  k.gable(34, 6, 22, SLATE, { position: [0, y + 14, 0], pattern: Pattern.RoofTiles });
  k.box(8, 30, 8, '#e8dcc0', { position: [-8, y + 15, 3], pattern: Pattern.Stone });
  k.add(new THREE.ConeGeometry(6, 8, 4), SLATE, { position: [-8, y + 34, 3], rotation: [0, Math.PI / 4, 0], pattern: Pattern.RoofTiles });
  for (const [x, z] of [[17, 11], [-17, -11], [17, -11]]) {
    k.cylinder(3, 3.2, 18, 10, '#e8dcc0', { position: [x, y + 9, z], pattern: Pattern.Stone });
    k.add(new THREE.ConeGeometry(4, 6, 10), SLATE, { position: [x, y + 21, z], pattern: Pattern.RoofTiles });
  }
  // Vine terraces down the slope.
  for (let i = 0; i < 6; i++) k.box(70, 0.8, 1, '#4f7a2a', { position: [0, 4 + i * 4, 36 - i * 5], pattern: Pattern.Leaves });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A long Rhine barge. Along Z. */
export function buildBarge(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(6, 2.4, 40, rnd.pick(['#2b2622', '#2f4a6a', '#6a2a22']), { position: [0, 1.2, 0] });
  k.box(5.4, 1.4, 30, rnd.pick(['#d8603a', '#3e9fd8', '#f4d23b', '#5a8a5a']), { position: [0, 3, 2] });
  k.box(5, 4, 5, WHITE, { position: [0, 4, -16] });
  k.box(5.1, 0.8, 5.1, '#3a4a5a', { position: [0, 5, -16], nightGlow: 1 });
  return k.build(0.01, rnd.int(0, 9999));
}

/** A rows of vines on a slope, `length` along X. */
export function buildVineyard(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 6; i++) k.box(length, 1.2, 0.6, '#4f8a2a', { position: [0, 0.6, -6 + i * 2.4], pattern: Pattern.Leaves });
  for (let i = 0; i < 6; i++) for (let x = -length / 2; x <= length / 2; x += 3) k.cylinder(0.05, 0.05, 1.6, 3, '#6a4a32', { position: [x, 0.8, -6 + i * 2.4] });
  return k.build(0.02, 808);
}

/** A German Fachwerk (half-timbered) house with a steep roof. Faces +Z. */
export function buildFachwerk(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(6, 8);
  const floors = rnd.int(2, 3);
  const plaster = rnd.pick(['#f4ead0', '#f0d8b0', '#e8c8c0', '#d8e0c8', '#f4e0a0']);
  const beam = rnd.pick(['#5a3a22', '#8a3a2a', '#3a3a3a']);
  for (let f = 0; f < floors; f++) {
    const y = f * 3;
    k.box(w + f * 0.3, 3, 9, plaster, { position: [0, y + 1.5, f * 0.15] });
    const zf = 4.5 + f * 0.15 + 0.03;
    k.box(w + f * 0.3, 0.25, 0.2, beam, { position: [0, y + 2.9, zf] });
    for (let i = 0; i <= 4; i++) k.box(0.22, 3, 0.2, beam, { position: [-w / 2 + (i * w) / 4, y + 1.5, zf] });
    for (let i = 0; i < 4; i += 2) k.box(0.18, 3.4, 0.2, beam, { position: [-w / 2 + ((i + 0.5) * w) / 4, y + 1.5, zf], rotation: [0, 0, i % 4 ? 0.6 : -0.6] });
    if (f > 0) for (const x of [-w / 4, w / 4]) {
      k.box(1, 1.2, 0.15, '#f3dca0', { position: [x, y + 1.6, zf + 0.05], nightGlow: 1 });
      k.box(1.2, 0.3, 0.4, '#e0432f', { position: [x, y + 0.9, zf + 0.2] });
    }
  }
  const top = floors * 3;
  k.gable(w + 1, w * 0.9, 9.6, rnd.pick(['#b8402a', '#8a3a2a', '#a8503a']), { position: [0, top, 0], pattern: Pattern.RoofTiles });
  k.box(1.4, 2.2, 0.2, rnd.pick(['#3f6a3a', '#5a3a22', '#2f4a6a']), { position: [0, 1.1, 4.6] });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w + 1, depth: 9, height: top + w };
}

/** A tall dark Black Forest fir. */
export function buildFir(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = rnd.range(12, 20);
  k.cylinder(0.3, 0.5, h * 0.3, 6, '#4a3228', { position: [0, h * 0.15, 0] });
  for (let i = 0; i < 4; i++) k.add(new THREE.ConeGeometry(h * 0.22 - i * h * 0.04, h * 0.35, 8), rnd.pick(['#2a5a32', '#316a3a', '#24502c']), { position: [0, h * 0.35 + i * h * 0.17, 0], pattern: Pattern.Grass });
  return k.build(0.03, rnd.int(0, 999));
}

/** A Black Forest farmhouse with a huge hipped roof, and a cuckoo clock over the door. Faces +Z. */
export function buildBlackForestHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(12, 16);
  k.box(w, 5, 12, '#f0e8d4', { position: [0, 2.5, 0] });
  k.box(w, 2, 12, '#6a4a32', { position: [0, 6, 0], pattern: Pattern.Planks });
  k.cylinder(0.05, 0.75, 7, 4, '#6a4a3a', { position: [0, 10.5, 0], rotation: [0, Math.PI / 4, 0], scale: [w * 1.2, 1, 16], pattern: Pattern.Thatch });
  for (let i = 0; i < 4; i++) {
    k.box(1.2, 1.2, 0.15, '#f3dca0', { position: [-w / 2 + 2 + i * ((w - 4) / 3), 3, 6.05], nightGlow: 1 });
    k.box(1.4, 0.4, 0.5, '#e0432f', { position: [-w / 2 + 2 + i * ((w - 4) / 3), 2.2, 6.25] });
  }
  // The cuckoo clock.
  k.box(1.6, 2, 0.6, '#5a3a22', { position: [0, 6.4, 6.3] });
  k.gable(2, 0.8, 0.8, '#3a2a1a', { position: [0, 7.4, 6.3] });
  k.cylinder(0.5, 0.5, 0.1, 12, WHITE, { position: [0, 6.5, 6.65], rotation: [Math.PI / 2, 0, 0] });
  k.blob(0.2, '#e0b060', { position: [0, 7.15, 6.8], detail: 0 });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w, depth: 14, height: 14 };
}

/** An Oktoberfest beer tent: blue-and-white striped, with a painted sign. Faces +Z. */
export function buildBeerTent(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(30, 40);
  k.box(w, 8, 24, '#f6f0e4', { position: [0, 4, 0] });
  for (let i = 0; i < Math.floor(w / 2); i++) k.box(1, 8.1, 24.1, '#3e6fa8', { position: [-w / 2 + 1 + i * 2, 4, 0] });
  k.gable(w + 1, 6, 25, '#3e6fa8', { position: [0, 8, 0] });
  k.box(w * 0.5, 3, 0.4, '#f4d23b', { position: [0, 10, 12.4] });
  k.box(w * 0.4, 1.4, 0.2, '#d8263a', { position: [0, 10, 12.7] });
  k.box(6, 5, 0.3, '#5a3a22', { position: [0, 2.5, 12.1] });
  for (let i = 0; i < 6; i++) k.cylinder(0.3, 0.3, 0.1, 8, '#f4a13b', { position: [-w / 2 + 3 + i * (w - 6) / 5, 7.4, 12.2], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
  return k.build(0.02, rnd.int(0, 9999));
}

/** The Frauenkirche: Munich's twin brick towers with green onion domes. */
export function buildFrauenkirche(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(30, 30, 80, BRICK, { position: [0, 15, -44], pattern: Pattern.Brick });
  k.gable(30, 22, 80, '#8a3a2a', { position: [0, 30, -44], pattern: Pattern.RoofTiles });
  for (const s of [-1, 1]) {
    k.box(12, 90, 12, BRICK, { position: [s * 9, 45, 0], pattern: Pattern.Brick });
    k.blob(7, '#3f8a6a', { position: [s * 9, 96, 0], scale: [1, 1.3, 1], detail: 1, roughness: 0 });
    k.cylinder(0.3, 0.6, 5, 6, '#d8b33a', { position: [s * 9, 107, 0] });
    for (let i = 0; i < 5; i++) k.box(1.4, 5, 0.2, '#3a2a22', { position: [s * 9, 30 + i * 12, 6.1] });
  }
  return k.build(0.02, 809);
}

/** A Bavarian maypole: blue-and-white spiral stripes and trade signs. */
export function buildMaypole(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 12; i++) k.cylinder(0.3, 0.32, 2.2, 8, i % 2 ? '#3e6fa8' : WHITE, { position: [0, 1.1 + i * 2.2, 0] });
  k.add(new THREE.ConeGeometry(1.4, 3, 8), '#3f7a3a', { position: [0, 28, 0], pattern: Pattern.Leaves });
  for (let i = 0; i < 4; i++) {
    const y = 8 + i * 4.5;
    for (const s of [-1, 1]) k.box(2.6, 1.2, 0.1, ['#f4d23b', '#e0432f', '#3e9fd8', '#5dbb3f'][i], { position: [s * 1.6, y, 0] });
  }
  return k.build(0.02, 810);
}

/** Neuschwanstein: the fairytale castle, white walls and slender blue-grey turrets, on its crag. */
export function buildNeuschwanstein(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(40, '#7a7a6a', { scale: [1, 0.9, 0.8], roughness: 0.25, seed: 9, pattern: Pattern.Stone });
  const y = 34;
  const wall = '#f0ece4';
  const roof = '#4a5a72';
  k.box(40, 22, 14, wall, { position: [0, y + 11, 0] });
  k.gable(40, 8, 14, roof, { position: [0, y + 22, 0], pattern: Pattern.RoofTiles });
  for (let f = 0; f < 3; f++) for (let i = 0; i < 9; i++) k.box(1.2, 2.4, 0.2, '#3a3a4a', { position: [-18 + i * 4.5, y + 5 + f * 6, 7.1] });
  const towers: [number, number, number, number][] = [[-18, 6, 3.4, 34], [16, -4, 4, 42], [4, 8, 2.4, 30], [-6, -6, 2.8, 28], [22, 8, 2, 26]];
  for (const [x, z, r, h] of towers) {
    k.cylinder(r, r, h, 12, wall, { position: [x, y + h / 2, z] });
    k.add(new THREE.ConeGeometry(r * 1.3, r * 3.2, 12), roof, { position: [x, y + h + r * 1.6, z], pattern: Pattern.RoofTiles });
    k.box(r * 0.5, r, 0.2, '#3a3a4a', { position: [x, y + h - 4, z + r] });
  }
  k.box(14, 16, 12, '#e8d8c0', { position: [-26, y + 4, 6] });
  k.gable(14, 5, 12, '#b8402a', { position: [-26, y + 12, 6], pattern: Pattern.RoofTiles });
  return k.build(0.02, 811);
}

/** An alpine chalet with flower boxes and a wide overhanging roof. Faces +Z. */
export function buildChalet(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(10, 14);
  k.box(w, 3.5, 10, '#f4efe4', { position: [0, 1.75, 0] });
  k.box(w, 3.5, 10, '#8a5a32', { position: [0, 5.25, 0], pattern: Pattern.Planks });
  k.box(w + 1, 0.3, 1.4, '#6a4a32', { position: [0, 3.6, 5.6] });
  for (let i = 0; i < 4; i++) k.blob(0.5, rnd.pick(['#e0432f', '#e8559a', '#f4a13b']), { position: [-w / 2 + 1.5 + i * ((w - 3) / 3), 4.1, 6], scale: [1.6, 0.6, 0.6], detail: 0 });
  for (let i = 0; i < 3; i++) k.box(1.2, 1.3, 0.15, '#f3dca0', { position: [-w / 3 + i * (w / 3), 5.4, 5.05], nightGlow: 1 });
  k.gable(w + 3, 3, 13, '#5a4a3a', { position: [0, 7, 0], pattern: Pattern.Planks });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w + 1, depth: 12, height: 10 };
}

/** A brown Alpine cow with a bell. */
export function buildAlpineCow(): THREE.BufferGeometry {
  const k = new ModelKit();
  const coat = '#8a5a3a';
  k.blob(0.8, coat, { position: [0, 1.3, 0], scale: [0.9, 0.8, 1.6], detail: 1 });
  k.blob(0.4, coat, { position: [0, 1.5, 1.4], scale: [0.8, 0.9, 1.2], detail: 1 });
  k.blob(0.22, '#f0e0c8', { position: [0, 1.3, 1.85], scale: [1, 0.7, 0.6], detail: 0 });
  for (const s of [-1, 1]) {
    k.add(new THREE.ConeGeometry(0.06, 0.3, 5), '#f0e8d8', { position: [s * 0.25, 1.95, 1.35], rotation: [0, 0, -s * 0.8] });
    for (const z of [-0.9, 0.9]) k.cylinder(0.12, 0.1, 0.9, 5, coat, { position: [s * 0.4, 0.45, z] });
  }
  k.cylinder(0.14, 0.2, 0.3, 8, '#d8b33a', { position: [0, 0.95, 1.6] });
  return k.build(0.02, 812);
}
