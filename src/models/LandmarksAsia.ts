import * as THREE from 'three';
import type { Random } from '../core/Random';
import { ModelKit, Pattern } from './ModelKit';

/**
 * Landmarks for Chapter 4 · Lantern Roads: Fushimi Inari's torii tunnel,
 * the Arashiyama bamboo grove, Hạ Long Bay, Hội An's lantern streets, a
 * Himalayan pass, Hokusai's great wave and Mount Fuji with its pagoda.
 * Stylised painted shapes like the rest of the sketchbook.
 */

const VERMILION = '#e0432f';
const INK = '#2b2622';

/** A vermilion torii gate spanning a road of half-width `half`. Faces ±Z, origin at road level. */
export function buildTorii(half: number, height = 6.2): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const s of [-1, 1]) {
    k.cylinder(0.32, 0.36, height, 10, VERMILION, { position: [s * half, height / 2, 0] });
    k.cylinder(0.46, 0.46, 0.5, 10, INK, { position: [s * half, 0.25, 0] });
  }
  // Nuki (tie beam) and the black-capped kasagi with upturned ends.
  k.box(half * 2 + 0.9, 0.36, 0.34, VERMILION, { position: [0, height - 1.1, 0] });
  k.box(half * 2 + 2.2, 0.5, 0.6, VERMILION, { position: [0, height + 0.05, 0] });
  k.box(half * 2 + 2.6, 0.26, 0.72, INK, { position: [0, height + 0.42, 0] });
  for (const s of [-1, 1]) k.box(0.9, 0.26, 0.72, INK, { position: [s * (half + 1.55), height + 0.55, 0], rotation: [0, 0, s * 0.25] });
  // The small plaque in the middle.
  k.box(0.7, 0.9, 0.2, INK, { position: [0, height - 0.5, 0.2] });
  return k.build(0.01, 3);
}

/** Stone toro lantern (glows at night). */
export function buildStoneLantern(): THREE.BufferGeometry {
  const k = new ModelKit();
  const stone = '#a6a3a0';
  k.cylinder(0.55, 0.65, 0.3, 6, stone, { position: [0, 0.15, 0], pattern: Pattern.Stone });
  k.cylinder(0.14, 0.18, 1.2, 6, stone, { position: [0, 0.9, 0], pattern: Pattern.Stone });
  k.cylinder(0.45, 0.35, 0.2, 6, stone, { position: [0, 1.6, 0] });
  k.box(0.6, 0.55, 0.6, '#ffe08a', { position: [0, 1.95, 0], nightGlow: 1 });
  k.cylinder(0.05, 0.75, 0.45, 6, stone, { position: [0, 2.45, 0] });
  k.blob(0.12, stone, { position: [0, 2.75, 0], detail: 0 });
  return k.build(0.02, 5);
}

/** A white kitsune statue with a red bib. */
export function buildFox(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(0.9, 0.9, 0.9, '#a6a3a0', { position: [0, 0.45, 0], pattern: Pattern.Stone });
  k.blob(0.35, '#f6f0e4', { position: [0, 1.25, 0], scale: [0.8, 1.2, 1], detail: 1 });
  k.blob(0.22, '#f6f0e4', { position: [0, 1.75, -0.1], detail: 1 });
  for (const s of [-1, 1]) k.cylinder(0.01, 0.08, 0.25, 4, '#f6f0e4', { position: [s * 0.1, 1.98, -0.08] });
  k.cylinder(0.02, 0.1, 0.3, 4, '#f6f0e4', { position: [0, 1.72, -0.35], rotation: [-Math.PI / 2, 0, 0] });
  k.box(0.46, 0.22, 0.05, VERMILION, { position: [0, 1.45, -0.29], rotation: [0.3, 0, 0] });
  k.blob(0.18, '#f6f0e4', { position: [0, 1.2, 0.35], scale: [0.7, 1.8, 0.7], detail: 0 });
  return k.build(0.02, 2);
}

