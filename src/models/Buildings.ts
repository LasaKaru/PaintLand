import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { Random } from '../core/Random';

const ROOF = ['#d2643a', '#c8563a', '#dd7a48', '#b9523a', '#e0703e'];
const SHUTTER = ['#2f8f86', '#3e8fa0', '#4f9a5a', '#2f7f9a', '#3a9c8c'];
const GLASS = '#3f4f78';
const FRAME = '#f4efe2';
const INK = '#2b2622';
const FLOWERS = ['#e8559a', '#d94a86', '#f08a2e', '#d8463a', '#f4d23b'];
const GREENS = ['#8cc63f', '#6fae3a', '#9ad04a', '#4f9a4a'];

export type HouseStyle = 'townhouse' | 'narrow' | 'wooden' | 'shop' | 'colonial';

export interface HouseInfo {
  geometry: THREE.BufferGeometry;
  width: number;
  depth: number;
  height: number;
}

/** Hipped roof over a w × d rectangle, ridge along X; base at y = 0. */
export function hipRoofGeometry(w: number, d: number, h: number): THREE.BufferGeometry {
  const ridge = Math.max(0, (w - d) / 2);
  const a = new THREE.Vector3(-w / 2, 0, -d / 2);
  const b = new THREE.Vector3(w / 2, 0, -d / 2);
  const c = new THREE.Vector3(w / 2, 0, d / 2);
  const e = new THREE.Vector3(-w / 2, 0, d / 2);
  const r1 = new THREE.Vector3(-ridge, h, 0);
  const r2 = new THREE.Vector3(ridge, h, 0);
  const tris = [
    [e, c, r2], [e, r2, r1], // front
    [b, a, r1], [b, r1, r2], // back
    [c, b, r2], // right
    [a, e, r1], // left
  ];
  const pos: number[] = [];
  for (const t of tris) for (const v of t) pos.push(v.x, v.y, v.z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** Window with frame, glass, open louvred shutters, sill and lintel. Faces +Z at z. */
function addWindow(k: ModelKit, rnd: Random, x: number, y: number, z: number, w: number, h: number, shutter: string, frame = FRAME): void {
  const lit = rnd.chance(0.45) ? 1 : 0;
  k.box(w + 0.22, h + 0.22, 0.1, frame, { position: [x, y, z + 0.02] });
  k.box(w, h, 0.1, GLASS, { position: [x, y, z + 0.06], nightGlow: lit });
  k.box(0.06, h, 0.06, frame, { position: [x, y, z + 0.12] });
  k.box(w, 0.06, 0.06, frame, { position: [x, y + h * 0.15, z + 0.12] });
  if (shutter) {
    const sw = w * 0.52;
    const open = rnd.range(0.35, 1.25);
    for (const side of [-1, 1]) {
      const hx = x + side * (w / 2 + 0.11);
      const cx = hx + side * Math.cos(open) * sw * 0.5;
      const cz = z + 0.1 + Math.sin(open) * sw * 0.5;
      k.box(sw, h, 0.06, shutter, { position: [cx, y, cz], rotation: [0, -side * open, 0], pattern: Pattern.Planks });
    }
  }
  k.box(w + 0.45, 0.1, 0.32, frame, { position: [x, y - h / 2 - 0.14, z + 0.14] });
  k.box(w + 0.35, 0.16, 0.14, frame, { position: [x, y + h / 2 + 0.16, z + 0.06] });
}

/** Balcony slab with brackets, a wrought-iron railing, flower pots and maybe laundry. */
function addBalcony(k: ModelKit, rnd: Random, x: number, y: number, z: number, w: number, panda = false): void {
  const depth = 0.95;
  k.box(w, 0.16, depth, FRAME, { position: [x, y, z + depth / 2] });
  for (const bx of [-w / 2 + 0.2, w / 2 - 0.2]) k.box(0.14, 0.35, 0.5, FRAME, { position: [x + bx, y - 0.24, z + 0.25] });
  const bars = Math.max(4, Math.round(w / 0.2));
  for (let i = 0; i <= bars; i++) k.box(0.035, 0.85, 0.035, INK, { position: [x - w / 2 + (w / bars) * i, y + 0.5, z + depth - 0.04] });
  for (const sx of [-1, 1]) k.box(0.035, 0.85, 0.035, INK, { position: [x + sx * (w / 2 - 0.02), y + 0.5, z + depth / 2] });
  k.box(w + 0.04, 0.05, 0.06, INK, { position: [x, y + 0.93, z + depth - 0.04] });
  k.box(w, 0.04, 0.04, INK, { position: [x, y + 0.2, z + depth - 0.04] });
  // Pots of flowers along the rail.
  const pots = Math.max(1, Math.floor(w / 1.1));
  for (let i = 0; i < pots; i++) {
    if (rnd.chance(0.35)) continue;
    const px = x - w / 2 + (w / pots) * (i + 0.5);
    k.cylinder(0.18, 0.13, 0.28, 7, '#c8643a', { position: [px, y + 0.22, z + depth - 0.28] });
    k.blob(0.26, rnd.pick(rnd.chance(0.5) ? FLOWERS : GREENS), { position: [px, y + 0.5, z + depth - 0.28], detail: 0, roughness: 0.25, seed: px + y, pattern: Pattern.Leaves });
  }
  if (panda) addPanda(k, x + w * 0.25, y + 0.08, z + depth * 0.45);
  if (rnd.chance(0.25)) {
    // Laundry line with a few shirts.
    k.box(w, 0.02, 0.02, INK, { position: [x, y + 1.9, z + depth - 0.1] });
    for (let i = 0; i < 3; i++) k.box(0.4, 0.5, 0.03, rnd.pick(['#f6f0e4', '#e8559a', '#3e6fa8', '#f4d23b']), { position: [x - w / 3 + i * (w / 3), y + 1.62, z + depth - 0.1], rotation: [0, 0, rnd.jitter(0.1)] });
  }
}

/** A person in a panda costume leaning on the rail (a nod to the reference town). */
function addPanda(k: ModelKit, x: number, y: number, z: number): void {
  k.blob(0.32, '#f6f3ec', { position: [x, y + 0.42, z], scale: [1, 1.1, 0.9], detail: 1, roughness: 0.05 });
  k.blob(0.26, '#f6f3ec', { position: [x, y + 0.95, z + 0.05], detail: 1, roughness: 0.03 });
  for (const s of [-1, 1]) {
    k.blob(0.09, INK, { position: [x + s * 0.18, y + 1.17, z + 0.02], detail: 0, roughness: 0 });
    k.blob(0.07, INK, { position: [x + s * 0.09, y + 0.99, z + 0.26], scale: [1, 1.3, 0.5], detail: 0, roughness: 0 });
    k.blob(0.11, INK, { position: [x + s * 0.3, y + 0.62, z + 0.25], scale: [1, 1.6, 1], detail: 0, roughness: 0 });
  }
  k.blob(0.05, INK, { position: [x, y + 0.9, z + 0.3], detail: 0, roughness: 0 });
}

function addDoor(k: ModelKit, rnd: Random, x: number, z: number, colour: string): void {
  k.box(1.5, 2.55, 0.12, FRAME, { position: [x, 1.3, z + 0.02] });
  k.box(1.2, 2.25, 0.1, colour, { position: [x, 1.15, z + 0.07], pattern: Pattern.Planks });
  k.box(0.04, 2.2, 0.04, INK, { position: [x, 1.15, z + 0.13] });
  k.box(1.1, 0.35, 0.08, GLASS, { position: [x, 2.1, z + 0.12], nightGlow: 1 });
  k.box(1.8, 0.18, 0.7, '#e9dcc4', { position: [x, 0.09, z + 0.35], pattern: Pattern.Stone });
  // Wall lantern beside the door.
  k.box(0.08, 0.35, 0.2, INK, { position: [x + 1.05, 2.1, z + 0.12] });
  k.box(0.22, 0.3, 0.22, '#fff2b8', { position: [x + 1.05, 2.2, z + 0.3], nightGlow: 1 });
  if (rnd.chance(0.6)) {
    for (const s of [-1, 1]) {
      k.cylinder(0.24, 0.18, 0.45, 8, '#c8643a', { position: [x + s * 1.0, 0.4, z + 0.45] });
      k.blob(0.38, rnd.pick(GREENS), { position: [x + s * 1.0, 0.85, z + 0.45], detail: 1, roughness: 0.2, seed: x + s, pattern: Pattern.Leaves });
    }
  }
}

function addAwning(k: ModelKit, rnd: Random, x: number, y: number, z: number, w: number): void {
  const stripes = Math.max(6, Math.round(w / 0.45));
  const stripe = rnd.pick(['#d8463a', '#2f8f86', '#3e6fa8', '#f08a2e']);
  for (let i = 0; i < stripes; i++) {
    const sx = x - w / 2 + (w / stripes) * (i + 0.5);
    const col = i % 2 ? '#f6f0e4' : stripe;
    k.box(w / stripes, 0.07, 1.4, col, { position: [sx, y, z + 0.65], rotation: [0.42, 0, 0] });
    // Scalloped valance.
    k.cylinder(w / stripes / 2, w / stripes / 2, 0.05, 8, col, { position: [sx, y - 0.4, z + 1.28], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] });
  }
}

/**
 * Procedural house in the style of the reference town: pastel stucco with a
 * brick texture, shuttered windows, iron balconies with flower pots, tiled
 * gable or hipped roofs, cornices, corner stones, drainpipes and shop fronts.
 * Front faces +Z, base centred at the origin.
 */
export function buildHouse(rnd: Random, wall: string, style: HouseStyle = rnd.pick(['townhouse', 'townhouse', 'narrow', 'wooden', 'shop'] as const)): HouseInfo {
  const k = new ModelKit();
  const narrow = style === 'narrow';
  const colonial = style === 'colonial';
  const w = narrow ? rnd.range(4.2, 5.4) : colonial ? rnd.range(9, 12) : rnd.range(6, 9.5);
  const d = narrow ? rnd.range(4.5, 5.5) : rnd.range(6, 8);
  const floors = narrow ? rnd.int(3, 5) : colonial ? rnd.int(1, 2) : rnd.int(2, 4);
  const floorH = colonial ? 3.6 : 3.1;
  const h = floors * floorH + 0.5;
  const shutter = rnd.pick(SHUTTER);
  const wallPattern = style === 'wooden' ? Pattern.Planks : Pattern.Brick;
  const accent = shade(wall, 0.84);
  const trim = style === 'wooden' ? shade(wall, 0.78) : FRAME;

  // Walls, plinth, floor bands, cornice.
  k.box(w, h, d, wall, { position: [0, h / 2, 0], pattern: wallPattern });
  k.box(w + 0.14, 0.7, d + 0.14, accent, { position: [0, 0.35, 0], pattern: Pattern.Stone });
  for (let f = 1; f < floors; f++) k.box(w + 0.16, 0.16, d + 0.16, trim, { position: [0, f * floorH + 0.2, 0] });
  k.box(w + 0.4, 0.3, d + 0.4, trim, { position: [0, h - 0.1, 0] });
  // Corner stones (quoins).
  if (style !== 'wooden') {
    for (const sx of [-1, 1]) {
      for (let y = 0.9; y < h - 0.4; y += 0.55) {
        const long = Math.round(y / 0.55) % 2 === 0;
        k.box(long ? 0.55 : 0.32, 0.4, 0.08, trim, { position: [sx * (w / 2 - (long ? 0.27 : 0.16)), y, d / 2 + 0.03] });
      }
    }
  }
  // Drainpipe.
  const px = (rnd.chance(0.5) ? -1 : 1) * (w / 2 - 0.12);
  k.cylinder(0.07, 0.07, h - 0.2, 6, shade(wall, 0.6), { position: [px, h / 2, d / 2 + 0.1] });
  k.box(0.28, 0.25, 0.28, shade(wall, 0.6), { position: [px, h - 0.3, d / 2 + 0.1] });

  // Roof.
  const roofColour = rnd.pick(ROOF);
  const overhang = 0.45;
  if (narrow || colonial || rnd.chance(0.45)) {
    const rh = narrow ? rnd.range(2.2, 3.4) : colonial ? rnd.range(2.4, 3) : rnd.range(1.8, 2.6);
    k.add(hipRoofGeometry(w + overhang * 2, d + overhang * 2, rh), roofColour, { position: [0, h + 0.05, 0], pattern: Pattern.RoofTiles });
    k.box(w + overhang * 2 + 0.05, 0.12, d + overhang * 2 + 0.05, shade(roofColour, 0.7), { position: [0, h, 0] });
  } else {
    const rh = rnd.range(1.8, 2.8);
    k.gable(w + overhang * 2, rh, d + overhang * 2, roofColour, { position: [0, h + 0.05, 0], pattern: Pattern.RoofTiles });
    k.box(w + overhang * 2, 0.12, d + overhang * 2, shade(roofColour, 0.7), { position: [0, h, 0] });
    // Gable-end triangles filled with wall colour.
    k.gable(0.02, rh - 0.1, d, wall, { position: [w / 2 - 0.01, h, 0], pattern: wallPattern });
    k.gable(0.02, rh - 0.1, d, wall, { position: [-w / 2 + 0.01, h, 0], pattern: wallPattern });
    if (rnd.chance(0.6)) {
      const cx = rnd.range(-w / 3, w / 3);
      k.box(0.7, 1.8, 0.7, accent, { position: [cx, h + rh * 0.55, rnd.range(-0.6, 0.6)], pattern: Pattern.Brick });
      k.box(0.9, 0.15, 0.9, trim, { position: [cx, h + rh * 0.55 + 0.95, 0] });
    }
  }

  // Colonial veranda: columns and a lean-to tiled roof (Galle / Kandy).
  if (colonial) {
    k.box(w + 0.6, 0.5, 2.6, '#e9dcc4', { position: [0, 0.25, d / 2 + 1.3], pattern: Pattern.Stone });
    const cols = Math.round(w / 1.9);
    for (let i = 0; i <= cols; i++) {
      const cx = -w / 2 + (w / cols) * i;
      k.cylinder(0.18, 0.2, floorH - 0.3, 10, '#f6f2ea', { position: [cx, 0.5 + (floorH - 0.3) / 2, d / 2 + 2.3] });
      k.box(0.5, 0.2, 0.5, '#f6f2ea', { position: [cx, floorH + 0.2, d / 2 + 2.3] });
    }
    k.box(w + 0.8, 0.14, 3.1, roofColour, { position: [0, floorH + 0.55, d / 2 + 1.35], rotation: [0.28, 0, 0], pattern: Pattern.RoofTiles });
  }

  // Windows per floor, a door, balconies.
  const cols = Math.max(1, Math.floor(w / (narrow ? 2.2 : 2.4)));
  const spacing = w / cols;
  const doorCol = Math.floor(cols / 2);
  const winW = narrow ? 1.0 : 1.05;
  for (let f = 0; f < floors; f++) {
    const y = f * floorH + (f === 0 ? 1.55 : 1.75);
    const balcony = f > 0 && !colonial && rnd.chance(0.45);
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + spacing * (c + 0.5);
      if (f === 0 && c === doorCol) {
        addDoor(k, rnd, x, d / 2, rnd.pick(['#7a4a2a', '#3e6fa8', '#2f8f86', '#9a3a2a']));
        continue;
      }
      if (f === 0 && style === 'shop') {
        // Shop window.
        k.box(spacing - 0.5, 1.9, 0.1, GLASS, { position: [x, 1.45, d / 2 + 0.05], nightGlow: 1 });
        k.box(spacing - 0.3, 0.14, 0.2, FRAME, { position: [x, 0.5, d / 2 + 0.1] });
        continue;
      }
      addWindow(k, rnd, x, y, d / 2, winW, balcony ? 1.9 : 1.35, balcony ? '' : shutter, trim);
    }
    if (balcony) addBalcony(k, rnd, 0, f * floorH + 0.35, d / 2, Math.min(w - 0.6, cols * spacing - 0.4), rnd.chance(0.12));
    // Side windows.
    for (const sx of [-1, 1]) {
      if (!rnd.chance(0.55)) continue;
      const zc = rnd.range(-d / 4, d / 4);
      k.box(0.1, 1.2, 0.85, GLASS, { position: [sx * (w / 2 + 0.03), y, zc], nightGlow: rnd.chance(0.4) ? 1 : 0 });
      k.box(0.12, 0.1, 1.1, trim, { position: [sx * (w / 2 + 0.05), y - 0.66, zc] });
    }
  }

  // Shop front: awning and a painted sign.
  if (style === 'shop' || (!colonial && rnd.chance(0.25))) {
    addAwning(k, rnd, 0, 2.85, d / 2, Math.min(w - 0.4, 5.5));
    k.box(Math.min(w - 1, 3.2), 0.55, 0.1, rnd.pick(['#2f8f86', '#d8463a', '#3e6fa8', '#f4d23b']), { position: [0, 3.55, d / 2 + 0.1] });
  }
  // Wall climbers.
  if (rnd.chance(0.35)) {
    const vx = rnd.range(-w / 2 + 0.5, w / 2 - 0.5);
    for (let y = 0.8; y < h * rnd.range(0.4, 0.9); y += 0.7) {
      k.blob(rnd.range(0.35, 0.6), rnd.pick(rnd.chance(0.3) ? FLOWERS : GREENS), { position: [vx + rnd.jitter(0.4), y, d / 2 + 0.15], detail: 0, roughness: 0.3, seed: y + vx, pattern: Pattern.Leaves });
    }
  }
  return { geometry: k.build(0.035, rnd.int(0, 999)), width: w + (colonial ? 0.8 : 0), depth: d + (colonial ? 2.6 : 0), height: h };
}

