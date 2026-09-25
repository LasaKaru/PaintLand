import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { Random } from '../core/Random';

const INK = '#2b2622';

/** Small street furniture that makes a street feel lived in (docs/04 §8). All face +Z, base at origin. */

export function buildBin(): THREE.BufferGeometry {
  return new ModelKit()
    .cylinder(0.32, 0.27, 0.9, 10, '#3e8f6a', { position: [0, 0.45, 0], pattern: Pattern.Planks })
    .cylinder(0.35, 0.35, 0.08, 10, INK, { position: [0, 0.92, 0] })
    .build(0.01, 2);
}

export function buildBicycle(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const z of [-0.55, 0.55]) k.add(new THREE.TorusGeometry(0.33, 0.035, 5, 14), INK, { position: [0, 0.35, z], rotation: [0, Math.PI / 2, 0] });
  k.box(0.05, 0.05, 0.9, colour, { position: [0, 0.62, 0], rotation: [0.15, 0, 0] });
  k.box(0.05, 0.5, 0.05, colour, { position: [0, 0.5, 0.2], rotation: [0.3, 0, 0] });
  k.box(0.05, 0.45, 0.05, colour, { position: [0, 0.55, -0.45], rotation: [-0.3, 0, 0] });
  k.box(0.14, 0.05, 0.25, INK, { position: [0, 0.82, 0.25] });
  k.box(0.5, 0.04, 0.04, INK, { position: [0, 0.85, -0.52] });
  k.box(0.3, 0.2, 0.3, '#c8955a', { position: [0, 0.7, -0.72], pattern: Pattern.Planks });
  return k.build(0.005, 3);
}

/** Leaning parked scooter with a front basket. */
export function buildScooter(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const z of [-0.6, 0.6]) k.cylinder(0.24, 0.24, 0.12, 12, INK, { position: [0, 0.24, z], rotation: [0, 0, Math.PI / 2] });
  k.box(0.4, 0.35, 1.0, colour, { position: [0, 0.5, 0.15] });
  k.box(0.35, 0.18, 0.5, INK, { position: [0, 0.78, 0.35] });
  k.box(0.3, 0.9, 0.25, colour, { position: [0, 0.75, -0.55], rotation: [-0.2, 0, 0] });
  k.box(0.6, 0.05, 0.05, INK, { position: [0, 1.22, -0.62] });
  k.box(0.14, 0.12, 0.08, '#fff2b8', { position: [0, 1.05, -0.72], nightGlow: 1 });
  return k.build(0.005, 5);
}

export function buildPlanter(rnd: Random, length = 2.4): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(length, 0.55, 0.7, '#c8643a', { position: [0, 0.28, 0], pattern: Pattern.Brick });
  k.box(length + 0.1, 0.08, 0.8, '#e0864e', { position: [0, 0.58, 0] });
  const n = Math.round(length / 0.45);
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + (length / n) * (i + 0.5);
    k.blob(rnd.range(0.25, 0.38), rnd.pick(['#e8559a', '#f4d23b', '#f08a2e', '#8cc63f', '#d8463a', '#f6f0e4']), { position: [x, 0.78, rnd.jitter(0.15)], detail: 0, roughness: 0.25, seed: i + length, pattern: Pattern.Leaves });
  }
  return k.build(0.02, rnd.int(0, 99));
}

/** A string of paper bunting between two points (local X from -half to +half) at height h. */
export function buildBuntingLine(rnd: Random, half: number, h: number, sag = 1.2): THREE.BufferGeometry {
  const k = new ModelKit();
  const flags = ['#d8463a', '#f4d23b', '#3e6fa8', '#4f9a5a', '#e8559a', '#f6f0e4'];
  const pts = Array.from({ length: 14 }, (_, i) => {
    const t = i / 13;
    return new THREE.Vector3(-half + t * half * 2, h - Math.sin(t * Math.PI) * sag, 0);
  });
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4), INK);
  const n = Math.round(half * 2.4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const s = new THREE.Shape();
    s.moveTo(-0.24, 0);
    s.lineTo(0.24, 0);
    s.lineTo(0, -0.5);
    s.closePath();
    k.add(new THREE.ShapeGeometry(s), rnd.pick(flags), { position: [-half + t * half * 2, h - Math.sin(t * Math.PI) * sag, 0], rotation: [0, 0, rnd.jitter(0.12)] });
  }
  return k.build(0.01, rnd.int(0, 99));
}

