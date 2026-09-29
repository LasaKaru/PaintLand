import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Korea: Seoul, Gangnam, Suwon,
 * Seoraksan, Andong, Gyeongju, Boseong, Busan's Gamcheon and Haeundae, and Jeju.
 */

const INK = '#2b2622';
const TILE = '#4a4e56';
const DANCHEONG = '#3f8a6a';
const WOOD = '#8a3a2a';

/** A Korean tiled roof: a hip-and-gable with gently curving, lifted corners. */
function giwaRoof(k: ModelKit, w: number, d: number, y: number, h = 2.2, x = 0, z = 0): void {
  k.cylinder(0.05, 0.72, h, 4, TILE, { position: [x, y + h / 2, z], rotation: [0, Math.PI / 4, 0], scale: [w, 1, d], pattern: Pattern.RoofTiles });
  k.box(w * 0.55, 0.45, 0.5, '#3a3e46', { position: [x, y + h + 0.1, z] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    k.box(0.35, 0.3, 1.6, TILE, { position: [x + sx * w * 0.5, y + 0.4, z + sz * d * 0.5], rotation: [0.5, Math.atan2(sx, sz), 0] });
  }
  // The painted dancheong band under the eaves.
  k.box(w * 0.86, 0.5, d * 0.86, DANCHEONG, { position: [x, y - 0.1, z] });
}

/** A hanok: white walls between dark timber, paper windows and a tiled roof. Faces +Z. */
export function buildHanok(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(9, 13);
  const d = 7;
  k.box(w + 1, 0.8, d + 1, '#b8b0a0', { position: [0, 0.4, 0], pattern: Pattern.Stone });
  k.box(w, 3.4, d, '#f4efe4', { position: [0, 2.5, 0] });
  for (let i = 0; i <= 4; i++) k.box(0.3, 3.4, 0.3, '#6a4a32', { position: [-w / 2 + (i * w) / 4, 2.5, d / 2 + 0.1] });
  for (let i = 0; i < 4; i++) k.box(w / 4 - 1, 1.8, 0.1, '#f3e6c0', { position: [-w / 2 + w / 8 + (i * w) / 4, 2.6, d / 2 + 0.12], nightGlow: rnd.chance(0.5) ? 1 : 0 });
  giwaRoof(k, w + 3, d + 3, 4.2, 2);
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w + 1, depth: d + 1, height: 7 };
}

/** Gwanghwamun, built across the road: a stone gatehouse with three arches and a two-storey pavilion. `half` is the central opening's half-width. */
export function buildGwanghwamun(half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = half * 2 + 36;
  for (const s of [-1, 1]) k.box(18, 9, 16, '#c8c0b0', { position: [s * (half + 9), 4.5, 0], pattern: Pattern.Stone });
  const arch = new THREE.Shape();
  arch.moveTo(-half, 5);
  arch.absarc(0, 5, half, Math.PI, 0, true);
  arch.lineTo(half, 9);
  arch.lineTo(-half, 9);
  k.add(new THREE.ExtrudeGeometry(arch, { depth: 16, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -8), '#c8c0b0', { pattern: Pattern.Stone });
  for (const s of [-1, 1]) k.box(3, 4, 0.3, INK, { position: [s * (half + 9), 2.5, 8.05] });
  k.box(w * 0.55, 5, 10, WOOD, { position: [0, 11.5, 0] });
  for (let i = 0; i < 8; i++) k.cylinder(0.4, 0.4, 5, 8, '#6a2a22', { position: [-w * 0.26 + i * (w * 0.52 / 7), 11.5, 5.2] });
  giwaRoof(k, w * 0.66, 15, 14, 2);
  k.box(w * 0.4, 3, 8, WOOD, { position: [0, 17.5, 0] });
  giwaRoof(k, w * 0.55, 13, 19, 3.2);
  k.box(4.4, 1.6, 0.2, '#1f2a4a', { position: [0, 12.5, 5.35] });
  return k.build(0.02, 701);
}

/** N Seoul Tower on Namsan: a slim tower with a round observation deck, on its hill. */
export function buildSeoulTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(45, '#4f8a3f', { scale: [1, 0.55, 1], roughness: 0.2, seed: 4, pattern: Pattern.Grass });
  k.cylinder(3.2, 4, 60, 12, '#e8e4dc', { position: [0, 50, 0] });
  k.cylinder(9, 7, 7, 20, '#d8d4cc', { position: [0, 82, 0] });
  k.cylinder(9.1, 9.1, 2, 20, '#8ab0c8', { position: [0, 83, 0], pattern: Pattern.Glass, nightGlow: 1 });
  k.cylinder(6, 8, 3, 20, '#e8e4dc', { position: [0, 87, 0] });
  k.cylinder(1, 1.4, 22, 8, '#e0302a', { position: [0, 99, 0], nightGlow: 0.6 });
  k.cylinder(0.3, 0.6, 10, 6, '#e8e4dc', { position: [0, 115, 0] });
  return k.build(0.02, 702);
}

