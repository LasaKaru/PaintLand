import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import type { Random } from '../core/Random';

const INK = '#2b2622';
const GLASS = '#4f6f95';
const CONCRETE = '#d9d4cb';

/**
 * Props for the open-world city (docs/04 §7 prop kit): skyscrapers with windows
 * on every side, traffic lights, bus stops, billboards, parked cars, market
 * umbrellas, statues, food carts, and the loot chest and secret paint pot.
 * Every model is centred on its footprint with y = 0 at the ground and faces +Z.
 */

/** A skyscraper with windows on all four faces. Styles: glass curtain, banded office, stepped. */
export function buildSkyscraper(rnd: Random, w: number, h: number, d: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const style = rnd.pick(['glass', 'banded', 'stepped'] as const);
  const wall = rnd.pick(['#e8e2d6', '#d8d4ec', '#cfe3d6', '#f2d9c4', '#c9d6e3', '#e9c8b8']);
  const tiers = style === 'stepped' ? 3 : 1;
  let y = 0;
  let tw = w;
  let td = d;
  for (let tier = 0; tier < tiers; tier++) {
    const th = tiers === 1 ? h : h * [0.55, 0.3, 0.15][tier];
    if (style === 'glass') {
      k.box(tw, th, td, GLASS, { position: [0, y + th / 2, 0], pattern: Pattern.Glass, nightGlow: 0 });
      // Mullions: vertical fins on every face and floor bands.
      for (let x = -tw / 2 + 2; x < tw / 2 - 1; x += 3) for (const s of [-1, 1]) k.box(0.25, th, 0.3, CONCRETE, { position: [x, y + th / 2, s * (td / 2 + 0.1)] });
      for (let z = -td / 2 + 2; z < td / 2 - 1; z += 3) for (const s of [-1, 1]) k.box(0.3, th, 0.25, CONCRETE, { position: [s * (tw / 2 + 0.1), y + th / 2, z] });
      for (let fy = 4; fy < th; fy += 4) k.box(tw + 0.3, 0.35, td + 0.3, CONCRETE, { position: [0, y + fy, 0] });
      // A few lit floors at night.
      for (let fy = 2; fy < th - 2; fy += 4) if (rnd.chance(0.35)) k.box(tw * 0.98, 2.2, td * 0.98, '#ffe3a0', { position: [0, y + fy, 0], nightGlow: 1 });
    } else {
      k.box(tw, th, td, wall, { position: [0, y + th / 2, 0], pattern: Pattern.Brick });
      for (let fy = 3.4; fy < th - 1; fy += 3.4) {
        k.box(tw + 0.2, 0.3, td + 0.2, shade(wall, 0.85), { position: [0, y + fy - 1.3, 0] });
        // Window strips on all four faces.
        const lit = rnd.chance(0.4) ? 1 : 0;
        for (const s of [-1, 1]) {
          k.box(tw * 0.86, 1.5, 0.15, GLASS, { position: [0, y + fy, s * (td / 2 + 0.05)], pattern: Pattern.Glass, nightGlow: lit });
          k.box(0.15, 1.5, td * 0.86, GLASS, { position: [s * (tw / 2 + 0.05), y + fy, 0], pattern: Pattern.Glass, nightGlow: rnd.chance(0.4) ? 1 : 0 });
        }
      }
    }
    y += th;
    tw *= 0.72;
    td *= 0.72;
  }
  // Roof: parapet, water tank or antenna, a helipad sometimes.
  k.box(tw / 0.72 + 0.6, 1, td / 0.72 + 0.6, shade(wall, 0.7), { position: [0, y + 0.5, 0] });
  if (rnd.chance(0.5)) {
    k.cylinder(1.6, 1.6, 3, 10, '#a79e92', { position: [tw * 0.2, y + 2.5, 0] });
    k.box(0.2, 1.2, 0.2, INK, { position: [tw * 0.2, y + 0.9, 0] });
  } else {
    k.cylinder(0.12, 0.2, 9, 5, INK, { position: [0, y + 5, 0] });
    k.blob(0.35, '#ff5a4a', { position: [0, y + 9.6, 0], detail: 0, nightGlow: 1 });
  }
  // Ground floor: shopfront glass and an awning over the door.
  k.box(w * 0.9, 3.2, 0.2, '#7f9fc0', { position: [0, 1.7, d / 2 + 0.15], pattern: Pattern.Glass, nightGlow: 1 });
  k.box(w * 0.5, 0.25, 2.4, rnd.pick(['#d8463a', '#2f8f86', '#3e6fa8', '#f08a2e']), { position: [0, 3.6, d / 2 + 1.2] });
  return k.build(0.04, rnd.int(0, 999));
}