/** Round paper lantern (glows at night). */
export function buildLantern(colour: string): THREE.BufferGeometry {
  return new ModelKit()
    .box(0.02, 0.6, 0.02, INK, { position: [0, 0.3, 0] })
    .blob(0.32, colour, { position: [0, -0.2, 0], scale: [1, 1.2, 1], detail: 1, roughness: 0.02, nightGlow: 1 })
    .cylinder(0.14, 0.14, 0.08, 8, INK, { position: [0, 0.18, 0] })
    .build(0, 1);
}

/** A-frame chalk sign board. */
export function buildSignBoard(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  for (const r of [0.22, -0.22]) k.box(0.7, 1.0, 0.05, INK, { position: [0, 0.48, r * 0.6], rotation: [r, 0, 0] });
  k.box(0.6, 0.12, 0.06, rnd.pick(['#f4d23b', '#e8559a', '#f6f0e4']), { position: [0, 0.75, 0.16], rotation: [0.22, 0, 0] });
  k.box(0.5, 0.05, 0.06, '#f6f0e4', { position: [0, 0.5, 0.2], rotation: [0.22, 0, 0] });
  return k.build(0.01, rnd.int(0, 99));
}

/** Stone fountain with water. */
export function buildFountain(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(2.2, 2.3, 0.6, 16, '#e9dcc4', { position: [0, 0.3, 0], pattern: Pattern.Stone });
  k.cylinder(2.0, 2.0, 0.1, 16, '#6fd0d0', { position: [0, 0.56, 0] });
  k.cylinder(0.3, 0.45, 1.4, 10, '#e9dcc4', { position: [0, 1.2, 0], pattern: Pattern.Stone });
  k.cylinder(0.9, 0.5, 0.3, 12, '#e9dcc4', { position: [0, 1.9, 0] });
  k.blob(0.35, '#bff0ee', { position: [0, 2.3, 0], scale: [1, 1.6, 1], detail: 1 });
  return k.build(0.02, 9);
}

/** Café table with two chairs and an umbrella. */
export function buildCafeTable(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(0.5, 0.5, 0.05, 12, '#f6f0e4', { position: [0, 0.75, 0] });
  k.cylinder(0.05, 0.05, 0.75, 6, INK, { position: [0, 0.37, 0] });
  for (const x of [-0.75, 0.75]) {
    k.box(0.42, 0.05, 0.42, INK, { position: [x, 0.45, 0] });
    k.box(0.42, 0.45, 0.05, INK, { position: [x, 0.7, x > 0 ? 0.2 : -0.2] });
    for (const dx of [-0.18, 0.18]) k.box(0.04, 0.45, 0.04, INK, { position: [x + dx, 0.22, 0] });
  }
  k.cylinder(0.03, 0.03, 2.2, 5, INK, { position: [0, 1.1, 0] });
  const c = rnd.pick(['#d8463a', '#2f8f86', '#f4d23b', '#3e6fa8']);
  k.cylinder(0.05, 1.3, 0.5, 8, c, { position: [0, 2.3, 0] });
  k.cylinder(1.3, 1.3, 0.06, 8, '#f6f0e4', { position: [0, 2.05, 0] });
  k.blob(0.1, '#f08a2e', { position: [0.1, 0.82, 0], detail: 0 });
  return k.build(0.01, rnd.int(0, 99));
}

/** Cat sitting (grey, black, ginger or white). */
export function buildCat(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.blob(0.2, colour, { position: [0, 0.2, 0], scale: [0.8, 1, 1.1], detail: 1, roughness: 0.05 });
  k.blob(0.14, colour, { position: [0, 0.45, -0.1], detail: 1, roughness: 0.04 });
  for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.05, 0.1, 4), colour, { position: [s * 0.07, 0.58, -0.1] });
  k.add(new THREE.TorusGeometry(0.16, 0.03, 4, 8, Math.PI), colour, { position: [0.1, 0.12, 0.18], rotation: [0, Math.PI / 2, 0] });
  for (const s of [-1, 1]) k.blob(0.02, '#2b2622', { position: [s * 0.05, 0.48, -0.22], detail: 0 });
  return k.build(0.004, 7);
}
