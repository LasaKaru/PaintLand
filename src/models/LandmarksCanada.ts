import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Canada: Québec City, Ottawa,
 * Toronto, Niagara, Algonquin, the Prairies, Banff, the Icefields Parkway,
 * Vancouver and the Pacific coast.
 */

const INK = '#2b2622';
const COPPER = '#5a9a8a';
const WHITE = '#f6f0e4';
const RED = '#d8263a';

/** A copper-roofed turret. */
function turret(k: ModelKit, x: number, z: number, r: number, h: number, wall: string, y0 = 0): void {
  k.cylinder(r, r, h, 10, wall, { position: [x, y0 + h / 2, z], pattern: Pattern.Brick });
  k.add(new THREE.ConeGeometry(r * 1.2, r * 3, 10), COPPER, { position: [x, y0 + h + r * 1.5, z], pattern: Pattern.RoofTiles });
}

/** Château Frontenac on its bluff above the St Lawrence. */
export function buildFrontenac(): THREE.BufferGeometry {
  const k = new ModelKit();
  const brick = '#a8603a';
  k.blob(40, '#6a7a5a', { scale: [1.2, 0.5, 0.9], roughness: 0.2, seed: 3, pattern: Pattern.Stone });
  const y = 18;
  k.box(60, 24, 18, brick, { position: [0, y + 12, 0], pattern: Pattern.Brick });
  k.gable(60, 12, 18, COPPER, { position: [0, y + 24, 0], pattern: Pattern.RoofTiles });
  k.box(16, 50, 16, brick, { position: [0, y + 25, 4], pattern: Pattern.Brick });
  k.add(new THREE.ConeGeometry(12, 18, 4), COPPER, { position: [0, y + 59, 4], rotation: [0, Math.PI / 4, 0], pattern: Pattern.RoofTiles });
  for (const [x, z] of [[-30, 8], [30, 8], [-12, 10], [12, 10]]) turret(k, x, z, 3.4, 30, brick, y);
  for (let f = 0; f < 4; f++) for (let i = 0; i < 14; i++) k.box(1.4, 2, 0.2, '#f3dca0', { position: [-27 + i * 4.2, y + 5 + f * 5, 9.1], nightGlow: (i + f) % 3 === 0 ? 1 : 0 });
  return k.build(0.02, 901);
}

/** An old Québec stone house: steep roof, dormers, a bright door. Faces +Z. */
export function buildQuebecHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(8, 11);
  k.box(w, 7, 9, rnd.pick(['#d8cfb8', '#c8c0a8', '#e0d8c0']), { position: [0, 3.5, 0], pattern: Pattern.Stone });
  k.gable(w + 0.6, 5, 9.6, rnd.pick(['#b8322a', '#3f5a8a', '#3a6a4a', '#5a5a5a']), { position: [0, 7, 0], pattern: Pattern.RoofTiles });
  for (const x of [-w / 4, w / 4]) {
    k.box(1.4, 1.6, 1.6, WHITE, { position: [x, 8.6, 3.8] });
    k.gable(1.8, 0.8, 1.8, '#5a5a5a', { position: [x, 9.4, 3.8] });
  }
  for (const x of [-w / 3, w / 3]) k.box(1.2, 1.6, 0.15, '#f3dca0', { position: [x, 4.4, 4.55], nightGlow: 1 });
  k.box(1.3, 2.4, 0.2, rnd.pick([RED, '#3e6fa8', '#3f8a3a', '#f4d23b']), { position: [0, 1.2, 4.6] });
  k.box(1.2, 1.4, 1.2, '#8e8a80', { position: [w / 2 - 1, 11, 0] });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w, depth: 9, height: 12 };
}

/** Parliament Hill's Centre Block with the Peace Tower. Faces +Z. */
export function buildParliament(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#c8b890';
  k.box(90, 20, 30, stone, { position: [0, 10, 0], pattern: Pattern.Sandstone });
  k.gable(90, 10, 30, COPPER, { position: [0, 20, 0], pattern: Pattern.RoofTiles });
  for (let i = 0; i < 9; i++) turret(k, -40 + i * 10, 15.5, 1.2, 24, stone);
  k.box(14, 70, 14, stone, { position: [0, 35, 16], pattern: Pattern.Sandstone });
  k.cylinder(3.2, 3.2, 0.3, 16, WHITE, { position: [0, 62, 23.2], rotation: [Math.PI / 2, 0, 0] });
  k.add(new THREE.ConeGeometry(10, 22, 4), COPPER, { position: [0, 81, 16], rotation: [0, Math.PI / 4, 0], pattern: Pattern.RoofTiles });
  k.cylinder(0.2, 0.2, 10, 5, INK, { position: [0, 97, 16] });
  k.box(5, 2.5, 0.1, WHITE, { position: [2.5, 100, 16] });
  k.box(1.6, 2.5, 0.12, RED, { position: [0.8, 100, 16] });
  k.box(1.6, 2.5, 0.12, RED, { position: [4.2, 100, 16] });
  k.blob(0.6, RED, { position: [2.5, 100, 16.05], scale: [1, 1, 0.1], detail: 0 });
  return k.build(0.02, 902);
}