export function buildTrafficLight(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.12, 0.15, 5, 6, INK, { position: [0, 2.5, 0] });
  k.box(0.1, 0.1, 3.4, INK, { position: [0, 5, 1.6] });
  k.box(0.55, 1.5, 0.45, '#2f3a3a', { position: [0, 4.3, 3.2] });
  k.blob(0.16, '#ff5a4a', { position: [0, 4.8, 3.44], detail: 0, nightGlow: 1 });
  k.blob(0.16, '#f4d23b', { position: [0, 4.3, 3.44], detail: 0 });
  k.blob(0.16, '#5dbb3f', { position: [0, 3.8, 3.44], detail: 0, nightGlow: 1 });
  return k.build(0.01);
}

export function buildBusStop(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = rnd.pick(['#3e6fa8', '#d8463a', '#2f8f86']);
  for (const x of [-1.8, 1.8]) k.box(0.12, 2.6, 0.12, INK, { position: [x, 1.3, -0.6] });
  k.box(4.2, 0.15, 1.8, c, { position: [0, 2.65, 0] });
  k.box(4, 2, 0.08, '#bfd9e8', { position: [0, 1.4, -0.7], pattern: Pattern.Glass });
  k.box(3.2, 0.12, 0.5, '#b58a5c', { position: [0, 0.55, -0.35], pattern: Pattern.Planks });
  k.box(0.9, 1.3, 0.1, '#f6f0e4', { position: [2.2, 1.6, -0.7], nightGlow: 1 });
  return k.build(0.01, rnd.int(0, 99));
}

/** A billboard on legs; the panel glows at night. */
export function buildBillboard(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const x of [-3, 3]) k.box(0.35, 7, 0.35, INK, { position: [x, 3.5, 0] });
  const bg = rnd.pick(['#f4d23b', '#e8559a', '#3e9fd8', '#5dbb3f', '#f08a2e']);
  k.box(9, 4.2, 0.3, bg, { position: [0, 8.6, 0], nightGlow: 1 });
  // Painted "ad": stripes and a circle.
  k.box(6, 0.6, 0.1, '#f6f0e4', { position: [-0.8, 9.6, 0.2] });
  k.box(4, 0.6, 0.1, '#f6f0e4', { position: [-1.8, 8.4, 0.2] });
  k.cylinder(1.3, 1.3, 0.12, 16, INK, { position: [2.8, 8.6, 0.2], rotation: [Math.PI / 2, 0, 0] });
  return k.build(0.02, rnd.int(0, 99));
}

/** A parked car in the rover's style (static prop). */
export function buildParkedCar(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const body = rnd.pick(['#d8463a', '#3e6fa8', '#f4d23b', '#efe8d8', '#8cc63f', '#2f8f86', '#9a5bd6', '#2b2622']);
  k.box(2, 0.9, 4.2, body, { position: [0, 0.85, 0] });
  k.box(1.8, 0.75, 2.2, body, { position: [0, 1.65, -0.2] });
  k.box(1.7, 0.6, 0.08, GLASS, { position: [0, 1.7, 0.92], rotation: [-0.3, 0, 0], pattern: Pattern.Glass });
  k.box(0.05, 0.5, 1.8, GLASS, { position: [-0.91, 1.7, -0.2], pattern: Pattern.Glass });
  k.box(0.05, 0.5, 1.8, GLASS, { position: [0.91, 1.7, -0.2], pattern: Pattern.Glass });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) k.cylinder(0.42, 0.42, 0.3, 10, '#2f2a28', { position: [x, 0.42, z], rotation: [0, 0, Math.PI / 2], pattern: Pattern.Matte });
  for (const x of [-0.65, 0.65]) k.box(0.4, 0.2, 0.1, '#fff3c4', { position: [x, 0.95, 2.12], nightGlow: 1 });
  return k.build(0.02, rnd.int(0, 99));
}