/** A Gangnam tower with a giant LED screen playing a K-pop video. Faces +Z. */
export function buildScreenTower(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(16, 22);
  const h = rnd.range(50, 100);
  k.box(w, h, 16, rnd.pick(['#5a6a7a', '#6a7a8a', '#4a5a6a']), { position: [0, h / 2, 0], pattern: Pattern.Glass, nightGlow: 0.3 });
  const screen = ['#ff4fa0', '#3ef0ff', '#9a7aff', '#ffcc33'];
  const sw = w * 0.9;
  const sh = sw * 0.56;
  // Low enough to fill the view from the road.
  const sy = rnd.range(5, 10);
  k.box(sw, sh, 0.4, '#1a1a24', { position: [0, sy + sh / 2, 8.1] });
  // A pixel-art dancer and colour bars on the screen.
  for (let i = 0; i < 8; i++) k.box(sw / 8 - 0.2, sh * 0.8, 0.1, rnd.pick(screen), { position: [-sw / 2 + sw / 16 + (i * sw) / 8, sy + sh / 2, 8.35], nightGlow: 1 });
  k.blob(sh * 0.12, '#f6f0e4', { position: [0, sy + sh * 0.72, 8.5], detail: 0, nightGlow: 1 });
  k.box(sh * 0.12, sh * 0.35, 0.1, '#f6f0e4', { position: [0, sy + sh * 0.45, 8.5], nightGlow: 1 });
  return { geometry: k.build(0.02, rnd.int(0, 9999)), width: w, depth: 16, height: h };
}

/** A stretch of Suwon's Hwaseong fortress wall with crenellations, `length` along X. */
export function buildFortressWall(length: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 6, 4, '#b8b0a0', { position: [0, 3, 0], pattern: Pattern.Stone });
  for (let x = -length / 2 + 1; x < length / 2; x += 2.4) {
    k.box(1.8, 1.6, 1, '#8e8a80', { position: [x, 6.8, 1.5], pattern: Pattern.Brick });
    k.box(0.4, 0.4, 1.1, INK, { position: [x, 6.6, 1.5] });
  }
  return k.build(0.03, 703);
}

/** Paldalmun, Suwon's south gate, in its round stone enclosure. */
export function buildPaldalmun(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(22, 23, 7, 24, '#b8b0a0', { position: [0, 3.5, 0], pattern: Pattern.Stone });
  k.box(24, 9, 14, '#c8c0b0', { position: [0, 4.5, -10], pattern: Pattern.Stone });
  k.box(6, 6, 14.4, INK, { position: [0, 3, -10] });
  k.box(18, 4.5, 9, WOOD, { position: [0, 11.3, -10] });
  giwaRoof(k, 24, 14, 13.6, 2);
  k.box(13, 3, 6.5, WOOD, { position: [0, 17, -10] });
  giwaRoof(k, 20, 11, 18.5, 3);
  return k.build(0.02, 704);
}