/** Tall apartment block with window grid, orange balcony boxes and vines (reference skyline). */
export function buildTower(rnd: Random, wall: string, w: number, h: number, d: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(w, h, d, wall, { position: [0, h / 2, 0], pattern: Pattern.Brick });
  k.box(w + 0.8, 1.0, d + 0.8, shade(wall, 0.85), { position: [0, h + 0.5, 0] });
  k.box(w * 0.3, 3, d * 0.3, shade(wall, 0.8), { position: [w * 0.2, h + 2, 0] });
  const cols = Math.floor(w / 3.2);
  const rows = Math.floor(h / 3.3);
  for (let r = 1; r < rows; r++) {
    k.box(w + 0.1, 0.18, 0.2, shade(wall, 0.88), { position: [0, r * 3.3 - 0.3, d / 2 + 0.05] });
    for (let c = 0; c < cols; c++) {
      if (rnd.chance(0.08)) continue;
      const x = -w / 2 + (w / cols) * (c + 0.5);
      const y = r * 3.3 + 0.9;
      k.box(1.2, 1.5, 0.2, GLASS, { position: [x, y, d / 2], nightGlow: rnd.chance(0.35) ? 1 : 0 });
      k.box(1.4, 0.12, 0.3, FRAME, { position: [x, y - 0.82, d / 2 + 0.1] });
      if (rnd.chance(0.16)) {
        // Orange balcony box with a plant.
        k.box(1.7, 1.0, 0.9, '#d8643a', { position: [x, y - 0.6, d / 2 + 0.5], pattern: Pattern.Planks });
        k.blob(0.45, rnd.pick(GREENS), { position: [x, y - 0.0, d / 2 + 0.5], detail: 0, seed: x + y, pattern: Pattern.Leaves });
      }
    }
  }
  // Vines down two corners.
  for (const cx of [w / 2 - 0.3, -w / 2 + 0.3]) {
    if (!rnd.chance(0.7)) continue;
    for (let y = 2; y < h * rnd.range(0.5, 0.95); y += 1.2) {
      k.blob(rnd.range(0.5, 0.95), rnd.pick(GREENS), { position: [cx + rnd.jitter(0.4), y, d / 2 + 0.25], detail: 0, seed: y + cx, pattern: Pattern.Leaves });
    }
  }
  return k.build(0.08, rnd.int(0, 999));
}