/** The CN Tower: a concrete needle with its pod and antenna. */
export function buildCNTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.box(3, 150, 8, '#d8d4cc', { position: [Math.cos(a) * 3, 75, Math.sin(a) * 3], rotation: [0, -a, 0] });
  }
  k.cylinder(4, 5, 170, 10, '#e0dcd4', { position: [0, 85, 0] });
  k.cylinder(14, 12, 10, 24, '#c8c4bc', { position: [0, 172, 0] });
  k.cylinder(14.1, 14.1, 3, 24, '#3a4a5a', { position: [0, 173, 0], nightGlow: 1 });
  k.cylinder(6, 6, 6, 16, '#d8d4cc', { position: [0, 185, 0] });
  k.cylinder(1, 2, 90, 8, '#d8d4cc', { position: [0, 232, 0] });
  k.cylinder(0.3, 0.3, 4, 4, RED, { position: [0, 279, 0], nightGlow: 1 });
  return k.build(0.01, 903);
}

/** The Horseshoe Falls: a curved cliff with a curtain of water and a cloud of mist. Faces +Z. */
export function buildHorseshoeFalls(): THREE.BufferGeometry {
  const k = new ModelKit();
  const R = 50;
  const H = 28;
  // A horseshoe of cliff behind the origin, open toward +Z: rock blocks round the arc,
  // each fronted by a sheet of falling water facing the middle.
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.05 + ((i + 0.5) / n) * Math.PI * 0.9;
    const x = Math.cos(a) * R;
    const z = -Math.sin(a) * R * 0.8;
    const yaw = Math.PI / 2 - a;
    const seg = (Math.PI * 0.9 * R) / n + 1;
    k.box(seg, H, 10, '#6a6458', { position: [x * 1.12, H / 2, z * 1.12], rotation: [0, yaw, 0], pattern: Pattern.Stone });
    k.box(seg, H - 2, 1.2, i % 2 ? '#e8f6fa' : '#d0eef4', { position: [x * 0.99, H / 2, z * 0.99], rotation: [0, yaw, 0], pattern: Pattern.Glass });
    // The river pouring over the lip.
    k.box(seg, 0.6, 30, '#3f8fa8', { position: [x * 1.12 + Math.cos(a) * 15, H + 0.2, z * 1.12 - Math.sin(a) * 15 * 0.8], rotation: [0, yaw, 0], pattern: Pattern.Glass });
  }
  // The plunge pool and the great cloud of mist.
  k.cylinder(R * 0.9, R * 0.9, 0.6, 24, '#5aa8c0', { position: [0, 0.3, -R * 0.3], scale: [1, 1, 0.7], pattern: Pattern.Glass });
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * 0.15 + (i / 11) * Math.PI * 0.7;
    k.blob(7 + (i % 3) * 3, '#f6f8fa', { position: [Math.cos(a) * R * 0.75, 4 + (i % 4) * 4, -Math.sin(a) * R * 0.6], detail: 1, roughness: 0.3, pattern: Pattern.Cloud });
  }
  return k.build(0.02, 904);
}

/** A blue tour boat (the Maid of the Mist). Along Z. */
export function buildMistBoat(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(7, 2, 20, WHITE, { position: [0, 1, 0] });
  k.box(6.6, 2.4, 14, '#3e6fa8', { position: [0, 3.2, 0] });
  for (let i = 0; i < 12; i++) k.blob(0.35, '#3e6fa8', { position: [(i % 2 ? 2.8 : -2.8), 4.8, -6 + i * 1.1], detail: 0 });
  return k.build(0.01, 905);
}