/** A clump of bamboo: tall segmented canes with leafy tops. */
export function buildBambooClump(rnd: Random, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const greens = ['#6fae3a', '#8cc63f', '#5c9a32'];
  const canes = rnd.int(4, 7);
  for (let i = 0; i < canes; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0, 1.2);
    const h = height * rnd.range(0.8, 1.1);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const lean = rnd.range(-0.06, 0.06);
    const c = rnd.pick(greens);
    k.cylinder(0.14, 0.18, h, 6, c, { position: [x, h / 2, z], rotation: [lean, 0, lean] });
    for (let n = 1.5; n < h; n += 1.6) k.cylinder(0.2, 0.2, 0.08, 6, '#4f7a2a', { position: [x + lean * n, n, z - lean * n] });
    k.blob(rnd.range(0.9, 1.5), rnd.pick(greens), { position: [x + lean * h, h + 0.4, z - lean * h], scale: [1.3, 0.6, 1.3], detail: 0, pattern: Pattern.Leaves, seed: i });
  }
  return k.build(0.05, rnd.int(0, 99));
}

/** A limestone karst tower rising from the sea, jungle on top. Origin at sea level. */
export function buildKarst(rnd: Random, radius: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(1, '#9aa39a', { position: [0, height * 0.45, 0], scale: [radius, height * 0.55, radius * rnd.range(0.8, 1.1)], detail: 2, roughness: 0.18, pattern: Pattern.Stone, seed: rnd.int(0, 99) });
  k.blob(1, '#4f9a4a', { position: [0, height * 0.95, 0], scale: [radius * 0.8, height * 0.12, radius * 0.75], detail: 1, roughness: 0.3, pattern: Pattern.Leaves, seed: rnd.int(0, 99) });
  for (let i = 0; i < 5; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.blob(radius * 0.18, '#5c9a32', { position: [Math.cos(a) * radius * 0.75, height * rnd.range(0.4, 0.8), Math.sin(a) * radius * 0.75], detail: 0, pattern: Pattern.Leaves, seed: i });
  }
  return k.build(radius * 0.02, rnd.int(0, 99));
}

/** A junk boat with red battened sails. Faces -Z, origin at water level. */
export function buildJunk(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(3, 1.4, 11, '#7a4a2a', { position: [0, 0.4, 0], pattern: Pattern.Planks });
  k.box(3.2, 0.9, 2.6, '#9a6a3a', { position: [0, 1.5, 3.8], pattern: Pattern.Planks });
  for (const [z, h] of [[-2.6, 8.5], [1.2, 10.5]] as const) {
    k.cylinder(0.12, 0.14, h, 5, '#5a3a22', { position: [0, h / 2 + 1, z] });
    const w = h * 0.6;
    k.box(0.08, h * 0.78, w, rnd.pick(['#c8452e', '#b8472e', '#d2643a']), { position: [0, h * 0.55 + 1, z + w * 0.3] });
    for (let b = 0; b < 5; b++) k.box(0.12, 0.06, w + 0.2, INK, { position: [0.02, 1.8 + b * (h * 0.15), z + w * 0.3] });
  }
  return k.build(0.02, rnd.int(0, 99));
}

/** A string of silk lanterns across a street of half-width `half` at height `h`. */
export function buildLanternString(rnd: Random, half: number, h: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#e0432f', '#f4a13b', '#f4d23b', '#e8559a', '#3e9fd8', '#5dbb3f', '#9a5bd6'];
  const n = Math.max(4, Math.round(half * 1.1));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(-half + t * half * 2, h - Math.sin(t * Math.PI) * 1.2, 0));
  }
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.03, 4), INK);
  for (let i = 1; i < n; i++) {
    const p = pts[i];
    const c = rnd.pick(colours);
    k.blob(0.42, c, { position: [p.x, p.y - 0.6, 0], scale: [1, 1.25, 1], detail: 1, seed: i });
    k.cylinder(0.2, 0.2, 0.12, 8, INK, { position: [p.x, p.y - 0.08, 0] });
    k.cylinder(0.16, 0.16, 0.1, 8, '#ffe08a', { position: [p.x, p.y - 1.1, 0], nightGlow: 1 });
    k.box(0.02, 0.35, 0.02, c, { position: [p.x, p.y - 1.35, 0] });
  }
  return k.build(0, rnd.int(0, 99));
}