/** A Korean maple in full autumn colour. */
export function buildMaple(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const leaves = ['#e0432f', '#f08a2e', '#f4c23b', '#c8322a'];
  k.cylinder(0.25, 0.4, 3, 6, '#4a3228', { position: [0, 1.5, 0] });
  for (let i = 0; i < 7; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.2, 1.8);
    k.blob(rnd.range(1, 1.8), rnd.pick(leaves), { position: [Math.cos(a) * r, rnd.range(3.4, 5.4), Math.sin(a) * r], detail: 1, roughness: 0.25, pattern: Pattern.Leaves, seed: i });
  }
  return k.build(0.04, rnd.int(0, 999));
}

/** The great bronze Buddha of Sinheungsa, seated on a lotus. */
export function buildBronzeBuddha(): THREE.BufferGeometry {
  const k = new ModelKit();
  const bronze = '#6a6a4a';
  k.cylinder(8, 9, 3, 16, '#b8b0a0', { position: [0, 1.5, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.blob(2, bronze, { position: [Math.cos(a) * 5, 3.8, Math.sin(a) * 5], scale: [0.7, 1, 1.4], detail: 0 });
  }
  k.blob(5, bronze, { position: [0, 6, 0], scale: [1.3, 0.55, 1], detail: 1 });
  k.blob(3.4, bronze, { position: [0, 10.5, 0], scale: [1, 1.4, 0.8], detail: 1 });
  k.blob(2.1, bronze, { position: [0, 16.2, 0.3], detail: 1 });
  k.blob(1, bronze, { position: [0, 18.3, 0.2], detail: 0 });
  k.blob(0.2, '#e8b22a', { position: [0, 16.8, 2.3], detail: 0, nightGlow: 1 });
  return k.build(0.02, 705);
}

/** A thatched chogajip farmhouse of Hahoe: mud walls under a round thatch. */
export function buildChogajip(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(8, 11);
  k.box(w, 3, 6, '#c8a878', { position: [0, 1.5, 0], pattern: Pattern.Brick });
  k.box(1.2, 2, 0.15, '#6a4a32', { position: [0, 1, 3.05] });
  k.blob(1, '#c9a25a', { position: [0, 3.4, 0], scale: [w * 0.62, 1.6, 4.2], roughness: 0.06, seed: rnd.int(0, 99), pattern: Pattern.Thatch });
  for (let i = 0; i < 3; i++) k.box(w * 1.2, 0.1, 0.1, '#6a4a32', { position: [0, 4.2 + i * 0.3, -2 + i * 2] });
  // A row of onggi jars in the yard.
  for (let i = 0; i < 4; i++) k.blob(0.5, '#5a3a2a', { position: [-w / 2 + 1 + i * 1.2, 0.5, 4.5], scale: [1, 1.2, 1], detail: 1 });
  return { geometry: k.build(0.04, rnd.int(0, 9999)), width: w, depth: 9, height: 5 };
}

/** A giant carved Hahoe mask on a post: the laughing yangban. */
export function buildHahoeMask(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.4, 0.5, 6, 8, '#6a4a32', { position: [0, 3, 0] });
  k.blob(2.4, '#e8c08a', { position: [0, 8, 0.6], scale: [0.85, 1.1, 0.5], detail: 1 });
  for (const s of [-1, 1]) {
    k.box(0.9, 0.18, 0.3, INK, { position: [s * 0.8, 9, 1.8], rotation: [0, 0, s * -0.3] });
    k.blob(0.3, '#e0906a', { position: [s * 1.1, 7.6, 1.6], detail: 0 });
  }
  k.box(1.8, 0.25, 0.3, INK, { position: [0, 6.6, 1.8], rotation: [0, 0, 0] });
  k.blob(0.4, '#d8a878', { position: [0, 8, 1.95], scale: [0.6, 1, 0.6], detail: 0 });
  k.blob(0.9, '#e8c08a', { position: [0, 5.8, 1.1], scale: [1, 0.5, 0.5], detail: 0 });
  return k.build(0.02, 706);
}

/** Cheomseongdae: Gyeongju's bottle-shaped stone observatory. */
export function buildCheomseongdae(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(6, 1, 6, '#c8c0b0', { position: [0, 0.5, 0], pattern: Pattern.Stone });
  const rows = 14;
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const r = 2.6 - Math.sin(t * Math.PI * 0.9) * 0.2 - t * 1.1;
    k.cylinder(r * 0.98, r, 0.72, 14, '#d8cfb8', { position: [0, 1.3 + i * 0.72, 0], pattern: Pattern.Stone });
  }
  k.box(1, 1, 0.3, INK, { position: [0, 6, 2.1] });
  k.box(3.2, 0.6, 3.2, '#d8cfb8', { position: [0, 11.6, 0] });
  k.box(3.2, 0.6, 0.4, '#d8cfb8', { position: [0, 12.2, 1.4] });
  k.box(3.2, 0.6, 0.4, '#d8cfb8', { position: [0, 12.2, -1.4] });
  return k.build(0.02, 707);
}

