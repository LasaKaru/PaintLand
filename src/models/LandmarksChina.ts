import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of China: Beijing, the Great Wall,
 * Xi'an, Lhasa, Chengdu, Zhangjiajie, Guilin, Suzhou, Shanghai and Hong Kong.
 */

const INK = '#2b2622';
const PALACE_RED = '#b8322a';
const IMPERIAL_YELLOW = '#e8b22a';
const JADE = '#3f8a6a';
const WHITE = '#f6f0e4';

/** A hip roof with sweeping, upturned eaves: `w` × `d`, sitting at `y`. */
function hipRoof(k: ModelKit, w: number, d: number, y: number, colour: string, h = 2.4, x = 0, z = 0): void {
  k.cylinder(0.05, 0.72, h, 4, colour, { position: [x, y + h / 2, z], rotation: [0, Math.PI / 4, 0], scale: [w, 1, d], pattern: Pattern.RoofTiles });
  k.box(w * 0.5, 0.3, 0.3, colour, { position: [x, y + h, z] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    k.box(0.3, 0.3, 1.8, colour, { position: [x + sx * w * 0.5, y + 0.35, z + sz * d * 0.5], rotation: [0.6, Math.atan2(sx, sz), 0] });
  }
}

/**
 * Tiananmen, the Gate of Heavenly Peace, built across the road: a red wall
 * with arched gates, a double-roofed hall on top and lanterns. `half` is the
 * half-width of the central opening.
 */
export function buildTiananmen(half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = half * 2 + 60;
  for (const s of [-1, 1]) k.box(30, 13, 20, PALACE_RED, { position: [s * (half + 15), 6.5, 0], pattern: Pattern.Brick });
  // The span over the road, with a proper arch under it.
  const arch = new THREE.Shape();
  arch.moveTo(-half, 8);
  arch.absarc(0, 8, half, Math.PI, 0, true);
  arch.lineTo(half, 13);
  arch.lineTo(-half, 13);
  k.add(new THREE.ExtrudeGeometry(arch, { depth: 20, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -10), PALACE_RED, { pattern: Pattern.Brick });
  k.box(w, 1, 21, '#d8cfb8', { position: [0, 13.5, 0] });
  // The hall of the gate: red columns and a double yellow roof.
  k.box(w * 0.75, 7, 14, PALACE_RED, { position: [0, 17.5, 0] });
  for (let i = 0; i < 12; i++) k.cylinder(0.5, 0.5, 7, 8, '#a02820', { position: [-w * 0.35 + i * (w * 0.7 / 11), 17.5, 7.2] });
  hipRoof(k, w * 0.85, 20, 21, IMPERIAL_YELLOW, 2.4);
  k.box(w * 0.7, 2.4, 13, PALACE_RED, { position: [0, 24.6, 0] });
  hipRoof(k, w * 0.78, 17, 25.8, IMPERIAL_YELLOW, 4);
  // Red lanterns hung under the eaves, and the portrait panel over the arch.
  for (const s of [-1, 1]) for (const x of [0.2, 0.4]) k.cylinder(0.9, 0.9, 1.4, 12, '#e0302a', { position: [s * w * x, 19.8, 8.4], nightGlow: 1 });
  k.box(5, 6, 0.3, '#3a4a5a', { position: [0, 16.6, 10.3] });
  return k.build(0.02, 601);
}

/** The Hall of Prayer for Good Harvests at the Temple of Heaven: a round, triple-roofed blue hall on a marble terrace. */
export function buildTempleOfHeaven(): THREE.BufferGeometry {
  const k = new ModelKit();
  const blue = '#2f5a9a';
  for (let i = 0; i < 3; i++) k.cylinder(30 - i * 5, 31 - i * 5, 2, 32, '#f0ece0', { position: [0, 1 + i * 2, 0], pattern: Pattern.Marble });
  let y = 6;
  const tiers = [[12, 6, 16], [10, 5, 13.5], [8, 5, 11]] as const;
  for (const [r, h, roof] of tiers) {
    k.cylinder(r, r, h, 24, PALACE_RED, { position: [0, y + h / 2, 0] });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      k.box(0.3, h * 0.6, 0.2, '#e8b22a', { position: [Math.cos(a) * (r + 0.05), y + h / 2, Math.sin(a) * (r + 0.05)], rotation: [0, -a, 0] });
    }
    k.cylinder(r * 0.4, roof, 3, 24, blue, { position: [0, y + h + 1.5, 0], pattern: Pattern.RoofTiles });
    y += h + 3;
  }
  k.blob(1.6, IMPERIAL_YELLOW, { position: [0, y + 0.8, 0], scale: [1, 1.3, 1], detail: 1, roughness: 0 });
  return k.build(0.02, 602);
}

/** A run of the Forbidden City's red wall with a yellow tiled coping. `length` along X. */
export function buildPalaceWall(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 8, 2.2, PALACE_RED, { position: [0, 4, 0] });
  k.box(length + 1, 0.4, 3.2, '#d8cfb8', { position: [0, 0.2, 0] });
  k.gable(length + 0.8, 1.4, 3.4, IMPERIAL_YELLOW, { position: [0, 8, 0], pattern: Pattern.RoofTiles });
  return k.build(0.02, 603);
}

