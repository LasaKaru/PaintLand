import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

/**
 * Landmarks and props for the Grand Tour of Japan: Tokyo, Fuji and Hakone,
 * Shirakawa-go, Kyoto, Nara, Osaka, Himeji, Miyajima, Beppu and Okinawa.
 */

const INK = '#2b2622';
const VERMILION = '#d8452f';
const WHITE = '#f6f0e4';
const TILE = '#4f5866';
const WOOD = '#6a4a32';

/** Curved-eave roof tier: a flattened pyramid with upturned corners. */
function eaves(k: ModelKit, w: number, d: number, y: number, colour: string, h = 1.6): void {
  k.cylinder(0.05, 0.72, h, 4, colour, { position: [0, y + h / 2, 0], rotation: [0, Math.PI / 4, 0], scale: [w, 1, d], pattern: Pattern.RoofTiles });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    k.box(0.25, 0.25, 1.4, colour, { position: [sx * w * 0.5, y + 0.25, sz * d * 0.5], rotation: [0.5, Math.atan2(sx, sz), 0] });
  }
}

/**
 * A Japanese castle keep (tenshu) on a battered stone base. `white` gives
 * Himeji's "White Heron"; otherwise dark walls with gold trim like Osaka's.
 */
export function buildJapaneseCastle(white: boolean): THREE.BufferGeometry {
  const k = new ModelKit();
  const wall = white ? WHITE : '#e8e2d2';
  const roof = white ? '#8a949e' : '#3f7a6a';
  const trim = white ? '#9aa4ae' : '#d8b33a';
  // Sloping stone base.
  k.cylinder(15, 19, 12, 4, '#8e8a7e', { position: [0, 6, 0], rotation: [0, Math.PI / 4, 0], scale: [1.2, 1, 1], pattern: Pattern.Stone });
  let y = 12;
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const w = 22 - i * 3.6;
    const d = 18 - i * 3;
    k.box(w, 4.2, d, wall, { position: [0, y + 2.1, 0], pattern: Pattern.None });
    // A row of small dark windows on each tier.
    for (let j = 0; j < Math.floor(w / 3.4); j++) k.box(1, 1.1, 0.2, INK, { position: [-w / 2 + 1.8 + j * 3.4, y + 2.4, d / 2 + 0.05] });
    eaves(k, w + 3, d + 3, y + 4.2, roof, 1.4);
    // Gabled dormers (chidori-hafu) on alternate tiers.
    if (i % 2 === 1) k.gable(w * 0.45, 2, 1.6, roof, { position: [0, y + 4.8, d / 2 + 1.2], pattern: Pattern.RoofTiles });
    k.box(w + 0.4, 0.25, d + 0.4, trim, { position: [0, y + 4.25, 0] });
    y += 5.6;
  }
  // Golden shachihoko fish on the ridge.
  for (const s of [-1, 1]) k.blob(0.7, '#e2b23a', { position: [s * 3.2, y + 1.2, 0], scale: [0.6, 1.4, 0.6], detail: 0 });
  return k.build(0.02, 401);
}

/** Kinkaku-ji: the Golden Pavilion beside its pond. */
export function buildGoldenPavilion(): THREE.BufferGeometry {
  const k = new ModelKit();
  const gold = '#e2b23a';
  k.box(40, 0.3, 26, '#3f7f8a', { position: [0, 0.15, 8], pattern: Pattern.Glass });
  k.box(16, 4, 12, '#f0e8d4', { position: [0, 2, 0] });
  eaves(k, 20, 16, 4, '#6a5a4a', 1);
  k.box(15, 4, 11, gold, { position: [0, 7, 0], pattern: Pattern.Glitter });
  eaves(k, 18, 14, 9, '#6a5a4a', 1);
  k.box(10, 3.6, 9, gold, { position: [0, 11.8, 0], pattern: Pattern.Glitter });
  eaves(k, 13, 12, 13.6, '#4a3a2a', 2.6);
  k.blob(0.8, gold, { position: [0, 16.8, 0], scale: [0.7, 1.2, 0.7], detail: 0 });
  // Little pine islands in the pond.
  for (const [x, z] of [[-12, 12], [10, 14], [-3, 18]]) {
    k.blob(1.8, '#8e8a7e', { position: [x, 0.3, z], scale: [1.4, 0.4, 1], detail: 0 });
    k.blob(1.4, '#3f6a3a', { position: [x, 2.2, z], scale: [1.4, 0.7, 1.2], detail: 0, pattern: Pattern.Leaves });
  }
  return k.build(0.02, 402);
}

