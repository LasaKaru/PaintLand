import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildPocket, type PocketKind } from './Pockets';
import { trophyCups } from '../gameplay/Home';
import type { LanternDesign } from '../ui/FestivalGames';

/** Where the home stands in Harbour Town (by the harbour gardens, open side facing the avenue). */
export const HOME_SPOT = { x: -68, z: 42, yaw: Math.PI };
/** Size of the house (local x × z; its open front is +Z before turning). */
const W = 16;
const D = 11;
const H = 5;

/** Local → Harbour Town coordinates. */
export function homeToWorld(lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(HOME_SPOT.yaw);
  const s = Math.sin(HOME_SPOT.yaw);
  return { x: HOME_SPOT.x + lx * c + lz * s, z: HOME_SPOT.z - lx * s + lz * c };
}

/** Floor spots for keepsakes (two rows, in local coordinates). */
const SLOTS: [number, number][] = [
  [-5.2, 1.3], [-3, 1.3], [-0.8, 1.3], [1.4, 1.3], [3.6, 1.3],
  [-5.2, 3.2], [-3, 3.2], [-1.6, 3.2], [1.9, 3.2], [3.4, 3.4],
];

/** One of the postcard frames on the back wall (2 rows of 3). */
function frameSpot(i: number): THREE.Vector3 {
  return new THREE.Vector3(-3.2 + (i % 3) * 3.2, i < 3 ? 3.5 : 1.9, -D / 2 + 0.36);
}

export interface HomeLook {
  walls: string;
  roof: string;
  keepsakes: PocketKind[];
  trophies: number;
  /** Whose home is shown (a friend's when visiting). */
  owner: string;
  /** Vesak lanterns hanging from the front beam. */
  lanterns?: LanternDesign[];
  /** The plants by the window: 0 seedlings … 3 in bloom (see Rest.ts). */
  plants?: number;
}

/**
 * The house itself: an open-fronted cottage (like a doll's house, so you can
 * see in from the street) with keepsakes on the floor, trophy cups on a shelf
 * and up to six postcards framed on the back wall. Rebuilt when it changes.
 */
export class HomePlot {
  readonly group = new THREE.Group();
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private shell: THREE.Mesh | null = null;
  private readonly frames: THREE.Mesh[] = [];
  private readonly sign: THREE.Mesh;

  constructor() {
    this.group.name = 'home';
    this.group.position.set(HOME_SPOT.x, 0, HOME_SPOT.z);
    this.group.rotation.y = HOME_SPOT.yaw;
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new PaintMaterial({ color: '#f6f0e4', gloss: 0.1 }));
      f.position.copy(frameSpot(i));
      f.visible = false;
      this.frames.push(f);
      this.group.add(f);
    }
    this.sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new PaintMaterial({ color: '#ffffff', gloss: 0.05 }));
    this.sign.position.set(0, H + 0.2, D / 2 + 0.25);
    this.group.add(this.sign);
  }

  /** Walls to bump into (Harbour Town coordinates: x, z, half-x, half-z). The front stays open. */
  static walls(): [number, number, number, number][] {
    const back = homeToWorld(0, -D / 2);
    const left = homeToWorld(-W / 2, 0);
    const right = homeToWorld(W / 2, 0);
    return [
      [back.x, back.z, W / 2, 0.4],
      [left.x, left.z, 0.4, D / 2],
      [right.x, right.z, 0.4, D / 2],
    ];
  }

  set(look: HomeLook): void {
    if (this.shell) {
      this.group.remove(this.shell);
      this.shell.geometry.dispose();
    }
    this.shell = new THREE.Mesh(buildHome(look), this.material);
    this.group.add(this.shell);
    this.setSign(look.owner);
  }

  private shelf: THREE.Mesh | null = null;

  /** Souvenirs from your travels on a shelf along the left wall (see Bazaar.ts). */
  setSouvenirs(ids: readonly string[]): void {
    if (this.shelf) {
      this.group.remove(this.shelf);
      this.shelf.geometry.dispose();
      this.shelf = null;
    }
    if (!ids.length) return;
    const k = new ModelKit();
    const x = -W / 2 + 0.55;
    for (const y of [1.25, 2.25]) k.box(0.5, 0.06, 5.2, '#7a4a2a', { position: [x, y, 0], pattern: Pattern.Planks });
    ids.slice(0, 10).forEach((id, i) => souvenirModel(k, id, x, i < 5 ? 1.28 : 2.28, -2 + (i % 5)));
    this.shelf = new THREE.Mesh(k.build(0.01), this.material);
    this.group.add(this.shelf);
  }

  /** Pictures for the frames (null = an empty frame). */
  setPictures(pictures: (HTMLImageElement | HTMLCanvasElement | null)[]): void {
    this.frames.forEach((f, i) => {
      const pic = pictures[i] ?? null;
      const mat = f.material as PaintMaterial;
      const old = mat.uniforms.uPaintMap.value as THREE.Texture | null;
      if (!pic) {
        f.visible = false;
        return;
      }
      const tex = new THREE.Texture(pic);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      f.material = new PaintMaterial({ color: '#ffffff', map: tex, gloss: 0.1 });
      mat.dispose();
      old?.dispose();
      f.visible = true;
    });
  }

  private setSign(owner: string): void {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = '#f6f0e4';
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = '#2b2622';
    g.lineWidth = 8;
    g.strokeRect(4, 4, 504, 120);
    g.fillStyle = '#2b2622';
    g.font = '600 56px "Patrick Hand", "Noto Sans", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(owner.slice(0, 22), 256, 68, 480);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const old = this.sign.material as PaintMaterial;
    (old.uniforms.uPaintMap.value as THREE.Texture | null)?.dispose();
    old.dispose();
    this.sign.material = new PaintMaterial({ color: '#ffffff', map: tex, gloss: 0.05 });
  }
}