export function buildMarketUmbrella(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = rnd.pick(['#d8463a', '#f4d23b', '#2f8f86', '#e8559a', '#f08a2e']);
  k.cylinder(0.06, 0.06, 2.6, 5, INK, { position: [0, 1.3, 0] });
  k.cylinder(0.1, 1.8, 0.6, 8, c, { position: [0, 2.7, 0] });
  k.box(2.2, 0.8, 1.2, '#b58a5c', { position: [0, 0.4, 0], pattern: Pattern.Planks });
  for (let i = 0; i < 6; i++) k.blob(0.22, rnd.pick(['#f08a2e', '#8cc63f', '#f4d23b', '#d8463a']), { position: [-0.8 + i * 0.32, 0.95, rnd.jitter(0.3)], detail: 0 });
  return k.build(0.02, rnd.int(0, 99));
}

export function buildStatue(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(3, 2, 3, '#e4dccb', { position: [0, 1, 0], pattern: Pattern.Marble });
  k.box(2.4, 0.3, 2.4, '#cfc6b4', { position: [0, 2.15, 0] });
  const bronze = '#7d6a4a';
  k.cylinder(0.45, 0.55, 2.2, 8, bronze, { position: [0, 3.4, 0] });
  k.blob(0.45, bronze, { position: [0, 4.9, 0], detail: 1, roughness: 0 });
  k.box(0.25, 1.6, 0.25, bronze, { position: [0.6, 4.6, 0], rotation: [0, 0, -0.8] });
  if (rnd.chance(0.5)) k.box(0.1, 1.8, 1.2, bronze, { position: [1.2, 5.3, 0] });
  return k.build(0.01, rnd.int(0, 99));
}

export function buildFoodCart(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const c = rnd.pick(['#f4d23b', '#e8559a', '#3e9fd8']);
  k.box(2.4, 1.1, 1.3, c, { position: [0, 1, 0] });
  k.box(2.6, 0.12, 1.5, '#f6f0e4', { position: [0, 2.6, 0] });
  for (const x of [-1.1, 1.1]) k.box(0.08, 1.2, 0.08, INK, { position: [x, 2, 0.6] });
  for (const x of [-0.9, 0.9]) k.cylinder(0.35, 0.35, 0.15, 10, INK, { position: [x, 0.35, 0.7], rotation: [Math.PI / 2, 0, 0] });
  k.box(1.2, 0.4, 0.05, '#fff3c4', { position: [0, 1.9, 0.66], nightGlow: 1 });
  return k.build(0.02, rnd.int(0, 99));
}

/** Zebra crossing stripes (flat, on the road). */
export function buildCrossing(width: number): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let x = -width / 2 + 0.6; x < width / 2; x += 1.2) k.box(0.6, 0.02, 3.2, '#f6f0e4', { position: [x, 0.07, 0] });
  return k.build(0);
}

/** The loot chest: painted wood with brass bands, colour by rarity. */
export function buildChest(tier: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const trim = ['#b58a5c', '#5aa9e8', '#b36ee8', '#f4c542'][tier] ?? '#b58a5c';
  k.box(1.4, 0.8, 0.9, '#8a5a3a', { position: [0, 0.4, 0], pattern: Pattern.Planks });
  k.cylinder(0.45, 0.45, 1.4, 12, '#9a6a44', { position: [0, 0.8, 0], rotation: [0, 0, Math.PI / 2], pattern: Pattern.Planks });
  for (const x of [-0.5, 0, 0.5]) k.box(0.12, 1.3, 0.95, trim, { position: [x, 0.65, 0] });
  k.box(0.3, 0.3, 0.1, trim, { position: [0, 0.75, 0.48], nightGlow: 1 });
  return k.build(0.01);
}

/** A secret: a golden paint pot with a brush. */
export function buildPaintPot(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.45, 0.4, 0.7, 14, '#f4c542', { position: [0, 0.35, 0], pattern: Pattern.Glass, nightGlow: 1 });
  k.cylinder(0.42, 0.42, 0.08, 14, '#e8559a', { position: [0, 0.72, 0] });
  k.cylinder(0.05, 0.05, 1.1, 5, '#b58a5c', { position: [0.15, 1.1, 0], rotation: [0, 0, -0.35] });
  k.cylinder(0.1, 0.05, 0.25, 6, '#3e9fd8', { position: [0.34, 1.62, 0], rotation: [0, 0, -0.35] });
  return k.build(0);
}

/** An objective beacon: a tall translucent-looking column of light (glows). */
export function buildBeacon(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(1.2, 1.6, 30, 12, colour, { position: [0, 15, 0], nightGlow: 1 });
  k.cylinder(2.6, 2.6, 0.15, 24, colour, { position: [0, 0.1, 0], nightGlow: 1 });
  return k.build(0);
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
}