/** Tōdai-ji's Great Buddha Hall: a huge wooden hall with a golden ridge. */
export function buildGreatHall(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(56, 1.5, 44, '#cfc8b8', { position: [0, 0.75, 0], pattern: Pattern.Stone });
  k.box(44, 12, 32, '#f0e8d4', { position: [0, 7.5, 0] });
  for (let i = 0; i < 9; i++) k.box(1, 12, 0.6, WOOD, { position: [-20 + i * 5, 7.5, 16.1] });
  k.box(44.4, 1.2, 32.4, WOOD, { position: [0, 13.4, 0] });
  eaves(k, 52, 40, 14, TILE, 5);
  k.box(22, 7, 16, '#f0e8d4', { position: [0, 21, 0] });
  eaves(k, 30, 24, 24.5, TILE, 6);
  k.box(18, 1.2, 1, '#e2b23a', { position: [0, 30.6, 0] });
  for (const s of [-1, 1]) k.blob(1, '#e2b23a', { position: [s * 9, 31.5, 0], scale: [0.5, 1.4, 0.5], detail: 0 });
  // The golden window over the door, where the Buddha's face looks out.
  k.box(5, 3, 0.3, '#e2b23a', { position: [0, 22, 8.1], nightGlow: 1 });
  return k.build(0.02, 403);
}

/** A Nara deer, bowing for crackers. */
export function buildDeer(): THREE.BufferGeometry {
  const k = new ModelKit();
  const coat = '#b27a4a';
  k.blob(0.55, coat, { position: [0, 1.1, 0], scale: [0.8, 0.8, 1.5], detail: 1 });
  for (let i = 0; i < 5; i++) k.blob(0.07, '#f0e0c8', { position: [(i % 2 ? 0.2 : -0.2), 1.45, -0.4 + i * 0.2], detail: 0 });
  k.cylinder(0.14, 0.18, 0.7, 6, coat, { position: [0, 1.5, 0.75], rotation: [0.7, 0, 0] });
  k.blob(0.25, coat, { position: [0, 1.75, 1.1], scale: [0.8, 0.8, 1.3], detail: 1 });
  for (const s of [-1, 1]) {
    k.blob(0.1, coat, { position: [s * 0.2, 1.95, 1.0], scale: [0.6, 1.5, 0.4], detail: 0 });
    for (const z of [-0.55, 0.55]) k.cylinder(0.06, 0.05, 0.85, 4, '#8a5a3a', { position: [s * 0.22, 0.42, z] });
  }
  k.blob(0.12, WHITE, { position: [0, 1.2, -0.8], detail: 0 });
  return k.build(0.02, 404);
}

/** A gasshō-zukuri farmhouse of Shirakawa-go: a steep "praying hands" thatch. */
export function buildGasshoHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(9, 12);
  const d = rnd.range(13, 17);
  k.box(w, 3, d, '#6a4a32', { position: [0, 1.5, 0], pattern: Pattern.Planks });
  for (let i = 0; i < 3; i++) k.box(1.4, 1.2, 0.15, '#f3dca0', { position: [-w / 3 + i * (w / 3), 1.8, d / 2 + 0.05], nightGlow: 1 });
  const h = w * 0.95;
  k.gable(w + 1.2, h, d + 1.2, '#b99a5a', { position: [0, 3, 0], pattern: Pattern.Thatch });
  // Gable-end windows up in the thatch.
  for (let i = 0; i < 2; i++) k.box(1.4 - i * 0.4, 1, 0.15, '#f6f0e4', { position: [0, 4.6 + i * 2.2, d / 2 + 0.62], nightGlow: 1 });
  return { geometry: k.build(0.04, rnd.int(0, 9999)), width: w, depth: d, height: 3 + h };
}

/** A terraced rice paddy strip: flat water with rows of green shoots. `length` along X. */
export function buildRicePaddy(length: number, width: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.5, width, '#7a6a4a', { position: [0, 0.25, 0] });
  k.box(length - 0.8, 0.1, width - 0.8, '#7fb0b8', { position: [0, 0.5, 0], pattern: Pattern.Glass });
  for (let z = -width / 2 + 1; z < width / 2 - 0.5; z += 1.2) k.box(length - 1.2, 0.35, 0.3, '#7fbf4a', { position: [0, 0.65, z], pattern: Pattern.Grass });
  return k.build(0.02, 405);
}

/** The Shinkansen: a long white bullet train with a blue stripe. Runs along +Z. */
export function buildShinkansen(cars: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const len = 25;
  for (let i = 0; i < cars; i++) {
    const z = i * (len + 0.6);
    k.box(3.4, 3.6, len, WHITE, { position: [0, 2.3, z] });
    k.box(3.45, 0.5, len, '#2f5aa8', { position: [0, 1.4, z] });
    k.box(3.45, 0.7, len * 0.9, '#3a4a5a', { position: [0, 3, z], nightGlow: 0.6 });
  }
  // The long duck-bill noses at both ends.
  for (const [z, dir] of [[-len / 2, -1], [(cars - 1) * (len + 0.6) + len / 2, 1]] as const) {
    k.add(new THREE.SphereGeometry(1, 16, 10).scale(1.7, 1.6, 7), WHITE, { position: [0, 2.3, z + dir * 0.5] });
    k.box(1.4, 0.5, 2, '#2b3440', { position: [0, 3.4, z + dir * 3.2] });
  }
  return k.build(0.01, 406);
}