/** A royal tumulus: a big grassy burial mound. */
export function buildTumulus(rnd: Random, r: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, '#7fae4a', { scale: [r, r * 0.42, r], roughness: 0.05, seed: rnd.int(0, 99), pattern: Pattern.Grass });
  return k.build(0.01, rnd.int(0, 999));
}

/** Dabotap: Bulguksa's ornate stone pagoda. */
export function buildDabotap(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#c8c0b0';
  k.box(8, 1.4, 8, stone, { position: [0, 0.7, 0], pattern: Pattern.Stone });
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4], [0, 0]]) k.box(0.9, 3, 0.9, stone, { position: [x, 2.9, z] });
  k.box(7, 0.8, 7, stone, { position: [0, 4.8, 0] });
  k.box(4, 0.6, 4, stone, { position: [0, 5.5, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(0.4, 2.2, 0.4, stone, { position: [Math.cos(a) * 1.6, 6.9, Math.sin(a) * 1.6] });
  }
  k.cylinder(2.4, 2.4, 0.5, 8, stone, { position: [0, 8.2, 0] });
  k.cylinder(1.4, 1.8, 1.6, 8, stone, { position: [0, 9.3, 0] });
  k.cylinder(2.2, 2.2, 0.4, 8, stone, { position: [0, 10.3, 0] });
  k.cylinder(0.2, 0.4, 3, 6, stone, { position: [0, 12, 0] });
  return k.build(0.02, 708);
}

/** A Gamcheon hillside of little painted houses stacked in terraces. */
export function buildGamcheon(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#f4d23b', '#3e9fd8', '#e8559a', '#5dbb3f', '#f08a2e', '#9fd0c8', '#e8a0b8', '#f6f0e4'];
  k.blob(40, '#7a9a5a', { scale: [1.2, 0.6, 0.8], roughness: 0.15, seed: 6, pattern: Pattern.Grass });
  for (let row = 0; row < 7; row++) {
    const r = 44 - row * 5.5;
    for (let i = 0; i < 16 - row; i++) {
      const a = -Math.PI * 0.45 + (i / (15 - row || 1)) * Math.PI * 0.9;
      const x = Math.sin(a) * r * 1.1;
      const z = Math.cos(a) * r * 0.7;
      // Sit on the hill's (ellipsoid) surface: radii 48 × 24 × 32.
      const y = 24 * Math.sqrt(Math.max(0, 1 - (x / 48) ** 2 - (z / 32) ** 2)) + 1.5;
      k.box(rnd.range(3.5, 5), rnd.range(3, 5), 4, rnd.pick(colours), { position: [x, y + 1.8, z], rotation: [0, a, 0] });
      k.box(4.6, 0.3, 4.4, rnd.pick(['#3e6fa8', '#5a8a9a', '#d8603a']), { position: [x, y + 4, z], rotation: [0, a, 0] });
    }
  }
  return k.build(0.03, rnd.int(0, 9999));
}

/** A lit suspension bridge (Gwangan Bridge) seen across the bay. `span` along X. */
export function buildSuspensionBridge(span: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const deck = 18;
  k.box(span, 2, 14, '#c8c8d0', { position: [0, deck, 0] });
  for (const s of [-1, 1]) {
    k.box(4, 70, 4, '#d8d8e0', { position: [s * span * 0.22, 35, 0] });
    k.box(4, 3, 16, '#d8d8e0', { position: [s * span * 0.22, 62, 0] });
  }
  for (const z of [-6, 6]) {
    const n = 40;
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const x0 = -span / 2 + t0 * span;
      const x1 = -span / 2 + t1 * span;
      const y = (t: number) => {
        const u = (t - 0.5) / 0.22;
        return Math.abs(t - 0.5) < 0.22 ? deck + 8 + 42 * u * u : deck + 2 + 48 * (1 - (Math.abs(t - 0.5) - 0.22) / 0.28);
      };
      const y0 = y(t0);
      const y1 = y(t1);
      const len = Math.hypot(x1 - x0, y1 - y0);
      k.box(len, 0.5, 0.5, '#ff4fa0', { position: [(x0 + x1) / 2, (y0 + y1) / 2, z], rotation: [0, 0, Math.atan2(y1 - y0, x1 - x0)], nightGlow: 1 });
    }
  }
  for (let x = -span * 0.2; x <= span * 0.2; x += span / 8) k.box(3, deck, 3, '#b8b8c0', { position: [x, deck / 2, 0] });
  return k.build(0.01, 709);
}

