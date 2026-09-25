import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { Random } from '../core/Random';

const ROOF = ['#d2643a', '#c8563a', '#dd7a48', '#b9523a'];
const SHUTTER = ['#2f8f86', '#3e6fa8', '#4f9a5a', '#2f7f9a', '#d8643a'];
const GLASS = '#3f4f78';
const INK = '#2b2622';

export interface HouseInfo {
  geometry: THREE.BufferGeometry;
  width: number;
  depth: number;
  height: number;
}

/**
 * Procedural house: pastel box, gable or flat roof, shuttered windows,
 * balconies, awnings and flower boxes. Front faces +Z, base centred at the origin.
 * Windows glow at night through the vertex-alpha night mask.
 */
export function buildHouse(rnd: Random, wall: string): HouseInfo {
  const k = new ModelKit();
  const w = rnd.range(5.5, 9);
  const d = rnd.range(5.5, 7.5);
  const floors = rnd.int(2, 4);
  const floorH = 3;
  const h = floors * floorH + 0.4;
  const shutter = rnd.pick(SHUTTER);

  k.box(w, h, d, wall, { position: [0, h / 2, 0] });
  k.box(w + 0.1, 0.5, d + 0.1, shade(wall, 0.82), { position: [0, 0.25, 0] });
  // Floor bands.
  for (let f = 1; f < floors; f++) k.box(w + 0.12, 0.12, d + 0.12, shade(wall, 0.9), { position: [0, f * floorH + 0.2, 0] });

  // Roof.
  if (rnd.chance(0.7)) {
    const rh = rnd.range(1.6, 2.8);
    k.gable(w + 0.7, rh, d + 0.8, rnd.pick(ROOF), { position: [0, h, 0] });
    if (rnd.chance(0.6)) k.box(0.6, 1.4, 0.6, shade(wall, 0.85), { position: [rnd.range(-w / 3, w / 3), h + rh * 0.55, rnd.range(-0.5, 0.8)] });
  } else {
    k.box(w + 0.2, 0.45, d + 0.2, '#f1e9d8', { position: [0, h + 0.2, 0] });
    for (let i = 0; i < rnd.int(1, 3); i++) {
      const x = rnd.range(-w / 2 + 1, w / 2 - 1);
      k.cylinder(0.3, 0.22, 0.4, 7, '#c8643a', { position: [x, h + 0.62, d / 2 - 0.6] });
      k.blob(0.42, rnd.pick(['#8cc63f', '#e8559a', '#6fae3a']), { position: [x, h + 1.0, d / 2 - 0.6], detail: 0, seed: x });
    }
  }

  // Front windows per floor.
  const cols = Math.max(1, Math.floor(w / 2.3));
  const spacing = w / cols;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH + 1.7;
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + spacing * (c + 0.5);
      const isDoor = f === 0 && c === Math.floor(cols / 2);
      if (isDoor) {
        k.box(1.1, 2.1, 0.12, rnd.pick(['#7a4a2a', '#3e6fa8', '#2f8f86']), { position: [x, 1.1, d / 2 + 0.03] });
        k.box(1.4, 0.2, 0.6, '#e9dcc4', { position: [x, 0.1, d / 2 + 0.3] });
        continue;
      }
      const lit = rnd.chance(0.45) ? 1 : 0;
      k.box(0.9, 1.3, 0.1, GLASS, { position: [x, y, d / 2 + 0.02], nightGlow: lit });
      k.box(0.36, 1.35, 0.08, shutter, { position: [x - 0.66, y, d / 2 + 0.06], rotation: [0, rnd.range(-0.3, 0.1), 0] });
      k.box(0.36, 1.35, 0.08, shutter, { position: [x + 0.66, y, d / 2 + 0.06], rotation: [0, rnd.range(-0.1, 0.3), 0] });
      k.box(1.1, 0.1, 0.25, '#f1e9d8', { position: [x, y - 0.72, d / 2 + 0.1] });
      if (f > 0 && rnd.chance(0.3)) {
        k.box(1.0, 0.25, 0.3, '#c8643a', { position: [x, y - 0.55, d / 2 + 0.25] });
        k.blob(0.28, rnd.pick(['#e8559a', '#f08a2e', '#8cc63f']), { position: [x - 0.2, y - 0.35, d / 2 + 0.3], detail: 0, seed: x + y });
        k.blob(0.24, rnd.pick(['#e8559a', '#8cc63f']), { position: [x + 0.25, y - 0.38, d / 2 + 0.3], detail: 0, seed: x - y });
      }
    }
    // Balcony across the floor.
    if (f > 0 && rnd.chance(0.35)) {
      const bw = Math.min(w - 1, rnd.range(2.2, 4));
      k.box(bw, 0.15, 1.0, '#f1e9d8', { position: [0, f * floorH + 0.3, d / 2 + 0.5] });
      for (let i = 0; i <= Math.round(bw / 0.35); i++) {
        k.box(0.05, 0.9, 0.05, INK, { position: [-bw / 2 + i * 0.35, f * floorH + 0.8, d / 2 + 0.98] });
      }
      k.box(bw, 0.06, 0.06, INK, { position: [0, f * floorH + 1.25, d / 2 + 0.98] });
    }
  }

  // Side windows.
  for (let f = 0; f < floors; f++) {
    for (const sx of [-1, 1]) {
      if (rnd.chance(0.5)) k.box(0.1, 1.2, 0.8, GLASS, { position: [sx * (w / 2 + 0.02), f * floorH + 1.7, rnd.range(-d / 4, d / 4)], nightGlow: rnd.chance(0.4) ? 1 : 0 });
    }
  }

  // Shop awning on some ground floors.
  if (rnd.chance(0.35)) {
    const aw = Math.min(w - 0.6, 4.2);
    const stripes = 8;
    const stripeColour = rnd.pick(['#d8463a', '#2f8f86', '#3e6fa8']);
    for (let i = 0; i < stripes; i++) {
      k.box(aw / stripes, 0.08, 1.3, i % 2 ? '#f6f0e4' : stripeColour, {
        position: [-aw / 2 + (aw / stripes) * (i + 0.5), 2.75, d / 2 + 0.6],
        rotation: [0.35, 0, 0],
      });
    }
  }

  return { geometry: k.build(0.05, rnd.int(0, 999)), width: w, depth: d, height: h };
}