/** Tibetan prayer flags strung between two poles. */
export function buildPrayerFlags(half: number, h: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const colours = ['#3e6fe0', '#f6f0e4', '#d8463a', '#5dbb3f', '#f4d23b'];
  for (const s of [-1, 1]) k.cylinder(0.08, 0.1, h + 0.5, 5, '#7a5a3a', { position: [s * half, (h + 0.5) / 2, 0] });
  const n = Math.round(half * 2.4);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = -half + t * half * 2;
    const y = h - Math.sin(t * Math.PI) * 1.4;
    k.box(0.5, 0.6, 0.03, colours[i % colours.length], { position: [x, y - 0.35, 0], rotation: [0, 0, Math.sin(i) * 0.1] });
  }
  k.box(half * 2, 0.03, 0.03, INK, { position: [0, h - 0.7, 0] });
  return k.build(0.02, 7);
}

/** A small white chorten (Himalayan stupa) with a gold spire. */
export function buildChorten(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(4, 1.2, 4, '#f6f0e4', { position: [0, 0.6, 0] });
  k.box(3.2, 0.8, 3.2, '#f6f0e4', { position: [0, 1.6, 0] });
  k.blob(1.4, '#f6f0e4', { position: [0, 2.9, 0], scale: [1, 0.9, 1], detail: 2 });
  k.box(1.1, 0.5, 1.1, '#d8463a', { position: [0, 4.2, 0] });
  for (let i = 0; i < 7; i++) k.cylinder(0.5 - i * 0.05, 0.55 - i * 0.05, 0.22, 10, '#e2b23a', { position: [0, 4.6 + i * 0.26, 0] });
  k.blob(0.25, '#e2b23a', { position: [0, 6.6, 0], detail: 1 });
  return k.build(0.02, 4);
}

/**
 * Hokusai's great wave: a tall blue curl with white foam "claws", arching over
 * the road. Local +z runs along the road; the curl breaks over +x.
 */
export function buildGreatWave(length: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const blues = ['#1f4e8c', '#2f6db0', '#3e86c9'];
  const slices = Math.round(length / 3);
  for (let i = 0; i < slices; i++) {
    const z = -length / 2 + (i + 0.5) * (length / slices);
    const swell = 0.75 + Math.sin((i / slices) * Math.PI) * 0.35;
    const R = height * 0.5 * swell;
    // The curl: a partial torus in the x-y plane.
    const curl = new THREE.TorusGeometry(R, R * 0.28, 6, 14, Math.PI * 1.35);
    k.add(curl, blues[i % 3], { position: [0, R, z], rotation: [0, 0, -Math.PI * 0.15] });
    // Foam claws at the lip.
    for (let c = 0; c < 4; c++) {
      const a = Math.PI * 1.2 + c * 0.08;
      k.blob(R * 0.14, '#f6f3ec', { position: [Math.cos(a - Math.PI * 0.15) * R + c * 0.4, R + Math.sin(a - Math.PI * 0.15) * R - c * 0.5, z], scale: [1, 0.7, 1.2], detail: 0, seed: i * 4 + c });
    }
  }
  return k.build(0.02, 11);
}

