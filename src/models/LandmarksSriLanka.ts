import * as THREE from 'three';
import { ModelKit, Pattern } from './ModelKit';
import { Random } from '../core/Random';

const INK = '#2b2622';

/**
 * Sri Lankan landmarks and props for Chapter 2 · Serendib (docs/04 §3).
 * Stylised, painted versions — recognisable silhouettes, not replicas.
 */

/** A wall panel with one or more round-topped arch openings, extruded along Z. Bottom at y = 0. */
export function archWall(width: number, height: number, depth: number, arches: number, archW: number, archH: number, sill = 0): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const span = width / arches;
  for (let i = 0; i < arches; i++) {
    const cx = -width / 2 + span * (i + 0.5);
    const hole = new THREE.Path();
    const r = archW / 2;
    const top = Math.min(archH, height - 0.3) - r;
    hole.moveTo(cx - r, sill);
    hole.lineTo(cx - r, top);
    hole.absarc(cx, top, r, Math.PI, 0, true);
    hole.lineTo(cx + r, sill);
    hole.closePath();
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Colombo's Lotus Tower: a slender purple shaft crowned by a lotus bud. ~170 m. */
export function buildLotusTower(): THREE.BufferGeometry {
  const k = new ModelKit();
  // Podium: stepped platform shaped like lotus leaves.
  for (let i = 0; i < 4; i++) k.cylinder(34 - i * 6, 36 - i * 6, 3, 16, i % 2 ? '#8cc63f' : '#e9dcc4', { position: [0, 1.5 + i * 3, 0], pattern: i % 2 ? Pattern.Grass : Pattern.Stone });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.blob(8, '#6fae3a', { position: [Math.cos(a) * 28, 3, Math.sin(a) * 28], scale: [1.3, 0.25, 0.8], rotation: [0, -a, 0], detail: 1, roughness: 0.1, pattern: Pattern.Leaves });
  }
  // Shaft with vertical ribs and light bands.
  k.cylinder(3.6, 5.2, 120, 12, '#8e52a8', { position: [0, 72, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box(0.5, 118, 0.8, '#b06ac8', { position: [Math.cos(a) * 4.6, 72, Math.sin(a) * 4.6], rotation: [0, -a, 0] });
  }
  for (let y = 24; y < 130; y += 18) k.cylinder(5.2, 5.2, 0.6, 12, '#f4d6ff', { position: [0, y, 0], nightGlow: 1 });
  // Lotus bud: outer and inner petals.
  const budY = 140;
  k.cylinder(6, 4, 8, 12, '#6fae3a', { position: [0, budY - 10, 0] });
  for (let ring = 0; ring < 2; ring++) {
    const n = ring ? 6 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.4;
      const r = ring ? 5 : 8;
      k.blob(1, ring ? '#e070b0' : '#d65fa0', {
        position: [Math.cos(a) * r, budY + (ring ? 6 : 2), Math.sin(a) * r],
        scale: [4.5, 16, 2.2],
        rotation: [0, -a + Math.PI / 2, (ring ? -0.18 : -0.35)],
        detail: 1,
        roughness: 0.04,
        nightGlow: ring ? 1 : 0,
      });
    }
  }
  k.blob(6, '#f0a0d0', { position: [0, budY + 12, 0], scale: [1, 2.2, 1], detail: 1, roughness: 0.03 });
  k.cylinder(0.3, 1.2, 20, 6, '#f6f0e4', { position: [0, budY + 34, 0] });
  k.blob(0.9, '#ff6a6a', { position: [0, budY + 45, 0], detail: 0, nightGlow: 1 });
  return k.build(0.15, 11);
}

/** Sigiriya: a sheer rock with lion paws at the stair, a summit palace and frescoes. ~95 m. */
export function buildSigiriya(rnd: Random, height = 92, radius = 34): THREE.BufferGeometry {
  const k = new ModelKit();
  // Rock body: a slightly squashed, flat-topped column.
  // A steep inselberg: bulging, fluted sides that lean out near the top, a rounded crown.
  const rock = new THREE.CylinderGeometry(radius * 0.9, radius, height, 24, 10);
  const pos = rock.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x);
    const t = v.y / height + 0.5;
    const flute = Math.sin(a * 11 + t * 3) * 0.035 + Math.sin(a * 4 + t * 2) * 0.08;
    const lean = 1 + Math.sin(t * Math.PI) * 0.1 + (t > 0.8 ? (t - 0.8) * 0.4 : 0);
    const k2 = (1 + flute) * lean;
    pos.setXYZ(i, v.x * k2 * 1.15, v.y, v.z * k2 * 0.9);
  }
  k.add(rock, '#c4724a', { position: [0, height / 2, 0], pattern: Pattern.Sandstone });
  k.blob(radius * 0.95, '#c4724a', { position: [0, height, 0], scale: [1.2, 0.2, 0.95], detail: 2, roughness: 0.05, pattern: Pattern.Sandstone });
  // Moss and shrubs clinging to ledges.
  for (let i = 0; i < 16; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const y = rnd.range(height * 0.15, height * 0.9);
    k.blob(rnd.range(1.5, 3.5), rnd.pick(['#4f9a4a', '#6fae3a']), { position: [Math.cos(a) * radius * 1.12, y, Math.sin(a) * radius * 0.92], scale: [1.4, 0.6, 1.4], detail: 0, seed: i, pattern: Pattern.Leaves });
  }
  // Summit: grass, brick palace foundations and a pool.
  k.cylinder(radius * 0.92, radius * 0.95, 1.2, 18, '#8cc63f', { position: [0, height + 5.2, 0], scale: [1.15, 1, 0.9], pattern: Pattern.Grass });
  for (let i = 0; i < 14; i++) {
    const x = rnd.range(-radius * 0.7, radius * 0.7);
    const z = rnd.range(-radius * 0.5, radius * 0.5);
    k.box(rnd.range(4, 10), rnd.range(0.8, 2.2), 0.8, '#a0523a', { position: [x, height + 6.3, z], rotation: [0, rnd.pick([0, Math.PI / 2]), 0], pattern: Pattern.Brick });
  }
  k.box(12, 0.3, 7, '#6fd0d0', { position: [radius * 0.3, height + 5.9, -radius * 0.2] });
  // Fresco pocket high on the west face: a shallow cave with the painted maidens.
  const fa = -0.35;
  k.box(14, 7, 3, '#8a4a32', { position: [Math.cos(fa) * radius * 1.05, height * 0.55, Math.sin(fa) * radius * 0.86], rotation: [0, -fa + Math.PI / 2, 0] });
  const frescoes = ['#e0864e', '#f4d23b', '#6fae3a'];
  for (let i = 0; i < 5; i++) {
    k.box(1.6, 3.2, 0.3, frescoes[i % 3], { position: [Math.cos(fa) * radius * 1.07 + Math.sin(fa) * (i - 2) * 2.4, height * 0.55, Math.sin(fa) * radius * 0.88 - Math.cos(fa) * (i - 2) * 2.4 * 0.8], rotation: [0, -fa + Math.PI / 2, 0] });
  }
  // Lion staircase: a brick platform, stairs and two giant paws.
  const pz = radius * 0.95;
  k.box(34, 6, 22, '#b86a48', { position: [0, 3, pz + 6], pattern: Pattern.Brick });
  for (let i = 0; i < 10; i++) k.box(8, 0.6, 1.4, '#d8c8a8', { position: [0, 6 + i * 0.6, pz + 14 - i * 1.4], pattern: Pattern.Stone });
  for (const s of [-1, 1]) {
    k.blob(6, '#d0a070', { position: [s * 9, 9, pz + 10], scale: [1, 0.8, 1.5], detail: 1, roughness: 0.12, pattern: Pattern.Stone });
    for (let c = 0; c < 3; c++) k.add(new THREE.ConeGeometry(1.1, 3.4, 5), '#f6f0e4', { position: [s * 9 + (c - 1) * 2.4, 7, pz + 18.5], rotation: [Math.PI / 2 + 0.3, 0, 0] });
  }
  // Water gardens and jungle around the base.
  for (let i = 0; i < 4; i++) k.box(10, 0.4, 18, '#6fd0d0', { position: [(i - 1.5) * 13, 0.3, pz + 40] });
  for (let i = 0; i < 28; i++) {
    const a = rnd.range(0, Math.PI * 2);
    const r = radius * rnd.range(1.35, 2.2);
    k.blob(rnd.range(4, 8), rnd.pick(['#4f9a4a', '#5aa84a', '#3f8f45', '#6fae3a']), { position: [Math.cos(a) * r, 3, Math.sin(a) * r], detail: 1, roughness: 0.3, seed: i, pattern: Pattern.Leaves });
  }
  return k.build(0.2, 23);
}