/** Kiosk with a bright blue door (Doorway Loop). Front faces +Z. */
export function buildKiosk(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const w = rnd.range(2.6, 3.4);
  k.box(w, 3.2, 2.6, '#f1ebe0', { position: [0, 1.6, 0], pattern: Pattern.Brick });
  k.box(w + 0.3, 0.25, 2.9, '#9aa0b8', { position: [0, 3.3, 0] });
  k.box(1.3, 2.4, 0.1, FRAME, { position: [0, 1.2, 1.3] });
  k.box(1.1, 2.2, 0.12, '#2f62c8', { position: [0, 1.1, 1.32], pattern: Pattern.Planks });
  k.blob(0.05, '#f4d23b', { position: [0.35, 1.1, 1.42], detail: 0 });
  k.blob(1.1, rnd.pick(GREENS), { position: [rnd.jitter(0.6), 3.9, rnd.jitter(0.4)], detail: 1, seed: w, pattern: Pattern.Leaves });
  return k.build(0.04, rnd.int(0, 99));
}

/** Café / market stall with striped awning and fruit crates. Front faces +Z. */
export function buildStall(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(3.2, 1.1, 1.4, '#e8dcc6', { position: [0, 0.55, 0], pattern: Pattern.Planks });
  k.box(3.3, 0.1, 1.5, '#9a5a32', { position: [0, 1.12, 0], pattern: Pattern.Planks });
  for (const x of [-1.5, 1.5]) k.box(0.1, 2.6, 0.1, '#9a5a32', { position: [x, 1.3, 0.6] });
  addAwning(k, rnd, 0, 2.6, -0.4, 3.4);
  for (let i = 0; i < 3; i++) {
    const x = -1 + i;
    k.box(0.8, 0.3, 0.6, '#b9824a', { position: [x, 1.3, 0.2], pattern: Pattern.Planks });
    for (let j = 0; j < 4; j++) k.blob(0.14, rnd.pick(['#f4d23b', '#f08a2e', '#d8463a', '#8cc63f']), { position: [x - 0.25 + j * 0.17, 1.5, 0.2], detail: 0, seed: i * 4 + j });
  }
  k.box(1.6, 0.4, 0.06, '#2b2622', { position: [0, 2.2, 0.62] });
  return k.build(0.03, rnd.int(0, 99));
}

export function shade(hex: string, f: number): string {
  const c = new THREE.Color(hex).multiplyScalar(f);
  return `#${c.getHexString()}`;
}
