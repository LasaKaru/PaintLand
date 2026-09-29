import type * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';

/**
 * Places of worship for the towns and chapters, sketched with the same care
 * as every other landmark: a Colombo mosque, a Mughal mosque, a church, a
 * gurdwara, a synagogue and a Sri Lankan Buddhist temple. (Kovils use the
 * gopuram in LandmarksIndia; stupas and pagodas are elsewhere.) They are
 * places to see, never targets or props for games.
 */

const INK = '#2b2622';

/** An onion dome with a finial, centred at (x, y, z). */
function onion(k: ModelKit, x: number, y: number, z: number, r: number, colour: string, finial = '#e8c872'): void {
  k.cylinder(r * 0.9, r * 0.95, r * 0.35, 12, colour, { position: [x, y, z] });
  k.blob(r, colour, { position: [x, y + r * 0.8, z], scale: [1, 1.05, 1], detail: 1, roughness: 0.02 });
  k.cylinder(0, r * 0.35, r * 0.8, 8, colour, { position: [x, y + r * 2, z] });
  k.cylinder(0.08 * r, 0.08 * r, r * 0.7, 6, finial, { position: [x, y + r * 2.6, z] });
}

/** A round arch shape (a door or window) on a wall facing −Z at (x, y, z). */
function arch(k: ModelKit, x: number, y: number, z: number, w: number, h: number, colour: string): void {
  k.box(w, h, 0.2, colour, { position: [x, y + h / 2, z] });
  k.cylinder(w / 2, w / 2, 0.2, 12, colour, { position: [x, y + h, z], rotation: [Math.PI / 2, 0, 0] });
}

/** Colombo's red-and-white mosque (like the Jami Ul-Alfar in Pettah): candy-striped walls, small domes and minarets. */
export function buildRedMosque(): THREE.BufferGeometry {
  const k = new ModelKit();
  const red = '#c0392b';
  const white = '#f6f0e4';
  // The hall in stripes.
  for (let i = 0; i < 9; i++) k.box(24, 1.4, 16, i % 2 ? white : red, { position: [0, 0.7 + i * 1.4, 0] });
  k.box(24.4, 0.6, 16.4, white, { position: [0, 12.9, 0] });
  // Crenellations.
  for (let i = -5; i <= 5; i++) k.box(1.1, 1, 0.6, red, { position: [i * 2.2, 13.7, -8] });
  // Arched windows in two rows, and the door.
  for (const y of [2.2, 7.6]) for (let i = -3; i <= 3; i++) if (!(y < 4 && i === 0)) arch(k, i * 3.2, y, -8.15, 1.4, 2.4, INK);
  arch(k, 0, 0, -8.2, 3, 4, '#5a2a1a');
  // Corner towers with little onion domes, and two striped minarets at the front.
  for (const [x, z] of [[-12, -8], [12, -8], [-12, 8], [12, 8]]) {
    k.cylinder(1.3, 1.3, 15, 10, white, { position: [x, 7.5, z] });
    onion(k, x, 15, z, 1.5, red);
  }
  for (const x of [-6, 6]) {
    for (let i = 0; i < 12; i++) k.cylinder(1, 1, 1.5, 10, i % 2 ? white : red, { position: [x, 13.75 + i * 1.5, -8.6] });
    k.cylinder(1.5, 1.5, 0.5, 10, white, { position: [x, 24, -8.6] });
    onion(k, x, 31.5, -8.6, 1.3, red);
  }
  onion(k, 0, 13.2, 0, 4.2, red);
  return k.build(0.03);
}

/** A Mughal mosque (like the Jama Masjid in Old Delhi): red sandstone platform, white marble domes, two minarets. */
export function buildMughalMosque(): THREE.BufferGeometry {
  const k = new ModelKit();
  const sand = '#b5533a';
  const marble = '#f3ede0';
  k.box(60, 4, 40, sand, { position: [0, 2, 0], pattern: Pattern.Stone });
  for (let i = -6; i <= 6; i++) k.box(2, 1, 1, sand, { position: [i * 4.6, 4.5, -20] });
  // The prayer hall: arches along the front.
  k.box(44, 14, 16, sand, { position: [0, 11, 6], pattern: Pattern.Stone });
  for (let i = -4; i <= 4; i++) arch(k, i * 4.6, 4.2, -2.1, i === 0 ? 5 : 3, i === 0 ? 8 : 6, i === 0 ? marble : '#8a3a24');
  k.box(12, 17, 1, sand, { position: [0, 12.5, -2.4] });
  // Three striped marble domes.
  for (const [x, r] of [[-14, 4.5], [0, 6.5], [14, 4.5]] as [number, number][]) {
    for (let i = 0; i < 5; i++) k.cylinder(r * (0.95 - i * 0.02), r * 0.95, 0.5, 16, i % 2 ? marble : INK, { position: [x, 18.3 + i * 0.5, 6] });
    onion(k, x, 20, 6, r, marble);
  }
  // Two minarets in bands of sandstone and marble.
  for (const x of [-26, 26]) {
    for (let i = 0; i < 7; i++) k.cylinder(1.6 - i * 0.1, 1.7 - i * 0.1, 5, 12, i % 2 ? marble : sand, { position: [x, 6.5 + i * 5, 2] });
    for (const y of [17, 29]) k.cylinder(2.4, 2.4, 0.6, 12, marble, { position: [x, y, 2] });
    onion(k, x, 41, 2, 1.8, marble);
  }
  return k.build(0.03);
}