/** A five-storey red pagoda (Chūreitō). */
export function buildPagoda(): THREE.BufferGeometry {
  const k = new ModelKit();
  let y = 0;
  for (let i = 0; i < 5; i++) {
    const w = 9 - i * 1.3;
    k.box(w * 0.72, 2.6, w * 0.72, VERMILION, { position: [0, y + 1.3, 0] });
    k.box(w * 0.5, 1.2, 0.1, '#f6f0e4', { position: [0, y + 1.5, w * 0.36 + 0.02] });
    k.cylinder(w * 0.05, w * 0.78, 1.1, 4, INK, { position: [0, y + 3.1, 0], rotation: [0, Math.PI / 4, 0] });
    y += 3.6;
  }
  k.cylinder(0.12, 0.2, 5, 6, '#e2b23a', { position: [0, y + 2.5, 0] });
  for (let r = 0; r < 6; r++) k.cylinder(0.45, 0.45, 0.1, 10, '#e2b23a', { position: [0, y + 1 + r * 0.6, 0] });
  return k.build(0.02, 6);
}

/** A cherry tree in full blossom. */
export function buildCherryTree(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const pinks = ['#f7b8cf', '#f4a3c0', '#fbd3e1', '#f08fb4'];
  k.cylinder(0.3, 0.45, 3, 6, '#5a3a2a', { position: [0, 1.5, 0] });
  for (let i = 0; i < 3; i++) {
    const a = rnd.range(0, Math.PI * 2);
    k.cylinder(0.12, 0.2, 2.4, 5, '#5a3a2a', { position: [Math.cos(a) * 0.8, 3.6, Math.sin(a) * 0.8], rotation: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] });
  }
  for (let i = 0; i < 7; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = rnd.range(0.3, 2.2);
    k.blob(rnd.range(1.2, 2), rnd.pick(pinks), { position: [Math.cos(a) * r, rnd.range(4, 6), Math.sin(a) * r], detail: 1, roughness: 0.2, pattern: Pattern.Leaves, seed: i });
  }
  return k.build(0.04, rnd.int(0, 99));
}

/** Mount Fuji: a broad cone with a snow cap. Origin at ground level. */
export function buildFuji(radius: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(radius * 0.08, radius, height, 28, '#6a6f9a', { position: [0, height / 2, 0], pattern: Pattern.Stone });
  k.cylinder(radius * 0.08, radius * 0.36, height * 0.34, 28, '#f6f3ec', { position: [0, height * 0.83 + 0.2, 0] });
  // Snow streaks running down the flanks.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = radius * 0.4;
    k.box(radius * 0.05, height * 0.14, radius * 0.05, '#f6f3ec', { position: [Math.cos(a) * r, height * 0.6, Math.sin(a) * r], rotation: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] });
  }
  return k.build(radius * 0.004, 8);
}

/** A Hội An shophouse front: yellow walls, wooden shutters, tiled roof. Faces -Z. */
export function buildShophouse(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  const wall = rnd.pick(['#f2c14e', '#f4d23b', '#eab64a', '#f0c97a']);
  const w = rnd.range(6, 8);
  const h = rnd.range(6, 8.5);
  k.box(w, h, 8, wall, { position: [0, h / 2, 0], pattern: Pattern.Brick });
  k.gable(w + 1, 2.4, 9, '#b8472e', { position: [0, h + 1.2, 0], pattern: Pattern.RoofTiles });
  k.box(w + 0.6, 0.3, 1.8, '#b8472e', { position: [0, h * 0.5, -4.8], rotation: [0.25, 0, 0], pattern: Pattern.RoofTiles });
  for (const s of [-1, 1]) k.box(w * 0.3, 2.4, 0.2, '#6b8f5a', { position: [s * w * 0.22, 1.3, -4.02] });
  for (const s of [-1, 1]) k.box(1.1, 1.5, 0.2, '#6b8f5a', { position: [s * w * 0.25, h * 0.72, -4.02] });
  k.box(1.2, 1.4, 0.1, '#ffe08a', { position: [0, h * 0.72, -4.02], nightGlow: 1 });
  return k.build(0.03, rnd.int(0, 99));
}