/** An elevated Shinkansen viaduct, `length` metres along Z, deck at `h`. */
export function buildViaduct(length: number, h: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(9, 1.2, length, '#cfc8b8', { position: [0, h, length / 2] });
  for (const x of [-4.4, 4.4]) k.box(0.3, 1.2, length, '#b8b0a0', { position: [x, h + 1.1, length / 2] });
  for (let z = 10; z < length; z += 25) k.box(4, h, 2.4, '#b8b0a0', { position: [0, h / 2, z] });
  return k.build(0.01, 407);
}

/** Dōtonbori: a shop front with a giant moving-crab sign and paper lanterns. */
export function buildCrabShop(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(12, 12, 10, '#d8a86a', { position: [0, 6, 0] });
  k.box(12.2, 3, 0.4, '#d8263a', { position: [0, 4, 5.1], nightGlow: 1 });
  const red = '#e0432f';
  k.blob(2.6, red, { position: [0, 13.5, 4], scale: [1.4, 0.6, 1], detail: 1 });
  for (const s of [-1, 1]) {
    k.cylinder(0.25, 0.25, 3, 5, red, { position: [s * 3.4, 14.6, 4.6], rotation: [0, 0, s * 0.9] });
    k.blob(0.9, red, { position: [s * 4.8, 15.8, 5], scale: [1.2, 0.8, 0.6], detail: 0 });
    for (let i = 0; i < 3; i++) k.cylinder(0.15, 0.12, 3.2, 4, red, { position: [s * (2.6 + i * 0.6), 12.4, 3 + i * 0.8], rotation: [0.3, 0, s * 1.2] });
    k.blob(0.35, WHITE, { position: [s * 0.8, 14.8, 6.2], detail: 0 });
  }
  for (let i = 0; i < 5; i++) k.cylinder(0.5, 0.5, 1, 8, i % 2 ? '#f4d23b' : WHITE, { position: [-4 + i * 2, 7.4, 5.4], nightGlow: 1 });
  return k.build(0.02, 408);
}

