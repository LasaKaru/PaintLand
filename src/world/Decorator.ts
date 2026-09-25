import * as THREE from 'three';
import { RoadPath, createFrame, type RoadFrame } from '../road/RoadPath';
import { KERB_WIDTH } from '../road/RoadMesh';
import { Random, hashString } from '../core/Random';
import { PaintMaterial } from '../render/PaintMaterial';
import type { DistrictDef, DressStyle } from './Districts';
import type { ChapterDef } from './Chapters';
import { DRESSERS } from './dress';

/** A sphere the camera must not enter (docs/05 §5.2 "collision"). */
export interface CameraBlocker {
  center: THREE.Vector3;
  radius: number;
}

/** A spot where something interesting happens (missions, NPCs, photo points). */
export interface Landmark {
  name: string;
  district: number;
  s: number;
  position: THREE.Vector3;
}

/** Something that moves along the road and can be bumped into (the Nine Arch train). */
export interface Mover {
  s: number;
  x: number;
  halfLength: number;
  halfWidth: number;
}

export type Dresser = (d: Decorator, span: { start: number; end: number; district: number }, rnd: Random, def: DistrictDef) => void;

/**
 * Dresses a chapter's route with a seeded placer, so the world looks
 * hand-placed but rebuilds identically every time (docs/04 §8).
 * Props are placed in the *road frame*, so houses beside a wall road stick out
 * sideways and houses on the ceiling hang upside down — for free.
 *
 * This class is the placement toolkit; the per-style dressing lives in `dress/`.
 */
export class Decorator {
  readonly group = new THREE.Group();
  readonly blockers: CameraBlocker[] = [];
  readonly landmarks: Landmark[] = [];
  /** Animated props: slow bob and spin. */
  readonly floaters: { object: THREE.Object3D; base: THREE.Vector3; phase: number; spin: number; bob: number }[] = [];
  /** Per-frame animation hooks (trains, kites, waterfalls). */
  readonly animators: ((time: number, dt: number) => void)[] = [];
  readonly movers: Mover[] = [];
  readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly buckets = new Map<THREE.BufferGeometry, THREE.Matrix4[]>();
  private readonly castShadow = new Set<THREE.BufferGeometry>();
  private readonly frame: RoadFrame = createFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();

  constructor(readonly path: RoadPath, readonly chapter: ChapterDef) {
    this.group.name = 'decor';
  }

  build(): THREE.Group {
    for (const span of this.path.spans) {
      const def = this.chapter.districts[span.district];
      const rnd = new Random(hashString(def.id));
      const dress = DRESSERS[def.style as DressStyle];
      dress(this, span, rnd, def);
    }
    this.chapter.background(this, new Random(hashString(this.chapter.id + ':bg')));
    this.flush();
    return this.group;
  }

  // ————— placement helpers —————

  sample(s: number, out: RoadFrame = createFrame()): RoadFrame {
    return this.path.sample(s, out);
  }

  /** Matrix for an object at road coords (s, x, h), turned `yaw` about the road up. */
  roadMatrix(s: number, x: number, h: number, yaw: number, scale = 1): THREE.Matrix4 {
    const f = this.path.sample(s, this.frame);
    // Columns: right, up, back(-tangent) → object -Z points along the road.
    this.basis.makeBasis(f.right, f.up, this.v.copy(f.tangent).negate());
    this.q.setFromRotationMatrix(this.basis);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.q.multiply(yawQ);
    const pos = new THREE.Vector3().copy(f.position).addScaledVector(f.right, x).addScaledVector(f.up, h);
    return new THREE.Matrix4().compose(pos, this.q, new THREE.Vector3(scale, scale, scale));
  }

