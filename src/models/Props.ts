import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { Random } from '../core/Random';

const INK = '#2b2622';

/** Leaning street lamp; the lantern glass glows at night. Base at origin, arm reaches forward (+Z) over the road. */
export function buildLamp(rnd: Random): THREE.BufferGeometry {
  const lean = rnd.jitter(0.05);
  return new ModelKit()
    .cylinder(0.2, 0.26, 0.4, 8, INK, { position: [0, 0.2, 0] })
    .cylinder(0.07, 0.09, 4.6, 6, INK, { position: [0, 2.5, 0], rotation: [0, 0, lean] })
    .box(0.07, 0.07, 1.1, INK, { position: [0, 4.7, 0.45] })
    .box(0.42, 0.55, 0.42, '#fff2b8', { position: [0, 4.35, 0.95], nightGlow: 1 })
    .box(0.52, 0.12, 0.52, INK, { position: [0, 4.68, 0.95] })
    .cylinder(0.02, 0.2, 0.16, 4, INK, { position: [0, 4.82, 0.95], rotation: [0, Math.PI / 4, 0] })
    .build(0.02, rnd.int(0, 99));
}

export function buildBench(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 3; i++) k.box(1.8, 0.07, 0.14, '#9a5a32', { position: [0, 0.48, -0.16 + i * 0.16] });
  for (let i = 0; i < 2; i++) k.box(1.8, 0.14, 0.06, '#9a5a32', { position: [0, 0.75 + i * 0.2, 0.28] });
  for (const x of [-0.75, 0.75]) k.box(0.08, 0.5, 0.5, INK, { position: [x, 0.25, 0] });
  return k.build(0.01, 4);
}

/** Cardboard crate stack (knock-over road furniture). */
export function buildCrate(): THREE.BufferGeometry {
  return new ModelKit()
    .box(1.1, 1.1, 1.1, '#c8955a', { position: [0, 0.55, 0] })
    .box(1.12, 0.12, 1.12, '#e0b27a', { position: [0, 1.04, 0] })
    .box(0.18, 1.12, 1.12, '#b07e48', { position: [0, 0.55, 0] })
    .build(0.03, 11);
}

/** Wedge ramp panel for hops. Faces -Z (drive up it). */
export function buildRamp(width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(3.2, 0);
  shape.lineTo(3.2, 0.55);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  g.translate(-3.2, 0, -width / 2);
  g.rotateY(Math.PI / 2);
  g.translate(0, 0, -3.2); // low edge at z = 0, high edge at z = -3.2 (drive toward -Z)
  return new ModelKit().add(g, '#b9824a').box(width, 0.05, 0.3, '#f4d23b', { position: [0, 0.5, -3.1] }).build(0.02, 12);
}

/** Glowing speed-pad strip lying flat on the road. */
export function buildSpeedPad(): THREE.BufferGeometry {
  const k = new ModelKit();
  for (let i = 0; i < 3; i++) {
    k.box(1.2, 0.06, 0.5, '#ffe36a', { position: [0, 0.04, -i * 0.9], rotation: [0, 0, 0] });
    k.box(0.5, 0.061, 0.5, '#fff6c0', { position: [0, 0.045, -i * 0.9 + 0.1], rotation: [0, Math.PI / 4, 0] });
  }
  return k.build(0, 0);
}