/** Nine Arch Bridge: nine round arches of dark stone. Spans X from -length/2 to +length/2; deck top at `height`. */
export function buildNineArchBridge(length: number, height: number, deckWidth: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const span = length / 9;
  k.add(archWall(length, height, deckWidth, 9, span * 0.62, height * 0.72), '#8e7e70', { pattern: Pattern.Stone });
  // Pier buttresses.
  for (let i = 0; i <= 9; i++) {
    const x = -length / 2 + i * span;
    k.box(span * 0.36, height * 0.8, deckWidth + 2, '#7e6e62', { position: [x, height * 0.4, 0], pattern: Pattern.Stone });
  }
  // Parapets.
  for (const z of [-deckWidth / 2, deckWidth / 2]) k.box(length, 1.1, 0.5, '#9a8a7c', { position: [0, height + 0.55, z], pattern: Pattern.Stone });
  return k.build(0.05, 31);
}

/** Sri Lankan train: a red locomotive and blue carriages with a cream stripe. Faces -Z; length ≈ 5 × 14 m. */
export function buildTrain(cars = 4): { geometry: THREE.BufferGeometry; length: number } {
  const k = new ModelKit();
  const carLen = 13;
  for (let c = 0; c <= cars; c++) {
    const z = c * (carLen + 1);
    const loco = c === 0;
    const body = loco ? '#9a2a2a' : '#2f5aa8';
    k.box(3, 3.2, carLen, body, { position: [0, 2.4, z] });
    k.box(3.06, 0.35, carLen, '#f1e4c0', { position: [0, 2.9, z] });
    k.box(3.2, 0.3, carLen + 0.2, '#6a6a78', { position: [0, 4.1, z] });
    k.box(2.6, 0.7, carLen - 1, INK, { position: [0, 0.6, z] });
    for (const zz of [z - carLen * 0.35, z + carLen * 0.35]) for (const x of [-1.3, 1.3]) k.cylinder(0.45, 0.45, 0.3, 10, INK, { position: [x, 0.45, zz], rotation: [0, 0, Math.PI / 2] });
    if (loco) {
      k.box(2.6, 1.2, 0.3, '#3f4f78', { position: [0, 3, z - carLen / 2 - 0.1], nightGlow: 1 });
      k.cylinder(0.35, 0.35, 0.2, 10, '#fff2b8', { position: [0, 1.6, z - carLen / 2 - 0.1], rotation: [Math.PI / 2, 0, 0], nightGlow: 1 });
      k.box(2.2, 0.25, 1, '#f4d23b', { position: [0, 1.2, z - carLen / 2 + 0.3] });
    } else {
      for (let w = 0; w < 5; w++) for (const x of [-1.52, 1.52]) k.box(0.05, 0.9, 1.4, '#3f4f78', { position: [x, 3.2, z - carLen / 2 + 1.8 + w * 2.4], nightGlow: w % 2 });
    }
  }
  const g = k.build(0.02, 3);
  g.translate(0, 0, -((cars + 1) * (carLen + 1)) / 2 + carLen / 2);
  return { geometry: g, length: (cars + 1) * (carLen + 1) };
}