/** A terracotta warrior standing to attention. */
export function buildTerracottaWarrior(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const clay = rnd.pick(['#a8785a', '#b08262', '#9a6e52']);
  k.box(0.9, 0.4, 0.6, clay, { position: [0, 0.2, 0] });
  for (const s of [-1, 1]) k.cylinder(0.14, 0.16, 0.9, 6, clay, { position: [s * 0.2, 0.85, 0] });
  k.cylinder(0.45, 0.5, 1.2, 8, clay, { position: [0, 1.8, 0] });
  k.cylinder(0.3, 0.45, 0.6, 8, clay, { position: [0, 1.2, 0] });
  for (const s of [-1, 1]) k.cylinder(0.12, 0.12, 0.9, 5, clay, { position: [s * 0.55, 1.9, 0.1], rotation: [0.3, 0, s * 0.1] });
  k.blob(0.28, clay, { position: [0, 2.7, 0], scale: [0.9, 1.1, 1], detail: 1 });
  k.blob(0.16, clay, { position: [0.12, 2.98, -0.08], detail: 0 });
  return k.build(0.03, rnd.int(0, 9999));
}

/** An excavation pit for the terracotta army: earthen walls round rows of warriors (placed separately). */
export function buildWarriorPit(length: number, width: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.2, width, '#9a7a5a', { position: [0, 0.1, 0] });
  for (let i = 1; i < 5; i++) k.box(length, 1.6, 1.2, '#8a6a4a', { position: [0, 0.8, -width / 2 + (i * width) / 5] });
  for (const s of [-1, 1]) k.box(length, 2, 1.4, '#7a5a3a', { position: [0, 1, s * (width / 2 + 0.7)] });
  // The great hangar roof over the pit.
  for (const s of [-1, 1]) for (let x = -length / 2; x <= length / 2; x += length / 6) k.box(0.6, 12, 0.6, '#b8b0a0', { position: [x, 6, s * (width / 2 + 2)] });
  k.add(new THREE.CylinderGeometry(width / 2 + 3, width / 2 + 3, length + 2, 20, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), '#d8d4c8', { position: [0, 12, 0], scale: [1, 0.4, 1] });
  return k.build(0.02, 604);
}

/** Xi'an's Bell Tower: a square brick base under a three-eaved wooden tower. */
export function buildBellTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(34, 9, 34, '#8e8a80', { position: [0, 4.5, 0], pattern: Pattern.Brick });
  for (const [x, z] of [[0, 17.1], [17.1, 0]] as const) k.box(x ? 0.3 : 6, 6, x ? 6 : 0.3, '#3a2a22', { position: [x, 3, z] });
  k.box(20, 7, 20, PALACE_RED, { position: [0, 12.5, 0] });
  hipRoof(k, 28, 28, 16, JADE, 2.6);
  k.box(16, 5, 16, PALACE_RED, { position: [0, 20.5, 0] });
  hipRoof(k, 24, 24, 23, JADE, 3);
  hipRoof(k, 17, 17, 27, JADE, 6);
  k.blob(1, IMPERIAL_YELLOW, { position: [0, 33.6, 0], detail: 1 });
  return k.build(0.02, 605);
}