/** A music note (quaver) extruded, standing upright facing -Z. Origin at the note head. */
export function buildNoteGeometry(double: boolean): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  // Head: tilted ellipse approximated by an absellipse.
  shape.absellipse(0, 0, 0.26, 0.18, 0, Math.PI * 2, false, 0.35);
  const parts: THREE.Shape[] = [shape];
  const stem = (x: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(x + 0.2, 0.02);
    s.lineTo(x + 0.27, 0.02);
    s.lineTo(x + 0.27, 0.95);
    s.lineTo(x + 0.2, 0.95);
    s.closePath();
    return s;
  };
  parts.push(stem(0));
  if (double) {
    const head2 = new THREE.Shape();
    head2.absellipse(0.62, 0.12, 0.26, 0.18, 0, Math.PI * 2, false, 0.35);
    parts.push(head2, stem(0.62));
    const beam = new THREE.Shape();
    beam.moveTo(0.2, 0.95);
    beam.lineTo(0.89, 1.07);
    beam.lineTo(0.89, 0.88);
    beam.lineTo(0.2, 0.76);
    beam.closePath();
    parts.push(beam);
  } else {
    const flag = new THREE.Shape();
    flag.moveTo(0.27, 0.95);
    flag.quadraticCurveTo(0.62, 0.72, 0.5, 0.36);
    flag.quadraticCurveTo(0.52, 0.62, 0.27, 0.72);
    flag.closePath();
    parts.push(flag);
  }
  const g = new THREE.ExtrudeGeometry(parts, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 6 });
  g.translate(double ? -0.35 : -0.1, -0.35, -0.08);
  g.scale(1.3, 1.3, 1.3);
  return g;
}

export function buildBolt(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.1, 0.9);
  s.lineTo(-0.35, 0.05);
  s.lineTo(0.0, 0.05);
  s.lineTo(-0.15, -0.9);
  s.lineTo(0.38, 0.12);
  s.lineTo(0.02, 0.12);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  g.translate(0, 0, -0.09);
  return new ModelKit().add(g, '#f4d23b').build(0, 0);
}

export function buildMagnet(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.add(new THREE.TorusGeometry(0.45, 0.16, 6, 12, Math.PI), '#4f9a5a', { rotation: [0, 0, Math.PI] });
  k.cylinder(0.16, 0.16, 0.35, 6, '#4f9a5a', { position: [-0.45, 0.17, 0] });
  k.cylinder(0.16, 0.16, 0.35, 6, '#4f9a5a', { position: [0.45, 0.17, 0] });
  k.cylinder(0.165, 0.165, 0.18, 6, '#e8e4dc', { position: [-0.45, 0.42, 0] });
  k.cylinder(0.165, 0.165, 0.18, 6, '#e8e4dc', { position: [0.45, 0.42, 0] });
  return k.build(0, 0);
}

/** Tonic bottle (Fizzy Ink / Focus Tea). */
export function buildBottle(colour: string): THREE.BufferGeometry {
  return new ModelKit()
    .add(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.32, 0.05), new THREE.Vector2(0.35, 0.5), new THREE.Vector2(0.12, 0.75), new THREE.Vector2(0.1, 0.95), new THREE.Vector2(0, 0.95)], 10), colour)
    .cylinder(0.12, 0.12, 0.15, 8, '#9a5a32', { position: [0, 1.0, 0] })
    .blob(0.12, '#ffffff', { position: [0.12, 0.35, -0.3], detail: 0 })
    .build(0, 0);
}