/** A ryokan inn with steam rising from its hot-spring pool (Beppu). */
export function buildOnsen(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(18, 5, 10, '#e8dcc0', { position: [0, 2.5, 0] });
  for (let i = 0; i < 6; i++) k.box(0.4, 5, 0.3, WOOD, { position: [-8 + i * 3.2, 2.5, 5.05] });
  eaves(k, 21, 13, 5, TILE, 2.2);
  k.cylinder(6, 6, 0.5, 18, '#8e8a7e', { position: [0, 0.25, 12], pattern: Pattern.Stone });
  k.cylinder(5.2, 5.2, 0.3, 18, '#7fc8c8', { position: [0, 0.5, 12], pattern: Pattern.Glass });
  for (let i = 0; i < 9; i++) k.blob(rnd.range(1.2, 2.4), '#f6f3ec', { position: [rnd.range(-3, 3), 2 + i * 1.3, 12 + rnd.range(-2, 2)], detail: 1, roughness: 0.3, pattern: Pattern.Cloud });
  k.box(1.6, 1.8, 0.1, '#1f3f7a', { position: [0, 3.2, 5.2] });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A steam vent in the hills (Beppu's "hells"). */
export function buildSteamVent(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(3, 3.4, 0.6, 12, rnd.pick(['#4fa8c8', '#c84a3a', '#8ab85a']), { position: [0, 0.3, 0], pattern: Pattern.Glass });
  for (let i = 0; i < 6; i++) k.blob(1 + i * 0.35, '#f6f3ec', { position: [rnd.range(-1, 1), 1.5 + i * 1.7, rnd.range(-1, 1)], detail: 1, roughness: 0.3, pattern: Pattern.Cloud });
  return k.build(0.03, rnd.int(0, 9999));
}

/** A Ryūkyū house of Okinawa: low walls, red tiles and a shīsā on the roof. */
export function buildRyukyuHouse(rnd: Random): { geometry: THREE.BufferGeometry; width: number; depth: number; height: number } {
  const k = new ModelKit();
  const w = rnd.range(8, 11);
  k.box(w, 3.4, 8, rnd.pick(['#f0e8d4', '#e8dcc0', '#f4ead8']), { position: [0, 1.7, 0] });
  eaves(k, w + 1.4, 9.4, 3.4, '#d8603a', 2);
  k.blob(0.5, '#c8783a', { position: [0, 5.8, 0], scale: [0.8, 1, 1], detail: 0 });
  // A coral-stone wall and a hibiscus in front.
  k.box(w + 2, 1.4, 0.5, '#d8cfb8', { position: [0, 0.7, 5.5], pattern: Pattern.Stone });
  k.blob(0.8, '#e0432f', { position: [w / 2 - 1, 1.6, 5.6], detail: 0, pattern: Pattern.Leaves });
  return { geometry: k.build(0.03, rnd.int(0, 9999)), width: w + 2, depth: 11, height: 6 };
}

/** A shīsā lion-dog guardian on a plinth. */
export function buildShisa(): THREE.BufferGeometry {
  const k = new ModelKit();
  const clay = '#c8783a';
  k.box(1.6, 1, 1.6, '#d8cfb8', { position: [0, 0.5, 0], pattern: Pattern.Stone });
  k.blob(0.6, clay, { position: [0, 1.6, 0], scale: [0.9, 1, 1], detail: 1 });
  k.blob(0.55, clay, { position: [0, 2.5, 0.3], detail: 1 });
  k.blob(0.45, '#a8582a', { position: [0, 2.6, 0.1], scale: [1.4, 1, 0.8], detail: 0 });
  k.box(0.6, 0.12, 0.2, WHITE, { position: [0, 2.3, 0.8] });
  return k.build(0.02, 409);
}

/** A torii standing in the sea (Itsukushima). Taller and bolder than a shrine gate. Origin at the waterline. */
export function buildSeaTorii(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) {
    k.cylinder(0.9, 1, 16, 12, VERMILION, { position: [s * 7, 8, 0] });
    for (const z of [-2.4, 2.4]) k.cylinder(0.45, 0.5, 11, 8, VERMILION, { position: [s * 7, 5.5, z] });
    k.box(0.4, 0.4, 5, VERMILION, { position: [s * 7, 9, 0] });
  }
  k.box(17, 1.2, 1.6, VERMILION, { position: [0, 13, 0] });
  k.box(22, 1, 2, INK, { position: [0, 16.4, 0], rotation: [0, 0, 0] });
  k.box(21, 0.9, 1.8, VERMILION, { position: [0, 15.5, 0] });
  for (const s of [-1, 1]) k.box(2, 0.6, 2, INK, { position: [s * 11, 16.9, 0], rotation: [0, 0, s * 0.2] });
  k.box(1.6, 3.2, 0.5, INK, { position: [0, 14.3, 0.9] });
  return k.build(0.02, 410);
}

/** A red lacquered bridge arching over a stream (Nikkō's Shinkyō style). */
export function buildRedBridge(span: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -span / 2 + t * span;
    const y = 3 + Math.sin(t * Math.PI) * 2.2;
    const tilt = Math.cos(t * Math.PI) * 0.35;
    k.box(span / n + 0.1, 0.4, 4, '#8a5a3a', { position: [x, y, 0], rotation: [0, 0, tilt], pattern: Pattern.Planks });
    for (const z of [-2, 2]) k.box(span / n, 0.25, 0.2, VERMILION, { position: [x, y + 1, z], rotation: [0, 0, tilt] });
    if (i % 2 === 0) for (const z of [-2, 2]) k.cylinder(0.12, 0.12, 1, 5, VERMILION, { position: [x, y + 0.5, z] });
  }
  for (const s of [-1, 1]) k.box(1.4, 3, 5, '#8e8a7e', { position: [s * span * 0.46, 1.5, 0], pattern: Pattern.Stone });
  return k.build(0.02, 411);
}

/**
 * Kaminarimon, Asakusa's Thunder Gate, built across the road: two red halls
 * either side, a tiled roof over the gap and the great red lantern hanging in
 * the middle. `half` is the half-width of the opening.
 */
export function buildThunderGate(half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = half * 2;
  for (const s of [-1, 1]) {
    k.box(6, 10, 7, VERMILION, { position: [s * (half + 3), 5, 0] });
    k.box(4, 6, 0.3, '#3a2a22', { position: [s * (half + 3), 4.5, 3.6] });
  }
  k.box(w + 12, 1.4, 7, VERMILION, { position: [0, 10.7, 0] });
  eaves(k, w + 16, 11, 11.4, TILE, 3);
  // The lantern: red, with black bands, glowing at night.
  k.cylinder(0.08, 0.08, 1.2, 4, INK, { position: [0, 10.4, 0] });
  k.cylinder(1.9, 1.9, 3.8, 16, '#d8263a', { position: [0, 7.8, 0], nightGlow: 1 });
  for (const y of [5.8, 9.8]) k.cylinder(2, 2, 0.35, 16, INK, { position: [0, y, 0] });
  k.box(1.4, 1.8, 0.1, INK, { position: [0, 7.8, 1.95] });
  return k.build(0.02, 412);
}