/** The Potala Palace on its hill in Lhasa: the White Palace wings and the Red Palace above. */
export function buildPotala(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(50, '#8a8272', { position: [0, 0, 0], scale: [1.6, 0.45, 0.9], roughness: 0.2, seed: 11, pattern: Pattern.Stone });
  // White wings stepping up the hill with rows of dark windows.
  for (let i = 0; i < 5; i++) {
    const w = 120 - i * 16;
    const y = 12 + i * 8;
    k.box(w, 9, 30 - i * 3, '#f4f0e6', { position: [0, y, i * 2], pattern: Pattern.Brick });
    for (let j = 0; j < Math.floor(w / 4); j++) k.box(1.2, 2, 0.2, '#3a2a22', { position: [-w / 2 + 2 + j * 4, y + 1, 15 - i * 1.5 + i * 2 + 0.1] });
  }
  k.box(40, 14, 22, '#9a2a2a', { position: [0, 58, 6], pattern: Pattern.Brick });
  for (let j = 0; j < 9; j++) k.box(1.4, 2.4, 0.2, '#f4f0e6', { position: [-16 + j * 4, 60, 17.1] });
  for (const x of [-12, 0, 12]) {
    k.box(6, 3, 6, '#d8b33a', { position: [x, 66.5, 6], pattern: Pattern.Glitter });
    hipRoof(k, 8, 8, 68, '#d8b33a', 2.6, x, 6);
  }
  // Prayer-flag lines on the hill.
  for (let i = 0; i < 20; i++) k.box(1, 0.7, 0.05, ['#3e6fa8', '#f6f0e4', '#d8463a', '#5dbb3f', '#f4d23b'][i % 5], { position: [-60 + i * 1.3, 8 + i * 0.3, 30] });
  return k.build(0.03, 606);
}

/** A giant panda munching bamboo. */
export function buildPanda(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.8, WHITE, { position: [0, 0.8, 0], scale: [1, 0.9, 1.2], detail: 1 });
  k.blob(0.62, INK, { position: [0, 1.05, 0.15], scale: [1.15, 0.5, 0.9], detail: 1 });
  for (const s of [-1, 1]) {
    k.blob(0.3, INK, { position: [s * 0.55, 0.3, 0.6], detail: 0 });
    k.blob(0.3, INK, { position: [s * 0.55, 0.3, -0.6], detail: 0 });
    k.blob(0.15, INK, { position: [s * 0.3, 2.05, 0.85], detail: 0 });
    k.blob(0.11, INK, { position: [s * 0.18, 1.72, 1.15], scale: [0.8, 1.1, 0.5], detail: 0 });
  }
  k.blob(0.5, WHITE, { position: [0, 1.65, 0.8], detail: 1 });
  k.blob(0.08, INK, { position: [0, 1.55, 1.28], detail: 0 });
  k.cylinder(0.05, 0.05, 1.6, 5, '#7fa83a', { position: [0.3, 1.5, 1.1], rotation: [0.3, 0, 0.5] });
  k.blob(0.2, '#5c9a32', { position: [0.7, 2.1, 1.3], scale: [1.4, 0.4, 0.6], detail: 0 });
  return k.build(0.02, 607);
}

/** A Sichuan teahouse with a covered veranda and lanterns. */
export function buildTeahouse(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(14, 5, 9, '#e8dcc0', { position: [0, 2.5, 0] });
  for (let i = 0; i < 6; i++) k.cylinder(0.25, 0.25, 4.5, 6, '#5a3a22', { position: [-6 + i * 2.4, 2.25, 5.4] });
  hipRoof(k, 17, 13, 5, '#4f5866', 2.6);
  for (let i = 0; i < 4; i++) k.cylinder(0.5, 0.5, 0.8, 10, '#e0302a', { position: [-4.5 + i * 3, 4, 5.8], nightGlow: 1 });
  for (let i = 0; i < 3; i++) {
    k.cylinder(0.6, 0.6, 0.1, 10, '#6a4a32', { position: [-4 + i * 4, 1, 7.5] });
    k.cylinder(0.1, 0.1, 1, 5, '#6a4a32', { position: [-4 + i * 4, 0.5, 7.5] });
  }
  return k.build(0.03, rnd.int(0, 9999));
}

/** A Suzhou canal house: white walls, black tiles, a horse-head gable. Faces +Z. */
export function buildSuzhouHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(7, 10);
  k.box(w, 6, 8, '#f4f0e8', { position: [0, 3, 0] });
  k.gable(w + 0.4, 2.2, 8.6, '#3a3a40', { position: [0, 6, 0], pattern: Pattern.RoofTiles });
  // Stepped "horse-head" fire walls at the gable ends.
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.5, 1.2, 6 - i * 2, '#f4f0e8', { position: [s * (w / 2 + 0.2), 6.6 + i * 1, 0] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.7, 0.2, 6.2 - i * 2, '#3a3a40', { position: [s * (w / 2 + 0.2), 7.25 + i * 1, 0] });
  k.box(w * 0.6, 1.4, 0.2, '#5a3a22', { position: [0, 4, 4.05] });
  k.box(1.4, 2.4, 0.2, '#5a3a22', { position: [0, 1.2, 4.05] });
  k.cylinder(0.45, 0.45, 0.7, 10, '#e0302a', { position: [1.4, 2.6, 4.4], nightGlow: 1 });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w, depth: 8, height: 10 };
}