/** A moose, antlers and all. */
export function buildMoose(): THREE.BufferGeometry {
  const k = new ModelKit();
  const coat = '#4a3228';
  k.blob(1.2, coat, { position: [0, 2.2, 0], scale: [0.8, 0.9, 1.6], detail: 1 });
  k.blob(0.5, coat, { position: [0, 2.9, 1.6], scale: [0.7, 0.8, 1.4], detail: 1 });
  k.blob(0.3, '#6a4a3a', { position: [0, 2.3, 2.3], scale: [0.8, 1, 1], detail: 0 });
  for (const s of [-1, 1]) {
    k.box(1.6, 0.15, 0.9, '#d8c8a8', { position: [s * 1, 3.6, 1.4], rotation: [0, 0, s * 0.3] });
    for (let i = 0; i < 3; i++) k.box(0.1, 0.5, 0.1, '#d8c8a8', { position: [s * (0.5 + i * 0.4), 3.9, 1.2 + i * 0.2] });
    for (const z of [-0.9, 0.9]) k.cylinder(0.15, 0.12, 1.8, 5, coat, { position: [s * 0.45, 0.9, z] });
  }
  return k.build(0.02, 906);
}

/** A red canoe pulled up on the shore. Along Z. */
export function buildCanoe(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, rnd.pick([RED, '#f4d23b', '#3f8a3a', '#e8a03a']), { position: [0, 0.3, 0], scale: [0.5, 0.3, 2.6], detail: 1 });
  k.box(0.9, 0.08, 0.2, '#8a6a4a', { position: [0, 0.55, 0.8] });
  k.box(0.9, 0.08, 0.2, '#8a6a4a', { position: [0, 0.55, -0.8] });
  k.box(0.12, 0.05, 1.6, '#8a6a4a', { position: [0.5, 0.6, 0], rotation: [0, 0.3, 0] });
  return k.build(0.02, rnd.int(0, 999));
}

/** A prairie grain elevator: tall, red, with the town's name in white. */
export function buildGrainElevator(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(9, 28, 9, '#b8322a', { position: [0, 14, 0], pattern: Pattern.Planks });
  k.box(5, 6, 5, '#b8322a', { position: [0, 31, 0], pattern: Pattern.Planks });
  k.gable(5.4, 2, 5.4, '#5a5a5a', { position: [0, 34, 0] });
  k.gable(9.6, 2, 9.6, '#5a5a5a', { position: [0, 28, 0] });
  k.box(7, 1.4, 0.1, WHITE, { position: [0, 24, 4.55] });
  k.box(8, 8, 6, '#b8322a', { position: [8, 4, 0], pattern: Pattern.Planks });
  return k.build(0.02, 907);
}

/** A golden wheat field strip, `length` along X. */
export function buildWheat(length: number, width: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 1, width, '#e8c060', { position: [0, 0.5, 0], pattern: Pattern.Thatch });
  for (let z = -width / 2 + 1; z < width / 2; z += 2.5) k.box(length, 0.2, 0.3, '#c8a040', { position: [0, 1.05, z] });
  return k.build(0.01, 908);
}

/** The Fairmont Banff Springs: a baronial castle-hotel among the pines. */
export function buildBanffSprings(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#a8a090';
  k.box(40, 34, 22, stone, { position: [0, 17, 0], pattern: Pattern.Stone });
  k.gable(40, 10, 22, COPPER, { position: [0, 34, 0], pattern: Pattern.RoofTiles });
  k.box(18, 46, 18, stone, { position: [0, 23, 4], pattern: Pattern.Stone });
  k.add(new THREE.ConeGeometry(13, 12, 4), COPPER, { position: [0, 52, 4], rotation: [0, Math.PI / 4, 0], pattern: Pattern.RoofTiles });
  for (const [x, z] of [[-20, 11], [20, 11], [-20, -11], [20, -11]]) turret(k, x, z, 3, 38, stone);
  for (let f = 0; f < 6; f++) for (let i = 0; i < 9; i++) k.box(1.4, 2, 0.2, '#f3dca0', { position: [-17 + i * 4.2, 4 + f * 5, 11.1], nightGlow: (i + f) % 3 === 0 ? 1 : 0 });
  return k.build(0.02, 909);
}