/** The shell, furniture, keepsakes and trophy shelf as one geometry. */
export function buildHome(look: HomeLook): THREE.BufferGeometry {
  const k = new ModelKit();
  const trim = '#2b2622';
  // Floor, walls (back and sides; the front is open) and a gable roof.
  k.box(W + 0.6, 0.3, D + 0.6, '#b58a5c', { position: [0, 0.15, 0], pattern: Pattern.Planks });
  k.box(W, H, 0.4, look.walls, { position: [0, H / 2, -D / 2], pattern: Pattern.Brick });
  for (const s of [-1, 1]) {
    k.box(0.4, H, D, look.walls, { position: [s * (W / 2), H / 2, 0], pattern: Pattern.Brick });
    k.box(0.5, H + 0.2, 0.5, trim, { position: [s * (W / 2), H / 2, D / 2] });
    // Roof slopes.
    k.box(W / 2 + 1.2, 0.35, D + 1.6, look.roof, { position: [s * (W / 4), H + 1.4, 0], rotation: [0, 0, -s * 0.36], pattern: Pattern.RoofTiles });
  }
  k.box(W + 0.4, 0.5, 0.5, trim, { position: [0, H, D / 2] });
  // Gable ends.
  for (const z of [-D / 2, D / 2 - 0.1]) k.box(W * 0.62, 1.8, 0.3, look.walls, { position: [0, H + 0.9, z], scale: [1, 1, 1] });
  // A rug, the sofa and a tea table (see Leisure.ts for what you can do here).
  k.box(7, 0.05, 4.4, '#b0352a', { position: [-2.2, 0.33, -2.2], pattern: Pattern.Matte });
  k.box(6.2, 0.05, 3.6, '#e3c07a', { position: [-2.2, 0.34, -2.2], pattern: Pattern.Matte });
  k.box(4.2, 0.9, 1.3, '#3e6fa8', { position: [-2.5, 0.75, -D / 2 + 1.3], pattern: Pattern.Matte });
  k.box(4.2, 1.1, 0.4, '#3e6fa8', { position: [-2.5, 1.3, -D / 2 + 0.75], pattern: Pattern.Matte });
  for (const sx of [-1, 1]) k.box(0.4, 1.2, 1.3, '#335c8c', { position: [-2.5 + sx * 2.2, 0.9, -D / 2 + 1.3], pattern: Pattern.Matte });
  // Tea table: a teapot and two cups.
  k.cylinder(0.9, 0.9, 0.08, 16, '#7a5a3a', { position: [-2.5, 0.95, -1.6], pattern: Pattern.Planks });
  k.cylinder(0.1, 0.12, 0.6, 6, '#7a5a3a', { position: [-2.5, 0.62, -1.6] });
  k.blob(0.22, '#f6f0e4', { position: [-2.4, 1.18, -1.7], scale: [1, 0.85, 1], detail: 1 });
  k.box(0.18, 0.06, 0.06, '#f6f0e4', { position: [-2.12, 1.2, -1.7], rotation: [0, 0, 0.5] });
  for (const cx of [-2.95, -2.2]) k.cylinder(0.08, 0.06, 0.12, 8, '#8fd0c8', { position: [cx, 1.05, -1.25] });
  // A little kitchen: a stove with a pan and a pot against the right-hand wall.
  k.box(0.9, 1.0, 1.7, '#d9d0c0', { position: [7.4, 0.8, -0.9] });
  k.box(0.95, 0.06, 1.75, '#3a3530', { position: [7.4, 1.33, -0.9] });
  k.cylinder(0.26, 0.24, 0.08, 12, '#2b2622', { position: [7.35, 1.4, -1.35] });
  k.cylinder(0.2, 0.22, 0.3, 12, '#b8b8c0', { position: [7.35, 1.5, -0.45] });
  // The bed, with a lamp beside it.
  k.box(2.6, 0.55, 3.9, '#7a5a3a', { position: [4.6, 0.45, -D / 2 + 2.15], pattern: Pattern.Planks });
  k.box(2.4, 0.3, 3.7, '#f6f0e4', { position: [4.6, 0.85, -D / 2 + 2.15] });
  k.box(2.45, 0.12, 2.4, '#e9b8c8', { position: [4.6, 1.02, -D / 2 + 2.9], pattern: Pattern.Matte });
  k.box(1.6, 0.25, 0.7, '#fbf6ea', { position: [4.6, 1.1, -D / 2 + 0.75] });
  k.box(2.6, 1.4, 0.2, '#7a5a3a', { position: [4.6, 1.2, -D / 2 + 0.3] });
  k.cylinder(0.12, 0.2, 2.4, 6, trim, { position: [W / 2 - 1.0, 1.5, -D / 2 + 1.0] });
  k.cylinder(0.35, 0.6, 0.7, 8, '#f4d23b', { position: [W / 2 - 1.0, 2.9, -D / 2 + 1.0], nightGlow: 1 });
  // A basket for your pet, beside the sofa.
  k.cylinder(0.75, 0.6, 0.35, 12, '#c8955a', { position: [1.1, 0.5, -D / 2 + 1.3], pattern: Pattern.Planks });
  k.cylinder(0.6, 0.6, 0.1, 12, '#e8559a', { position: [1.1, 0.62, -D / 2 + 1.3] });
  // Plants by the right wall: they grow as you water them, and bloom.
  const grow = Math.min(3, Math.max(0, look.plants ?? 0));
  for (const [i, pz] of [0.1, 1.2, 2.3].entries()) {
    k.cylinder(0.35, 0.26, 0.55, 10, '#c8633a', { position: [W / 2 - 0.9, 0.55, pz] });
    const h = 0.3 + grow * 0.35 + i * 0.08;
    k.cylinder(0.04, 0.05, h, 5, '#4f8a3a', { position: [W / 2 - 0.9, 0.8 + h / 2, pz] });
    k.blob(0.18 + grow * 0.1, '#6fae4a', { position: [W / 2 - 0.9, 0.85 + h, pz], scale: [1, 0.8, 1], detail: 0 });
    if (grow >= 3) for (let f = 0; f < 3; f++) k.blob(0.1, ['#e8559a', '#f4d23b', '#f6f0e4'][(i + f) % 3], { position: [W / 2 - 0.9 + Math.cos(f * 2.1) * 0.25, 0.95 + h + 0.12, pz + Math.sin(f * 2.1) * 0.25], detail: 0 });
  }
  // The record player on a cabinet, with a stack of records.
  k.box(1.4, 1.0, 0.9, '#7a5a3a', { position: [W / 2 - 1.1, 0.8, 4.2], pattern: Pattern.Planks });
  k.box(1.2, 0.12, 0.8, '#2b2622', { position: [W / 2 - 1.1, 1.36, 4.2] });
  k.cylinder(0.32, 0.32, 0.03, 20, '#1d1a18', { position: [W / 2 - 1.2, 1.44, 4.2] });
  k.cylinder(0.08, 0.08, 0.035, 10, '#d8463a', { position: [W / 2 - 1.2, 1.46, 4.2] });
  k.box(0.04, 0.04, 0.36, '#c9c9d6', { position: [W / 2 - 0.72, 1.5, 4.1], rotation: [0, 0.4, 0] });
  for (let r = 0; r < 4; r++) k.box(0.7, 0.7, 0.04, ['#e8559a', '#4a90c9', '#f4d23b', '#8cc63f'][r], { position: [W / 2 - 1.1, 0.7 - r * 0.02, 4.68 + r * 0.05] });
  // Picture rail: frames for the postcards (the pictures themselves are separate).
  for (let i = 0; i < 6; i++) {
    const p = frameSpot(i);
    k.box(2.9, 1.9, 0.12, '#7a5a3a', { position: [p.x, p.y, p.z - 0.1] });
  }
  // Trophy shelf on the left wall with a cup per few trophies.
  const cups = trophyCups(look.trophies);
  for (const y of [1.4, 2.6]) k.box(0.7, 0.12, D - 2, '#7a5a3a', { position: [-W / 2 + 0.6, y, 0], pattern: Pattern.Planks });
  for (let i = 0; i < cups; i++) {
    const y = i < 6 ? 1.46 : 2.66;
    const z = -D / 2 + 1.6 + (i % 6) * 1.5;
    k.cylinder(0.14, 0.2, 0.12, 8, '#d4a93a', { position: [-W / 2 + 0.6, y + 0.06, z] });
    k.cylinder(0.06, 0.06, 0.25, 6, '#d4a93a', { position: [-W / 2 + 0.6, y + 0.24, z] });
    k.cylinder(0.3, 0.12, 0.4, 8, i % 3 === 0 ? '#f4d23b' : i % 3 === 1 ? '#c9c9d6' : '#d98a5f', { position: [-W / 2 + 0.6, y + 0.56, z] });
  }
  // A red post box by the gate.
  k.cylinder(0.45, 0.45, 1.5, 10, '#d8463a', { position: [-W / 2 - 1.5, 0.75, D / 2 + 2] });
  k.cylinder(0.5, 0.5, 0.3, 10, trim, { position: [-W / 2 - 1.5, 1.6, D / 2 + 2] });
  k.box(0.6, 0.1, 0.1, trim, { position: [-W / 2 - 1.5, 1.2, D / 2 + 2.46] });
  // Your Vesak lanterns, hanging from the front beam (they glow at night).
  (look.lanterns ?? []).slice(0, 3).forEach((l, n) => {
    const lx = (n - 1) * 5;
    const ly = H - 1.6;
    const lz = D / 2 + 0.2;
    k.cylinder(0.02, 0.02, 1.1, 4, trim, { position: [lx, H - 0.55, lz] });
    const star = l.frame === 'star';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = star && i % 2 ? 0.75 : 0.55;
      k.box(0.44, l.frame === 'box' ? 0.9 : 0.8, 0.06, l.panels[i], { position: [lx + Math.sin(a) * r, ly, lz + Math.cos(a) * r], rotation: [0, a, 0], nightGlow: 1 });
    }
    k.box(0.9, 0.08, 0.9, trim, { position: [lx, ly + 0.45, lz] });
    k.box(0.9, 0.08, 0.9, trim, { position: [lx, ly - 0.45, lz] });
    for (let t = -1; t <= 1; t++) k.box(0.05, 0.7, 0.05, l.tassel, { position: [lx + t * 0.25, ly - 0.85, lz] });
  });
  const geo = k.build(0.02);
  // Keepsakes from the pockets you found, small, on the floor.
  const parts = [geo];
  look.keepsakes.slice(0, SLOTS.length).forEach((kind, i) => {
    const [x, z] = SLOTS[i];
    const g = buildPocket(kind).clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.32, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.7), new THREE.Vector3(0.62, 0.62, 0.62)));
    parts.push(g);
  });
  return parts.length === 1 ? geo : mergeAll(parts);
}

