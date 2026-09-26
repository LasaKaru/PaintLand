import * as THREE from 'three';
import { ModelKit } from './ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';

export type PetKind = 'fox' | 'cat' | 'crane';
export const PET_KINDS: PetKind[] = ['fox', 'cat', 'crane'];
export const isPet = (v: unknown): v is PetKind => typeof v === 'string' && (PET_KINDS as string[]).includes(v);

const INK = '#2b2622';

/** Body geometry (faces -Z, origin on the ground); the crane's wings are separate so they can flap. */
function buildPet(kind: PetKind): { body: THREE.BufferGeometry; wing: THREE.BufferGeometry | null; tail: THREE.BufferGeometry | null } {
  const k = new ModelKit();
  if (kind === 'crane') {
    // An origami crane: folded body, long neck and tail points.
    k.add(new THREE.OctahedronGeometry(0.18, 0), '#f6f0e4', { scale: [0.8, 0.7, 1.4] });
    k.add(new THREE.ConeGeometry(0.04, 0.42, 4), '#f6f0e4', { position: [0, 0.16, -0.26], rotation: [-0.7, 0, 0] });
    k.add(new THREE.ConeGeometry(0.03, 0.12, 4), '#d8463a', { position: [0, 0.32, -0.42], rotation: [-2.0, 0, 0] });
    k.add(new THREE.ConeGeometry(0.04, 0.4, 4), '#f6f0e4', { position: [0, 0.14, 0.28], rotation: [0.8, 0, 0] });
    const w = new ModelKit().add(new THREE.ConeGeometry(0.16, 0.5, 3).rotateZ(Math.PI / 2).translate(0.25, 0, 0), '#bfd9e8', { scale: [1, 0.15, 1] }).build(0.004, 2);
    return { body: k.build(0.004, 1), wing: w, tail: null };
  }
  const fox = kind === 'fox';
  const fur = fox ? '#e07a2e' : '#8c8a94';
  const light = fox ? '#f6f0e4' : '#d8d4d0';
  k.blob(0.16, fur, { position: [0, 0.24, 0], scale: [0.8, 0.75, 1.5], detail: 1 });
  k.blob(0.1, light, { position: [0, 0.2, -0.14], scale: [0.8, 0.8, 1], detail: 0 });
  k.blob(0.12, fur, { position: [0, 0.4, -0.25], scale: [1, 0.95, 1], detail: 1 });
  if (fox) k.add(new THREE.ConeGeometry(0.06, 0.14, 5).rotateX(-Math.PI / 2), light, { position: [0, 0.37, -0.38] });
  else k.blob(0.05, light, { position: [0, 0.37, -0.34], scale: [1.2, 0.8, 0.8], detail: 0 });
  k.blob(0.02, INK, { position: [0, fox ? 0.37 : 0.38, fox ? -0.45 : -0.37], detail: 0 });
  for (const s of [-1, 1]) {
    k.add(new THREE.ConeGeometry(fox ? 0.05 : 0.045, fox ? 0.14 : 0.1, 4), fur, { position: [s * 0.065, 0.53, -0.24], rotation: [0, 0, s * -0.2] });
    k.blob(0.018, INK, { position: [s * 0.05, 0.43, -0.35], detail: 0 });
    for (const z of [-0.14, 0.14]) k.cylinder(0.03, 0.03, 0.18, 5, fox ? INK : fur, { position: [s * 0.07, 0.09, z] });
  }
  if (!fox) for (const s of [-1, 1]) k.box(0.1, 0.006, 0.006, INK, { position: [s * 0.1, 0.37, -0.36], rotation: [0, 0, s * 0.2] });
  const tail = new ModelKit();
  if (fox) {
    tail.blob(0.09, fur, { position: [0, 0.05, 0.16], scale: [0.9, 0.9, 2.1], detail: 1 });
    tail.blob(0.05, light, { position: [0, 0.07, 0.34], detail: 0 });
  } else tail.cylinder(0.025, 0.02, 0.36, 5, fur, { position: [0, 0.16, 0.06], rotation: [0.4, 0, 0] });
  return { body: k.build(0.005, fox ? 3 : 4), wing: null, tail: tail.build(0.005, 5) };
}

/**
 * A pet that trots (or flies) after its owner: it keeps to a spot just behind
 * and beside them, runs to catch up, and pops back next to them if left far
 * behind. Purely cosmetic: no collisions.
 */
export class Pet {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly wings: THREE.Mesh[] = [];
  private tail: THREE.Mesh | null = null;
  private speed = 0;
  private placed = false;
  private hop = Math.random() * 6;

  constructor(readonly kind: PetKind) {
    const mat = new PaintMaterial({ vertexColors: true, flat: true, gloss: 0.1 });
    const g = buildPet(kind);
    const m = new THREE.Mesh(g.body, mat);
    m.castShadow = true;
    this.body.add(m);
    if (g.wing) {
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(g.wing, mat);
        w.scale.x = s;
        w.position.set(0, 0.04, 0);
        this.body.add(w);
        this.wings.push(w);
      }
    }
    if (g.tail) {
      this.tail = new THREE.Mesh(g.tail, mat);
      this.tail.position.set(0, 0.24, 0.18);
      this.body.add(this.tail);
    }
    this.root.add(this.body);
    this.root.name = `pet-${kind}`;
  }

  /** Put the pet straight beside its owner (after getting out of a car, a teleport, ...). */
  reset(): void {
    this.placed = false;
  }

  /** `owner` is where the owner stands (feet), `heading` which way they face. */
  update(dt: number, owner: THREE.Vector3, heading: number, time: number): void {
    // A spot behind and to the right of the owner.
    const tx = owner.x + Math.cos(heading) * 0.9 + Math.sin(heading) * 0.8;
    const tz = owner.z - Math.sin(heading) * 0.9 + Math.cos(heading) * 0.8;
    const p = this.root.position;
    if (!this.placed || Math.hypot(tx - p.x, tz - p.z) > 14) {
      p.set(tx, owner.y, tz);
      this.root.rotation.y = heading;
      this.placed = true;
    }
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    const want = d < 0.25 ? 0 : Math.min(9, d * 2.2);
    this.speed += (want - this.speed) * Math.min(1, dt * 6);
    if (d > 1e-3) {
      const step = Math.min(d, this.speed * dt);
      p.x += (dx / d) * step;
      p.z += (dz / d) * step;
    }
    // Face where it's going, or the owner's way when settled.
    const face = this.speed > 0.4 ? Math.atan2(-dx, -dz) : heading;
    let turn = face - this.root.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    this.root.rotation.y += turn * Math.min(1, dt * 8);
    p.y += (owner.y - p.y) * Math.min(1, dt * 10);
    const moving = Math.min(1, this.speed / 3);
    this.hop += dt * (4 + this.speed * 2.5);
    if (this.kind === 'crane') {
      // Glides at shoulder height, flapping harder when it hurries.
      this.body.position.y = 1.7 + Math.sin(time * 1.8) * 0.12;
      const flap = Math.sin(time * (5 + moving * 7)) * (0.35 + moving * 0.4);
      this.wings[0].rotation.z = flap;
      this.wings[1].rotation.z = -flap;
      this.body.rotation.x = -moving * 0.2;
    } else {
      this.body.position.y = Math.abs(Math.sin(this.hop)) * 0.08 * moving;
      this.body.rotation.x = Math.sin(this.hop * 2) * 0.05 * moving;
      if (this.tail) this.tail.rotation.y = Math.sin(time * (this.kind === 'fox' ? 3 : 2)) * (0.35 - moving * 0.2);
    }
  }
}