/** A humpbacked stone "moon" bridge over a canal. `span` along X. */
export function buildMoonBridge(span: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const r = span * 0.3;
  const s = new THREE.Shape();
  s.moveTo(-span / 2, 0);
  s.quadraticCurveTo(0, r * 2.4, span / 2, 0);
  s.lineTo(r, 0);
  s.absarc(0, 0, r, 0, Math.PI, false);
  s.lineTo(-span / 2, 0);
  k.add(new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false, curveSegments: 16 }).translate(0, 0, -2), '#cfc8b8', { pattern: Pattern.Stone });
  return k.build(0.02, 608);
}

/** The Oriental Pearl Tower: three legs, pink spheres and a needle. */
export function buildPearlTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  const pink = '#d8508a';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    k.cylinder(1.6, 2.2, 36, 10, '#d8d4dc', { position: [Math.cos(a) * 7, 18, Math.sin(a) * 7], rotation: [Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18] });
  }
  k.cylinder(2.4, 2.4, 110, 10, '#d8d4dc', { position: [0, 55, 0] });
  k.blob(13, pink, { position: [0, 40, 0], detail: 2, roughness: 0, pattern: Pattern.Glass, nightGlow: 0.5 });
  for (let i = 0; i < 5; i++) k.blob(3, pink, { position: [0, 62 + i * 6, 0], detail: 1, roughness: 0, pattern: Pattern.Glass, nightGlow: 0.5 });
  k.blob(8, pink, { position: [0, 100, 0], detail: 2, roughness: 0, pattern: Pattern.Glass, nightGlow: 0.5 });
  k.blob(3, pink, { position: [0, 116, 0], detail: 1, roughness: 0, pattern: Pattern.Glass, nightGlow: 0.5 });
  k.cylinder(0.3, 1, 26, 6, '#d8d4dc', { position: [0, 132, 0] });
  return k.build(0.01, 609);
}

/** The Shanghai Tower: a tall glass spire with a twist. */
export function buildTwistTower(height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const r = 12 * (1 - t * 0.55);
    k.cylinder(r * 0.97, r, height / n + 0.1, 3, '#8ab0c8', { position: [0, (i + 0.5) * (height / n), 0], rotation: [0, t * 2.2, 0], pattern: Pattern.Glass, nightGlow: 0.4 });
  }
  return k.build(0.01, 610);
}