/** Three-wheeler tuk-tuk (a parked prop; the drivable one is in Vehicles). */
export function buildTukTukProp(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(1.4, 1.0, 2.2, colour, { position: [0, 0.9, 0.2] });
  k.box(1.45, 0.12, 2.5, INK, { position: [0, 1.95, 0.1] });
  k.box(1.3, 0.9, 0.08, '#3f4f78', { position: [0, 1.5, -0.8], rotation: [-0.25, 0, 0] });
  k.cylinder(0.3, 0.3, 0.2, 10, INK, { position: [0, 0.3, -1.1], rotation: [0, 0, Math.PI / 2] });
  for (const x of [-0.7, 0.7]) k.cylinder(0.3, 0.3, 0.2, 10, INK, { position: [x, 0.3, 0.9], rotation: [0, 0, Math.PI / 2] });
  for (const x of [-0.68, 0.68]) k.box(0.06, 0.9, 0.06, INK, { position: [x, 1.5, 1.2] });
  k.box(1.2, 0.15, 0.1, '#f4d23b', { position: [0, 0.65, -0.95] });
  return k.build(0.01, 4);
}

/** White dagoba (stupa) with a spire. ~40 m. */
export function buildStupa(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(26, 27, 3, 20, '#e9dcc4', { position: [0, 1.5, 0], pattern: Pattern.Stone });
  for (let i = 0; i < 3; i++) k.cylinder(21 - i * 1.2, 21.5 - i * 1.2, 1.4, 20, '#f6f2ea', { position: [0, 3.7 + i * 1.4, 0] });
  k.add(new THREE.SphereGeometry(19, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#fbf8f0', { position: [0, 7.6, 0], scale: [1, 0.95, 1] });
  k.box(7, 4, 7, '#f6f2ea', { position: [0, 27.5, 0] });
  k.cylinder(0.5, 3, 16, 10, '#e8c872', { position: [0, 37, 0] });
  k.blob(1, '#f4d23b', { position: [0, 45.5, 0], detail: 1, nightGlow: 1 });
  return k.build(0.05, 41);
}

/** Sri Lankan elephant (for the jungle and the tea hills). ~3 m tall. Faces -Z. */
export function buildElephant(): THREE.BufferGeometry {
  const k = new ModelKit();
  const skin = '#8a8494';
  k.blob(1.6, skin, { position: [0, 2.2, 0.2], scale: [1, 0.95, 1.4], detail: 1, roughness: 0.05 });
  k.blob(1.0, skin, { position: [0, 2.7, -1.9], detail: 1, roughness: 0.05 });
  for (const s of [-1, 1]) k.blob(0.9, '#9a94a4', { position: [s * 0.95, 2.7, -1.6], scale: [0.25, 1, 0.9], detail: 1, roughness: 0.05 });
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.4, -2.7), new THREE.Vector3(0, 1.6, -3.1), new THREE.Vector3(0, 0.8, -3.0), new THREE.Vector3(0, 0.4, -2.7)]);
  k.add(new THREE.TubeGeometry(trunk, 10, 0.26, 6), skin);
  for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.12, 0.8, 5), '#f6f0e4', { position: [s * 0.4, 2.0, -2.7], rotation: [-1.2, 0, 0] });
  for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 1.2], [0.8, 1.2]]) k.cylinder(0.42, 0.45, 1.8, 8, skin, { position: [x, 0.9, z] });
  for (const s of [-1, 1]) k.blob(0.07, INK, { position: [s * 0.55, 2.95, -2.6], detail: 0 });
  return k.build(0.02, 6);
}