  /** World matrix: position, yaw about world Y, uniform or per-axis scale. */
  worldMatrix(position: THREE.Vector3, yaw = 0, scale: number | THREE.Vector3 = 1): THREE.Matrix4 {
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale;
    return new THREE.Matrix4().compose(position, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), s);
  }

  place(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, shadow = true): void {
    let list = this.buckets.get(geometry);
    if (!list) {
      list = [];
      this.buckets.set(geometry, list);
    }
    list.push(matrix);
    if (shadow) this.castShadow.add(geometry);
  }

  /** A single animated mesh (not instanced). */
  addMesh(geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4, shadow = true): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material);
    if (matrix) matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  /** A mesh that spins about one of its local axes (Ferris wheels, windmills, fans). */
  addSpinner(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, axis: 'x' | 'y' | 'z', speed: number): THREE.Mesh {
    const holder = new THREE.Group();
    matrix.decompose(holder.position, holder.quaternion, holder.scale);
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.castShadow = true;
    holder.add(mesh);
    this.group.add(holder);
    this.animators.push((t) => (mesh.rotation[axis] = t * speed));
    return mesh;
  }

  block(matrix: THREE.Matrix4, localCenter: THREE.Vector3, radius: number): void {
    this.blockers.push({ center: localCenter.clone().applyMatrix4(matrix), radius });
  }

  blockWorld(center: THREE.Vector3, radius: number): void {
    this.blockers.push({ center: center.clone(), radius });
  }

  /** Record a landmark; `focus` is what cameras should look at (defaults to the road point). */
  landmark(name: string, district: number, s: number, focus?: THREE.Vector3): void {
    this.landmarks.push({ name, district, s, position: focus?.clone() ?? this.path.sample(s, createFrame()).position.clone() });
  }

  /**
   * Put a prop on one side of the road with its front (+Z) facing the road.
   * side = -1 left, +1 right. (Yaw +90° turns +Z toward the road's right.)
   */
  sideProp(geometry: THREE.BufferGeometry, s: number, side: number, offset: number, h = 0.18, blockRadius = 0, blockHeight = 0): THREE.Matrix4 {
    const f = this.path.sample(s, this.frame);
    const edge = f.width / 2 + KERB_WIDTH;
    const x = side * (edge + offset);
    const m = this.roadMatrix(s, x, h, side > 0 ? -Math.PI / 2 : Math.PI / 2);
    this.place(geometry, m);
    if (blockRadius > 0) this.block(m, new THREE.Vector3(0, blockHeight, 0), blockRadius);
    return m;
  }

  addFloater(geometry: THREE.BufferGeometry, position: THREE.Vector3, tilt: number, spin: number, bob = 2): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.copy(position);
    mesh.rotation.set(tilt, (position.x * 0.37 + position.z * 0.11) % 6.28, tilt * 0.5);
    this.group.add(mesh);
    this.floaters.push({ object: mesh, base: position.clone(), phase: (position.x + position.z) % 6.28, spin, bob });
    return mesh;
  }

  nearRoad(p: THREE.Vector3, distance: number): boolean {
    const f = createFrame();
    for (let s = 0; s < this.path.length; s += 10) {
      if (this.path.sample(s, f).position.distanceTo(p) < distance) return true;
    }
    return false;
  }

  /** Random point around the route's centre, at least `clear` metres from the road. */
  scatter(rnd: Random, minR: number, maxR: number, y: number | [number, number], clear: number): THREE.Vector3 | null {
    const centre = this.path.bounds().getCenter(new THREE.Vector3());
    for (let tries = 0; tries < 6; tries++) {
      const a = rnd.range(0, Math.PI * 2);
      const d = rnd.range(minR, maxR);
      const py = typeof y === 'number' ? y : rnd.range(y[0], y[1]);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * d, py, centre.z + Math.sin(a) * d);
      if (!this.nearRoad(p, clear)) return p;
    }
    return null;
  }

  maxY(s0: number, s1: number): number {
    const f = createFrame();
    let y = -Infinity;
    for (let s = s0; s <= s1; s += 2) y = Math.max(y, this.path.sample(s, f).position.y);
    return y;
  }

  minY(s0: number, s1: number): number {
    const f = createFrame();
    let y = Infinity;
    for (let s = s0; s <= s1; s += 2) y = Math.min(y, this.path.sample(s, f).position.y);
    return y;
  }

  /** Where the road is closest to vertical (tangent pointing up or down). */
  findVerticalRange(s0: number, s1: number): { start: number; end: number } {
    const f = createFrame();
    let start = s1;
    let end = s0;
    for (let s = s0; s <= s1; s += 1) {
      this.path.sample(s, f);
      if (Math.abs(f.tangent.y) > 0.97) {
        start = Math.min(start, s);
        end = Math.max(end, s);
      }
    }
    return { start, end };
  }

  findInvertedRange(s0: number, s1: number): { start: number; end: number } {
    const f = createFrame();
    let start = s1;
    let end = s0;
    for (let s = s0; s <= s1; s += 1) {
      if (this.path.sample(s, f).up.y < -0.97) {
        start = Math.min(start, s);
        end = Math.max(end, s);
      }
    }
    return { start, end };
  }

  /** Average position over part of a span (helix centres, loop centres). */
  centroid(s0: number, s1: number, step = 4): THREE.Vector3 {
    const f = createFrame();
    const c = new THREE.Vector3();
    let n = 0;
    for (let s = s0; s < s1; s += step) {
      c.add(this.path.sample(s, f).position);
      n++;
    }
    return c.divideScalar(Math.max(1, n));
  }

  /** Turn the buckets into instanced meshes (one draw call per model variant). */
  private flush(): void {
    for (const [geometry, matrices] of this.buckets) {
      const mesh = new THREE.InstancedMesh(geometry, this.material, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = this.castShadow.has(geometry);
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    }
    this.buckets.clear();
  }

  update(time: number, dt: number): void {
    for (const f of this.floaters) {
      f.object.position.y = f.base.y + Math.sin(time * 0.3 + f.phase) * f.bob;
      f.object.rotation.y += f.spin * dt;
    }
    for (const a of this.animators) a(time, dt);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.material.dispose();
  }
}