/** Flower arch over the road (Petal Twist). Spans x in [-half, half]. */
export function buildFlowerArch(rnd: Random, half: number, height: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    pts.push(new THREE.Vector3(-Math.cos(a) * half, Math.sin(a) * height, 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  k.add(new THREE.TubeGeometry(curve, 24, 0.14, 5, false), INK);
  const flowers = ['#e8559a', '#d94a86', '#f08a2e', '#c8457a', '#f4a0c0'];
  for (let i = 0; i < 26; i++) {
    const p = curve.getPoint(rnd.range(0.02, 0.98));
    k.blob(rnd.range(0.55, 1.05), rnd.pick(flowers), { position: [p.x + rnd.jitter(0.4), p.y + rnd.jitter(0.4), rnd.jitter(0.6)], detail: 0, roughness: 0.3, seed: i });
  }
  for (let i = 0; i < 6; i++) {
    const p = curve.getPoint(rnd.range(0.1, 0.9));
    k.blob(0.5, '#4f9a4a', { position: [p.x, p.y - 0.3, rnd.jitter(0.5)], detail: 0, seed: i + 50 });
  }
  return k.build(0.05, rnd.int(0, 999));
}

/** Bunting gate (Ribbon Gate): two posts with a string of paper flags. */
export function buildBuntingGate(rnd: Random, half: number): THREE.BufferGeometry {
  const k = new ModelKit();
  const h = 7.5;
  for (const x of [-half, half]) {
    k.cylinder(0.18, 0.22, h, 6, '#d8643a', { position: [x, h / 2, 0] });
    k.blob(0.45, '#fff2b8', { position: [x, h + 0.3, 0], detail: 0, nightGlow: 1 });
  }
  const flags = ['#d8463a', '#f4d23b', '#3e6fa8', '#4f9a5a', '#e8559a', '#f6f0e4'];
  const n = Math.round(half * 2.2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -half + t * half * 2;
    const y = h - 0.3 - Math.sin(t * Math.PI) * 1.4;
    k.box(0.05, 0.05, 0.05, INK, { position: [x, y, 0] });
    const s = new THREE.Shape();
    s.moveTo(-0.28, 0);
    s.lineTo(0.28, 0);
    s.lineTo(0, -0.6);
    s.closePath();
    k.add(new THREE.ShapeGeometry(s), rnd.pick(flags), { position: [x, y, 0], rotation: [0, 0, rnd.jitter(0.1)] });
  }
  k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    return new THREE.Vector3(-half + t * half * 2, h - 0.3 - Math.sin(t * Math.PI) * 1.4, 0);
  })), 20, 0.03, 4), INK);
  return k.build(0.02, rnd.int(0, 99));
}

/** Striped lighthouse. Origin at its base. */
export function buildLighthouse(): THREE.BufferGeometry {
  const k = new ModelKit();
  k.cylinder(4.5, 5, 2.5, 12, '#b4aed0', { position: [0, 1.25, 0] });
  for (let i = 0; i < 6; i++) k.cylinder(2.3 - i * 0.12, 2.42 - i * 0.12, 3, 12, i % 2 ? '#f6f0e4' : '#d8463a', { position: [0, 4 + i * 3, 0] });
  k.cylinder(2.2, 2.2, 0.4, 12, INK, { position: [0, 20.7, 0] });
  k.cylinder(1.4, 1.4, 2.2, 10, '#fff2b8', { position: [0, 22, 0], nightGlow: 1 });
  k.cylinder(0.1, 1.9, 1.8, 10, '#d8463a', { position: [0, 24, 0] });
  return k.build(0.06, 21);
}

/** Crayon / pencil hanging in the sky. Points down. */
export function buildCrayon(colour: string, length: number): THREE.BufferGeometry {
  return new ModelKit()
    .cylinder(0.9, 0.9, length, 6, colour, { position: [0, length / 2, 0] })
    .cylinder(0.92, 0.92, length * 0.25, 6, '#f6f0e4', { position: [0, length * 0.45, 0] })
    .cylinder(0.9, 0.05, 1.8, 6, colour, { position: [0, -0.9, 0], rotation: [Math.PI, 0, 0] })
    .build(0.05, length);
}

/** Paper boat for the sea. */
export function buildPaperBoat(): THREE.BufferGeometry {
  const k = new ModelKit();
  const s = new THREE.Shape();
  s.moveTo(-1.6, 0.6);
  s.lineTo(1.6, 0.6);
  s.lineTo(1.1, 0);
  s.lineTo(-1.1, 0);
  s.closePath();
  k.add(new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }), '#f6f0e4', { position: [0, 0, -0.6] });
  const sail = new THREE.Shape();
  sail.moveTo(-0.9, 0.6);
  sail.lineTo(0.9, 0.6);
  sail.lineTo(0, 1.9);
  sail.closePath();
  k.add(new THREE.ExtrudeGeometry(sail, { depth: 0.05, bevelEnabled: false }), '#fbf8ef');
  return k.build(0.02, 5);
}