/** A glacier tongue sliding down between the peaks. Faces +Z (its snout). */
export function buildGlacier(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const top = length * 0.45;
  // The mountain it flows from.
  k.cylinder(length * 0.08, length * 0.55, top * 1.6, 9, '#8a8a9a', { position: [0, top * 0.8, -length * 0.95], pattern: Pattern.Stone });
  k.cylinder(length * 0.06, length * 0.22, top * 0.5, 9, '#f6f8fa', { position: [0, top * 1.4, -length * 0.95] });
  // The ice tongue: a wedge rising from its snout at z = 0 up to the mountain.
  const side = new THREE.Shape();
  side.moveTo(0, 0);
  side.lineTo(0, 4);
  side.quadraticCurveTo(-length * 0.5, top * 0.35, -length, top);
  side.lineTo(-length, 0);
  side.lineTo(0, 0);
  const w = 36;
  const ice = new THREE.ExtrudeGeometry(side, { depth: w, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -w / 2).rotateY(-Math.PI / 2);
  k.add(ice, '#dcecf4', { pattern: Pattern.Cloud });
  // Blue crevasses across the ice and grey moraine stripes down its sides.
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const y = 4 + (top - 4) * (t * t * 0.6 + t * 0.4);
    k.box(w * 0.8, 0.6, 0.8, '#7fb0c8', { position: [0, y + 0.3, -t * length] });
  }
  for (const s of [-1, 1]) k.box(2.4, 1.2, length, '#7a7468', { position: [s * (w / 2 - 1), 1, -length / 2] });
  return k.build(0.02, 910);
}

/** A carved totem pole: stacked painted figures, a thunderbird on top. */
export function buildTotem(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const cedar = '#8a5a3a';
  const paint = ['#d8263a', '#1f2a4a', '#3f8a8a', '#f6f0e4', INK];
  k.cylinder(1.1, 1.3, 14, 10, cedar, { position: [0, 7, 0], pattern: Pattern.Planks });
  for (let i = 0; i < 4; i++) {
    const y = 2 + i * 3.2;
    k.blob(0.6, rnd.pick(paint), { position: [-0.4, y + 1, 1.05], scale: [0.6, 0.4, 0.3], detail: 0 });
    k.blob(0.6, rnd.pick(paint), { position: [0.4, y + 1, 1.05], scale: [0.6, 0.4, 0.3], detail: 0 });
    k.box(1.4, 0.4, 0.4, rnd.pick(paint), { position: [0, y, 1.1] });
    k.blob(0.35, rnd.pick(paint), { position: [0, y + 0.4, 1.3], scale: [0.7, 1.2, 1], detail: 0 });
  }
  for (const s of [-1, 1]) k.box(3.4, 0.3, 1.2, rnd.pick(paint), { position: [s * 1.9, 14.4, 0], rotation: [0, 0, s * 0.3] });
  k.blob(0.8, cedar, { position: [0, 15, 0.3], detail: 0 });
  k.add(new THREE.ConeGeometry(0.3, 1.2, 4).rotateX(Math.PI / 2), '#f4d23b', { position: [0, 15, 1.4] });
  return k.build(0.02, rnd.int(0, 9999));
}

/** An orca breaching. Origin at the water line. */
export function buildOrca(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1.2, INK, { position: [0, 1.2, 0], scale: [0.9, 1, 3], rotation: [-0.6, 0, 0], detail: 1 });
  k.blob(0.5, WHITE, { position: [0, 0.8, 1.4], scale: [0.8, 0.6, 1.4], rotation: [-0.6, 0, 0], detail: 0 });
  k.blob(0.25, WHITE, { position: [0.8, 2.5, 1.2], scale: [0.4, 0.6, 1], detail: 0 });
  k.add(new THREE.ConeGeometry(0.4, 2, 4), INK, { position: [0, 3.2, -0.6], rotation: [-0.3, 0, 0] });
  return k.build(0.02, 911);
}

/** A cedar-shingled surf shack on the Pacific coast. */
export function buildSurfShack(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(6, 3.4, 5, '#8a6a4a', { position: [0, 1.7, 0], pattern: Pattern.Planks });
  k.gable(6.6, 2, 5.6, '#5a4a3a', { position: [0, 3.4, 0], pattern: Pattern.Planks });
  for (let i = 0; i < 3; i++) k.box(0.5, 2.4, 0.12, rnd.pick(['#e8559a', '#3ef0ff', '#f4d23b', '#5dbb3f']), { position: [-1.5 + i * 1.2, 1.4, 2.7], rotation: [0, 0, 0.1] });
  k.box(1.2, 2, 0.1, '#3e6fa8', { position: [2, 1, 2.55] });
  return k.build(0.03, rnd.int(0, 9999));
}