/** Merge ModelKit geometries (same attributes). */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(flat[0].attributes)) {
    if (!flat.every((p) => p.getAttribute(name))) continue;
    const size = flat[0].getAttribute(name).itemSize;
    const total = flat.reduce((n, p) => n + p.getAttribute(name).count, 0);
    const arr = new Float32Array(total * size);
    let o = 0;
    for (const p of flat) {
      const a = p.getAttribute(name) as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) for (let c = 0; c < size; c++) arr[o++] = a.getComponent(i, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

/** A little model of a souvenir standing on a shelf at (x, y, z) in house coordinates. */
export function souvenirModel(k: ModelKit, id: string, x: number, y: number, z: number): void {
  switch (id) {
    case 'mask':
      // An Ambalangoda mask: a red face with bulging eyes and a crown of cobras.
      k.box(0.06, 0.42, 0.34, '#d8463a', { position: [x, y + 0.24, z] });
      for (const dz of [-0.08, 0.08]) k.blob(0.05, '#f4d23b', { position: [x + 0.04, y + 0.3, z + dz], detail: 0 });
      for (let i = 0; i < 5; i++) k.cylinder(0.02, 0.03, 0.14, 4, '#2d8a5a', { position: [x, y + 0.5, z - 0.14 + i * 0.07] });
      break;
    case 'kokeshi':
      k.cylinder(0.07, 0.09, 0.3, 10, '#e0432f', { position: [x, y + 0.15, z] });
      k.blob(0.08, '#f6e0c8', { position: [x, y + 0.36, z], detail: 1 });
      k.blob(0.082, '#2b2622', { position: [x - 0.01, y + 0.39, z], scale: [1, 0.6, 1], detail: 0 });
      break;
    case 'diya':
      k.cylinder(0.12, 0.07, 0.07, 10, '#c9a040', { position: [x, y + 0.04, z] });
      k.blob(0.04, '#f4a13b', { position: [x, y + 0.12, z], scale: [0.7, 1.4, 0.7], detail: 0, nightGlow: 1 });
      break;
    case 'lantern':
      k.blob(0.14, '#d8263a', { position: [x, y + 0.22, z], scale: [1, 0.85, 1], detail: 1, nightGlow: 0.6 });
      k.cylinder(0.07, 0.07, 0.04, 8, '#f4d23b', { position: [x, y + 0.36, z] });
      k.cylinder(0.07, 0.07, 0.04, 8, '#f4d23b', { position: [x, y + 0.08, z] });
      break;
    case 'fan':
      k.box(0.03, 0.26, 0.38, '#f7b8cf', { position: [x, y + 0.2, z], rotation: [0.2, 0, 0] });
      k.box(0.035, 0.12, 0.03, '#7a4a2a', { position: [x, y + 0.05, z] });
      break;
    case 'cuckoo':
      k.box(0.14, 0.34, 0.3, '#7a4a2a', { position: [x, y + 0.17, z], pattern: Pattern.Planks });
      k.box(0.2, 0.05, 0.4, '#5a3a24', { position: [x, y + 0.36, z], rotation: [0.5, 0, 0] });
      k.cylinder(0.08, 0.08, 0.02, 12, '#f6f0e4', { position: [x + 0.08, y + 0.2, z], rotation: [0, 0, Math.PI / 2] });
      break;
    case 'phonebox':
      k.box(0.14, 0.4, 0.14, '#d8263a', { position: [x, y + 0.2, z] });
      k.box(0.16, 0.04, 0.16, '#d8263a', { position: [x, y + 0.42, z] });
      break;
    case 'syrup':
      k.cylinder(0.07, 0.08, 0.22, 10, '#b86b3a', { position: [x, y + 0.11, z] });
      k.cylinder(0.03, 0.03, 0.06, 6, '#f6f0e4', { position: [x, y + 0.25, z] });
      k.box(0.02, 0.08, 0.08, '#d8263a', { position: [x + 0.075, y + 0.11, z] });
      break;
    case 'boomerang':
      k.box(0.04, 0.05, 0.3, '#c8843a', { position: [x, y + 0.03, z - 0.08], rotation: [0, 0.5, 0] });
      k.box(0.04, 0.05, 0.3, '#c8843a', { position: [x, y + 0.03, z + 0.08], rotation: [0, -0.5, 0] });
      break;
  }
}