/** A colonial Bund building: stone columns and a clock or dome. Faces +Z. */
export function buildBundBuilding(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(18, 26);
  const h = rnd.range(22, 34);
  k.box(w, h, 16, rnd.pick(['#d8cfb8', '#cfc4a8', '#e0d8c4']), { position: [0, h / 2, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 6; i++) k.cylinder(0.6, 0.6, h * 0.4, 8, '#f0ece0', { position: [-w / 2 + 2 + i * ((w - 4) / 5), h * 0.45, 8.2] });
  for (let f = 0; f < 5; f++) for (let i = 0; i < Math.floor(w / 3); i++) k.box(1.2, 1.8, 0.2, '#f3dca0', { position: [-w / 2 + 1.8 + i * 3, 3 + f * (h / 5.5), 8.1], nightGlow: rnd.chance(0.5) ? 1 : 0 });
  if (rnd.chance(0.5)) {
    k.box(6, 8, 6, '#d8cfb8', { position: [0, h + 4, 0] });
    k.cylinder(1.8, 1.8, 0.3, 16, WHITE, { position: [0, h + 5, 3.1], rotation: [Math.PI / 2, 0, 0] });
    k.add(new THREE.ConeGeometry(3.4, 5, 4), '#3f7a6a', { position: [0, h + 10.5, 0], rotation: [0, Math.PI / 4, 0] });
  } else k.blob(5, '#3f7a6a', { position: [0, h + 1, 0], scale: [1, 0.8, 1], detail: 1 });
  return { geometry: k.build(0.02, rnd.int(0, 9999)), width: w, depth: 16, height: h + 12 };
}

/** A Hong Kong double-decker tram: tall, narrow and green. Along Z. */
export function buildDingDing(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const col = rnd.pick(['#2f7a4a', '#d8263a', '#2f5aa8', '#f4a13b']);
  k.box(2.2, 4.4, 11, col, { position: [0, 2.6, 0] });
  k.box(2.25, 0.9, 10.4, '#f3dca0', { position: [0, 2, 0], nightGlow: 1 });
  k.box(2.25, 0.9, 10.4, '#f3dca0', { position: [0, 3.9, 0], nightGlow: 1 });
  k.box(2.3, 0.3, 11.2, '#f6f0e4', { position: [0, 4.9, 0] });
  k.cylinder(0.05, 0.05, 2.2, 3, INK, { position: [0, 6, 1], rotation: [0.5, 0, 0] });
  return k.build(0.01, rnd.int(0, 9999));
}

/** A dense Hong Kong tower block hung with neon signs. */
export function buildHKTower(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(10, 14);
  const h = rnd.range(40, 80);
  k.box(w, h, 12, rnd.pick(['#d8cfc0', '#c8c0b0', '#e0d0c0', '#b8c0c8']), { position: [0, h / 2, 0] });
  for (let f = 0; f < h / 3.2; f++) k.box(w * 0.9, 1.3, 0.2, f % 3 ? '#8a9aa8' : '#f3dca0', { position: [0, 2 + f * 3.2, 6.05], nightGlow: f % 3 ? 0 : 0.8 });
  const neon = ['#ff4fa0', '#3ef0ff', '#ffcc33', '#5dff7a', '#ff7a3e'];
  for (let i = 0; i < 5; i++) {
    const y = 5 + i * 5;
    k.box(0.4, 4, rnd.range(3, 6), rnd.pick(neon), { position: [w / 2 - 1 + (i % 2) * -w + 2, y, 8], nightGlow: 1 });
  }
  return { geometry: k.build(0.02, rnd.int(0, 9999)), width: w, depth: 12, height: h };
}

/** A tall, thin sandstone pillar of Zhangjiajie with pines clinging to its top. */
export function buildPillarPeak(rnd: Random, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const r = rnd.range(6, 11);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const rr = r * (1 - i * 0.06) * rnd.range(0.9, 1.1);
    k.cylinder(rr * 0.95, rr, height / n + 0.2, 7, '#a8a090', { position: [rnd.range(-0.6, 0.6), (i + 0.5) * (height / n), rnd.range(-0.6, 0.6)], rotation: [0, rnd.range(0, 3), 0], pattern: Pattern.Stone });
  }
  for (let i = 0; i < 6; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.add(new THREE.ConeGeometry(r * 0.3, r * 0.7, 6), '#3f6a3a', { position: [Math.cos(a) * r * 0.5, height + r * 0.3, Math.sin(a) * r * 0.5], pattern: Pattern.Leaves });
  }
  k.blob(r * 0.8, '#4f7a3a', { position: [0, height, 0], scale: [1, 0.3, 1], detail: 0, pattern: Pattern.Leaves });
  return k.build(0.03, rnd.int(0, 999));
}

/** A cormorant fisherman on a bamboo raft with a lantern (Li River). Along Z. */
export function buildBambooRaft(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 6; i++) k.cylinder(0.15, 0.15, 7, 6, '#c8b060', { position: [-0.75 + i * 0.3, 0.2, 0], rotation: [Math.PI / 2, 0, 0] });
  k.cylinder(0.25, 0.25, 1.5, 6, '#3a4a6a', { position: [0, 1, 0.5] });
  k.blob(0.22, '#d8a878', { position: [0, 1.95, 0.5], detail: 0 });
  k.cylinder(0.05, 0.9, 0.35, 10, '#d8b060', { position: [0, 2.25, 0.5], pattern: Pattern.Thatch });
  k.cylinder(0.03, 0.03, 4.5, 4, '#6a4a32', { position: [0.5, 1.8, -0.5], rotation: [0.9, 0, 0] });
  k.cylinder(0.3, 0.3, 0.5, 8, '#f4a13b', { position: [0, 1.2, 3], nightGlow: 1 });
  for (const z of [-2, -1]) k.blob(0.2, INK, { position: [0.3, 0.6, z], scale: [0.7, 1.4, 1], detail: 0 });
  return k.build(0.02, 611);
}