/** A white church: a gabled nave, a bell tower with a spire, an arched door and a small cross. */
export function buildChurch(style: 'colonial' | 'stone' | 'brick' = 'colonial'): THREE.BufferGeometry {
  const k = new ModelKit();
  const wall = style === 'stone' ? '#b9ab94' : style === 'brick' ? '#a8543a' : '#f6f0e4';
  const roof = style === 'stone' ? '#5a5a66' : style === 'brick' ? '#3f4a52' : '#b0452a';
  const pat = style === 'stone' ? Pattern.Stone : style === 'brick' ? Pattern.Brick : Pattern.None;
  k.box(14, 10, 26, wall, { position: [0, 5, 4], pattern: pat });
  for (const s of [-1, 1]) k.box(9, 0.6, 27, roof, { position: [s * 3.6, 12.2, 4], rotation: [0, 0, -s * 0.72], pattern: Pattern.RoofTiles });
  k.box(14, 4, 0.6, wall, { position: [0, 11.5, -9] });
  // Tower and spire at the front.
  k.box(6, 20, 6, wall, { position: [0, 10, -11], pattern: pat });
  k.cylinder(0, 4.2, 9, 4, roof, { position: [0, 24.5, -11], rotation: [0, Math.PI / 4, 0] });
  k.box(0.3, 2.4, 0.3, '#e8c872', { position: [0, 30, -11] });
  k.box(1.4, 0.3, 0.3, '#e8c872', { position: [0, 30.4, -11] });
  arch(k, 0, 15, -14.1, 1.8, 2.4, INK); // belfry
  arch(k, 0, 0, -14.1, 2.6, 4.2, '#6a3a22'); // door
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.box(0.2, 3.4, 1.6, '#3e6fa8', { position: [s * 7.1, 5.7, i * 5.5 - 2] });
  // Steps.
  k.box(8, 0.5, 2, wall, { position: [0, 0.25, -15] });
  return k.build(0.03);
}

/** A gurdwara (like Bangla Sahib in Delhi): white marble, a golden dome, corner kiosks, the Nishan Sahib flag and a pool. */
export function buildGurdwara(): THREE.BufferGeometry {
  const k = new ModelKit();
  const marble = '#f6f2ea';
  const gold = '#e0b33a';
  k.box(34, 2, 30, marble, { position: [0, 1, 0], pattern: Pattern.Stone });
  k.box(22, 10, 18, marble, { position: [0, 7, 2] });
  k.box(16, 5, 12, marble, { position: [0, 14.5, 2] });
  for (let i = -3; i <= 3; i++) arch(k, i * 3, 2, -7.1, 1.6, 4, i === 0 ? gold : '#c9b89a');
  onion(k, 0, 17, 2, 5, gold);
  for (const [x, z] of [[-10, -6], [10, -6], [-10, 10], [10, 10]]) {
    for (const s of [-1, 1]) k.cylinder(0.3, 0.3, 3, 6, marble, { position: [x + s * 0.9, 13.5, z] });
    onion(k, x, 15, z, 1.4, gold);
  }
  // The Nishan Sahib: a tall saffron flag on a clad pole.
  k.cylinder(0.3, 0.4, 24, 8, '#f08a2e', { position: [15, 12, -12] });
  k.box(4.5, 2.6, 0.1, '#f08a2e', { position: [17.3, 21.5, -12] });
  k.cylinder(0.5, 0.5, 1, 8, gold, { position: [15, 24.5, -12] });
  // The sarovar (pool) in front.
  k.box(26, 0.3, 12, '#c9b89a', { position: [0, 0.15, -24] });
  k.box(24, 0.35, 10, '#5a9ab8', { position: [0, 0.2, -24], pattern: Pattern.Glass });
  return k.build(0.03);
}