/** Paper kite with a tail, for Galle Face Green. */
export function buildKite(colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  const s = new THREE.Shape();
  s.moveTo(0, 1.6);
  s.lineTo(1, 0);
  s.lineTo(0, -1.8);
  s.lineTo(-1, 0);
  s.closePath();
  k.add(new THREE.ShapeGeometry(s), colour);
  k.box(2, 0.04, 0.04, INK, { position: [0, 0, 0.02] });
  for (let i = 0; i < 5; i++) k.box(0.35, 0.2, 0.02, ['#f6f0e4', '#d8463a', '#f4d23b'][i % 3], { position: [Math.sin(i) * 0.3, -2 - i * 0.6, 0], rotation: [0, 0, 0.5] });
  return k.build(0, 2);
}

/** Oruwa: traditional outrigger canoe. Faces -Z. */
export function buildOruwa(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(0.9, 0.7, 7, '#7a4a2a', { position: [0, 0.35, 0], pattern: Pattern.Planks });
  k.add(new THREE.ConeGeometry(0.5, 1.2, 4), '#7a4a2a', { position: [0, 0.4, -4], rotation: [-Math.PI / 2, 0, 0] });
  for (const z of [-1.5, 1.5]) k.box(4, 0.12, 0.15, '#9a6a3a', { position: [1.8, 0.8, z] });
  k.box(0.35, 0.35, 5, '#9a6a3a', { position: [3.6, 0.2, 0] });
  k.cylinder(0.06, 0.06, 5, 5, '#9a6a3a', { position: [0, 3, -0.5] });
  const sail = new THREE.Shape();
  sail.moveTo(0, 0);
  sail.lineTo(2.2, 0.5);
  sail.lineTo(0, 4.2);
  sail.closePath();
  k.add(new THREE.ShapeGeometry(sail), '#f1e4c0', { position: [0.05, 0.9, -0.5], rotation: [0, Math.PI / 2, 0] });
  return k.build(0.02, 8);
}

/** Beach cabana with a thatched roof. Front faces +Z. */
export function buildCabana(rnd: Random): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(4, 0.4, 4, '#b9824a', { position: [0, 0.6, 0], pattern: Pattern.Planks });
  for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) k.cylinder(0.12, 0.14, 3, 6, '#7a4a2a', { position: [x, 2, z] });
  k.add(new THREE.ConeGeometry(3.6, 2.4, 4), '#d8b86a', { position: [0, 4.6, 0], rotation: [0, Math.PI / 4, 0], pattern: Pattern.Thatch });
  k.box(3.6, 1.2, 0.1, rnd.pick(['#2f8f86', '#f08a2e', '#e8559a']), { position: [0, 1.4, -1.8], pattern: Pattern.Planks });
  return k.build(0.03, rnd.int(0, 99));
}

/** Tea plucker's basket on a figure is added by the NPC system; this is a roadside tea factory. */
export function buildTeaFactory(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(30, 12, 12, '#f1ebe0', { position: [0, 6, 0], pattern: Pattern.Brick });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) k.box(2, 1.4, 0.2, '#3e8f6a', { position: [-12.5 + j * 3.6, 2.5 + i * 2.8, 6.05] });
  k.add(hipRoof(31, 13, 3), '#9aa0b8', { position: [0, 12, 0] });
  k.box(18, 0.5, 2, '#d8463a', { position: [0, 13.5, 6.4] });
  return k.build(0.05, 12);
}

function hipRoof(w: number, d: number, h: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4);
  g.scale(w / Math.SQRT2, h, d / Math.SQRT2);
  g.translate(0, h / 2, 0);
  return g;
}