/** A dol hareubang: Jeju's stone grandfather guardian of dark volcanic rock. */
export function buildDolHareubang(): THREE.BufferGeometry {
  const k = new ModelKit();
  const basalt = '#5a5a5e';
  k.blob(0.9, basalt, { position: [0, 1.2, 0], scale: [0.9, 1.4, 0.8], detail: 1, pattern: Pattern.Stone });
  k.blob(0.75, basalt, { position: [0, 2.9, 0.05], scale: [0.95, 1.2, 0.9], detail: 1, pattern: Pattern.Stone });
  k.cylinder(0.6, 0.75, 0.7, 12, basalt, { position: [0, 3.9, 0], pattern: Pattern.Stone });
  k.blob(0.2, basalt, { position: [0, 2.8, 0.75], scale: [0.8, 1.4, 0.8], detail: 0 });
  for (const s of [-1, 1]) {
    k.blob(0.2, '#3a3a3e', { position: [s * 0.3, 3.15, 0.65], detail: 0 });
    k.box(0.25, 0.9, 0.2, basalt, { position: [s * 0.35, 1.6, 0.7], rotation: [0, 0, s * 0.3] });
  }
  return k.build(0.03, 710);
}

/** Seongsan Ilchulbong: a green tuff cone with a crater, rising out of the sea. */
export function buildCraterPeak(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(60, 90, 70, 20, '#7a8a5a', { position: [0, 35, 0], pattern: Pattern.Grass });
  k.cylinder(52, 60, 6, 20, '#5a6a3a', { position: [0, 72, 0] });
  k.cylinder(46, 40, 8, 20, '#8ab04a', { position: [0, 71, 0], pattern: Pattern.Grass });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    k.box(10, 16, 4, '#8a8272', { position: [Math.cos(a) * 58, 70, Math.sin(a) * 58], rotation: [0, -a, 0], pattern: Pattern.Stone });
  }
  return k.build(0.03, 711);
}
