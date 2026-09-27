import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import { buildPocket, type PocketKind } from './Pockets';
import { trophyCups } from '../gameplay/Home';

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
  [-5, -2.6], [-2.2, -2.6], [0.6, -2.6], [3.4, -2.6], [6, -2.6],
  [-5, 1.4], [-2.2, 1.4], [3.4, 1.4], [6, 1.4], [0.6, 3.6],
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
  // A rug, a sofa, a lamp and a little table.
  k.box(7, 0.05, 4.4, '#b0352a', { position: [0.6, 0.33, 0.2], pattern: Pattern.Matte });
  k.box(6.2, 0.05, 3.6, '#e3c07a', { position: [0.6, 0.34, 0.2], pattern: Pattern.Matte });
  k.box(4.2, 0.9, 1.3, '#3e6fa8', { position: [0.6, 0.75, -D / 2 + 1.3], pattern: Pattern.Matte });
  k.box(4.2, 1.1, 0.4, '#3e6fa8', { position: [0.6, 1.3, -D / 2 + 0.75], pattern: Pattern.Matte });
  k.cylinder(0.12, 0.2, 2.4, 6, trim, { position: [W / 2 - 1.2, 1.5, -D / 2 + 1.2] });
  k.cylinder(0.35, 0.6, 0.7, 8, '#f4d23b', { position: [W / 2 - 1.2, 2.9, -D / 2 + 1.2], nightGlow: 1 });
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