/** Tall apartment block with a window grid and vines (Mustard Tower skyline). */
export function buildTower(rnd: Random, wall: string, w: number, h: number, d: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(w, h, d, wall, { position: [0, h / 2, 0] });
  k.box(w + 0.6, 0.8, d + 0.6, shade(wall, 0.85), { position: [0, h + 0.4, 0] });
  const cols = Math.floor(w / 3);
  const rows = Math.floor(h / 3.2);
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd.chance(0.12)) continue;
      const x = -w / 2 + (w / cols) * (c + 0.5);
      k.box(1.1, 1.4, 0.2, rnd.chance(0.2) ? '#d8643a' : GLASS, { position: [x, r * 3.2 + 0.4, d / 2], nightGlow: rnd.chance(0.35) ? 1 : 0 });
    }
  }
  // Vines down one corner.
  for (let y = 2; y < h * 0.8; y += 1.4) {
    k.blob(rnd.range(0.5, 0.9), rnd.pick(['#6fae3a', '#8cc63f']), { position: [w / 2 - 0.2 + rnd.jitter(0.3), y, d / 2 + 0.2], detail: 0, seed: y });
  }
  return k.build(0.08, rnd.int(0, 999));
}

/** Kiosk with a bright blue door (Doorway Loop). Front faces +Z. */
export function buildKiosk(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(2.6, 3.4);
  k.box(w, 3.2, 2.6, '#f1ebe0', { position: [0, 1.6, 0] });
  k.box(w + 0.3, 0.25, 2.9, '#9aa0b8', { position: [0, 3.3, 0] });
  k.box(1.1, 2.2, 0.12, '#2f62c8', { position: [0, 1.1, 1.32] });
  k.blob(0.05, '#f4d23b', { position: [0.35, 1.1, 1.4], detail: 0 });
  k.blob(1.1, '#6fae3a', { position: [rnd.jitter(0.6), 3.9, rnd.jitter(0.4)], detail: 1, seed: w });
  return k.build(0.04, rnd.int(0, 99));
}

/** Café / market stall with striped awning and fruit crates. Front faces +Z. */
export function buildStall(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(3.2, 1.1, 1.4, '#e8dcc6', { position: [0, 0.55, 0] });
  k.box(3.3, 0.1, 1.5, '#9a5a32', { position: [0, 1.12, 0] });
  for (const x of [-1.5, 1.5]) k.box(0.1, 2.6, 0.1, '#9a5a32', { position: [x, 1.3, 0.6] });
  const stripe = rnd.pick(['#d8463a', '#2f8f86', '#f08a2e']);
  for (let i = 0; i < 8; i++) k.box(0.42, 0.08, 1.9, i % 2 ? '#f6f0e4' : stripe, { position: [-1.47 + i * 0.42, 2.6, 0.3], rotation: [0.3, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const x = -1 + i;
    k.box(0.8, 0.3, 0.6, '#b9824a', { position: [x, 1.3, 0.2] });
    for (let j = 0; j < 4; j++) k.blob(0.14, rnd.pick(['#f4d23b', '#f08a2e', '#d8463a', '#8cc63f']), { position: [x - 0.25 + j * 0.17, 1.5, 0.2], detail: 0, seed: i * 4 + j });
  }
  return k.build(0.03, rnd.int(0, 99));
}

export function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex).multiplyScalar(f);
  return `#${c.getHexString()}`;
}