/** A synagogue (like the New Synagogue in Berlin): a patterned brick front and a ribbed golden dome between two small domes. */
export function buildSynagogue(): THREE.BufferGeometry {
  const k = new ModelKit();
  const brick = '#c98a5a';
  const band = '#e8c89a';
  const gold = '#d8a93a';
  for (let i = 0; i < 8; i++) k.box(22, 1.5, 16, i % 2 ? band : brick, { position: [0, 0.75 + i * 1.5, 0], pattern: Pattern.Brick });
  k.box(8, 20, 8, brick, { position: [0, 10, -6], pattern: Pattern.Brick });
  for (const x of [-9, 9]) k.box(4, 16, 4, brick, { position: [x, 8, -6], pattern: Pattern.Brick });
  // The central dome with gilded ribs, and two small ones.
  k.cylinder(4, 4.2, 3, 16, gold, { position: [0, 21.5, -6] });
  k.blob(4.6, gold, { position: [0, 25, -6], scale: [1, 1.2, 1], detail: 1, roughness: 0.02 });
  for (let i = 0; i < 8; i++) k.box(0.3, 9, 0.3, '#8a6a2a', { position: [Math.cos((i / 8) * Math.PI * 2) * 3.8, 25, -6 + Math.sin((i / 8) * Math.PI * 2) * 3.8], rotation: [0, -(i / 8) * Math.PI * 2, 0] });
  k.cylinder(0.3, 0.3, 3, 6, gold, { position: [0, 31.5, -6] });
  for (const x of [-9, 9]) k.blob(2.2, gold, { position: [x, 17.5, -6], scale: [1, 1.2, 1], detail: 1 });
  // Arched windows and a tall arched door.
  arch(k, 0, 0, -10.1, 3, 5, '#6a3a22');
  for (let i = -2; i <= 2; i++) if (i) arch(k, i * 4, 6, -8.1, 1.2, 3, '#3e6fa8');
  return k.build(0.03);
}

/** A Sri Lankan Buddhist temple: a small white stupa, a shrine hall with an orange roof, a bo tree and a lamp stand. */
export function buildBuddhistTemple(): THREE.BufferGeometry {
  const k = new ModelKit();
  const white = '#f6f2ea';
  k.box(40, 0.6, 34, '#d9c7a4', { position: [0, 0.3, 0], pattern: Pattern.Stone });
  // Stupa.
  k.cylinder(6.5, 7, 1.4, 20, white, { position: [-10, 1.3, 4] });
  k.blob(6, white, { position: [-10, 4.5, 4], scale: [1, 0.9, 1], detail: 1, roughness: 0.02 });
  k.box(2.4, 1.6, 2.4, white, { position: [-10, 10.5, 4] });
  k.cylinder(0.2, 1.2, 5, 10, '#e8c872', { position: [-10, 13.8, 4] });
  // Shrine hall (image house).
  k.box(12, 5, 9, white, { position: [9, 3.1, 4] });
  for (const s of [-1, 1]) k.box(7.5, 0.4, 11, '#d8741e', { position: [9 + s * 3.2, 6.9, 4], rotation: [0, 0, -s * 0.5], pattern: Pattern.RoofTiles });
  arch(k, 9, 0.6, -0.6, 2, 2.8, '#7a4a2a');
  // Bo tree on a stone terrace, and a lamp stand.
  k.cylinder(4, 4.2, 1, 12, '#c9b89a', { position: [0, 1, -8] });
  k.cylinder(0.6, 0.9, 6, 8, '#6a4a2a', { position: [0, 4, -8] });
  k.blob(5, '#4f8a3a', { position: [0, 9, -8], scale: [1.2, 0.8, 1.2], detail: 1 });
  k.cylinder(0.25, 0.6, 2.2, 8, '#c9a24a', { position: [8, 1.7, -8] });
  k.cylinder(1, 0.3, 0.3, 10, '#c9a24a', { position: [8, 2.9, -8], nightGlow: 1 });
  return k.build(0.03);
}

/** The kovil's flag mast (kodimaram): a gilded pole with little tiers, stood before a gopuram. */
export function buildKodimaram(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(3, 1.2, 3, '#d8cfb8', { position: [0, 0.6, 0], pattern: Pattern.Stone });
  k.cylinder(0.35, 0.5, 14, 8, '#e0b33a', { position: [0, 8, 0] });
  for (let i = 0; i < 5; i++) k.box(1.4, 0.2, 1.4, '#e0b33a', { position: [0, 3 + i * 2.4, 0] });
  return k.build(0.02);
}
