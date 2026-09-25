import * as THREE from 'three';
import { RoadPath, createFrame, type RoadFrame } from '../road/RoadPath';
import { walkableHalfWidth, KERB_WIDTH, PAVEMENT_WIDTH, WALL_WIDTH } from '../road/RoadMesh';
import { Random, hashString } from '../core/Random';
import { PaintMaterial } from '../render/PaintMaterial';
import { DISTRICTS } from './Districts';
import { buildHouse, buildKiosk, buildStall, buildTower, shade } from '../models/Buildings';
import { buildBush, buildCloud, buildCypress, buildFloatingRock, buildIsland, buildPottedPlant, buildRoundTree } from '../models/Nature';
import { buildBench, buildBuntingGate, buildCrayon, buildFlowerArch, buildLamp, buildLighthouse, buildPaperBoat } from '../models/Props';
import { ModelKit } from '../models/ModelKit';

/** A sphere the camera must not enter (docs/05 §5.2 "collision"). */
export interface CameraBlocker {
  center: THREE.Vector3;
  radius: number;
}

/**
 * Dresses the route district by district with a seeded placer, so the world
 * looks hand-placed but rebuilds identically every time (docs/04 §8).
 * Props are placed in the *road frame*, so houses beside a wall road stick out
 * sideways and houses on the ceiling hang upside down — for free.
 */
export class Decorator {
  readonly group = new THREE.Group();
  readonly blockers: CameraBlocker[] = [];
  /** Animated sky props (slow bob and spin). */
  readonly floaters: { object: THREE.Object3D; base: THREE.Vector3; phase: number; spin: number }[] = [];
  private readonly buckets = new Map<THREE.BufferGeometry, THREE.Matrix4[]>();
  private readonly castShadow = new Set<THREE.BufferGeometry>();
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly frame: RoadFrame = createFrame();
  private readonly m = new THREE.Matrix4();
  private readonly basis = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();

  constructor(private readonly path: RoadPath) {
    this.group.name = 'decor';
  }

  build(): THREE.Group {
    for (const span of this.path.spans) {
      const def = DISTRICTS[span.district];
      const rnd = new Random(hashString(def.id));
      switch (def.style) {
        case 'town':
          this.dressTown(span.start, span.end, rnd, def.walls);
          break;
        case 'tower':
          this.dressTower(span.start, span.end, rnd, def.walls);
          break;
        case 'ceiling':
          this.dressCeiling(span.start, span.end, rnd, def.walls);
          break;
        case 'arches':
          this.dressArches(span.start, span.end, rnd);
          break;
        case 'chute':
          this.dressChute(span.start, span.end, rnd);
          break;
        case 'bridge':
          this.dressBridge(span.start, span.end, rnd);
          break;
        case 'loop':
          this.dressLoop(span.start, span.end, rnd);
          break;
        case 'gate':
          this.dressGate(span.start, span.end, rnd);
          break;
      }
    }
    this.dressBackground(new Random(99));
    this.flush();
    return this.group;
  }

  // ————— placement helpers —————

  /** Matrix for an object at road coords (s, x, h), turned `yaw` about the road up. Local +Z faces `facing`. */
  private roadMatrix(s: number, x: number, h: number, yaw: number, scale = 1): THREE.Matrix4 {
    const f = this.path.sample(s, this.frame);
    // Columns: right, up, back(-tangent) → object -Z points along the road.
    this.basis.makeBasis(f.right, f.up, this.v.copy(f.tangent).negate());
    this.q.setFromRotationMatrix(this.basis);
    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.q.multiply(yawQ);
    const pos = new THREE.Vector3().copy(f.position).addScaledVector(f.right, x).addScaledVector(f.up, h);
    return this.m.compose(pos, this.q, new THREE.Vector3(scale, scale, scale)).clone();
  }

  private place(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, shadow = true): void {
    let list = this.buckets.get(geometry);
    if (!list) {
      list = [];
      this.buckets.set(geometry, list);
    }
    list.push(matrix);
    if (shadow) this.castShadow.add(geometry);
  }

  private block(matrix: THREE.Matrix4, localCenter: THREE.Vector3, radius: number): void {
    this.blockers.push({ center: localCenter.clone().applyMatrix4(matrix), radius });
  }

  /** Put a prop on one side of the road. side = -1 left, +1 right. Faces the road. */
  private sideProp(geometry: THREE.BufferGeometry, s: number, side: number, offset: number, h = 0.18, blockRadius = 0, blockHeight = 0): THREE.Matrix4 {
    const f = this.path.sample(s, this.frame);
    const edge = f.width / 2 + KERB_WIDTH;
    const x = side * (edge + offset);
    // +Z of the prop should face the road centre: yaw -90° on the right side, +90° on the left.
    const m = this.roadMatrix(s, x, h, side > 0 ? Math.PI / 2 : -Math.PI / 2);
    this.place(geometry, m);
    if (blockRadius > 0) this.block(m, new THREE.Vector3(0, blockHeight, 0), blockRadius);
    return m;
  }

  // ————— districts —————

  private dressTown(s0: number, s1: number, rnd: Random, walls: string[]): void {
    const houses = Array.from({ length: 14 }, (_, i) => buildHouse(rnd.fork(i), walls[i % walls.length]));
    const trees = [buildRoundTree(rnd, '#f4d23b'), buildRoundTree(rnd, '#f08a2e'), buildRoundTree(rnd, null), buildRoundTree(rnd, '#f4d23b')];
    const cypress = [buildCypress(rnd), buildCypress(rnd)];
    const lamp = buildLamp(rnd);
    const bench = buildBench();
    const stall = buildStall(rnd);
    const pot = buildPottedPlant(rnd);
    const bush = buildBush(rnd);

    for (const side of [-1, 1]) {
      let s = s0 + 6;
      while (s < s1 - 30) {
        const house = rnd.pick(houses);
        const f = this.path.sample(s, this.frame);
        const plazaDepth = f.plaza;
        if (plazaDepth < 4) break;
        const setback = PAVEMENT_WIDTH + 1.2 + rnd.range(0, 1.5);
        const x = side * (f.width / 2 + KERB_WIDTH + setback + house.depth / 2);
        const m = this.roadMatrix(s + house.width / 2, x, 0.18, side > 0 ? Math.PI / 2 : -Math.PI / 2);
        this.place(house.geometry, m);
        this.block(m, new THREE.Vector3(0, house.height / 2, 0), Math.max(house.width, house.height) * 0.55);
        s += house.width + rnd.range(0.3, 2.5);
      }
    }
    // Street furniture on the pavements.
    for (let s = s0 + 8; s < s1 - 30; s += rnd.range(9, 14)) {
      const side = rnd.chance(0.5) ? -1 : 1;
      this.sideProp(lamp, s, side, 0.6);
      const r = rnd.next();
      const other = -side;
      if (r < 0.35) this.sideProp(rnd.pick(trees), s + 3, other, 1.3, 0.18, 2.2, 3.5);
      else if (r < 0.55) this.sideProp(rnd.pick(cypress), s + 3, other, 1.2, 0.18, 1.2, 4);
      else if (r < 0.7) this.sideProp(bench, s + 4, other, 1.0);
      else if (r < 0.8) this.sideProp(stall, s + 5, other, 1.6, 0.18, 1.8, 1.4);
      else if (r < 0.9) this.sideProp(pot, s + 2, other, 0.6);
      else this.sideProp(bush, s + 2, other, 1.0);
    }
    // Pier edge: bushes and a few cypress beyond the houses.
    for (let s = s0 + 20; s < s1 - 40; s += rnd.range(20, 40)) {
      const side = rnd.chance(0.5) ? -1 : 1;
      const f = this.path.sample(s, this.frame);
      const x = side * (walkableHalfWidth(f.width, f.plaza) - 1.5);
      this.place(rnd.pick(cypress), this.roadMatrix(s, x, 0.18, 0));
    }
  }

  private dressTower(s0: number, s1: number, rnd: Random, walls: string[]): void {
    // The tower face lies under the vertical part of the road.
    const mid = this.findMostVertical(s0, s1);
    const f = this.path.sample(mid, createFrame());
    // The tower reaches up to meet the ceiling slab of the next district, so the
    // quarter-pipe sits in the inside corner of a giant "Γ".
    const next = this.path.spans.find((sp) => sp.district === this.path.districtAt(s1 + 1));
    const ceilingY = next ? this.maxY(next.start, next.end) : this.maxY(s0, s1);
    const height = ceilingY + 11.5;
    const width = 70;
    const depth = 46;
    const towerGeo = buildTower(rnd, walls[0], width, height, depth);
    // Tower base on the sea floor, front face flush under the road.
    const outward = f.up.clone().setY(0).normalize();
    const centre = new THREE.Vector3(f.position.x, 0, f.position.z).addScaledVector(outward, -(depth / 2 + 2.2));
    const m = new THREE.Matrix4().compose(centre, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward), new THREE.Vector3(1, 1, 1));
    this.place(towerGeo, m);

    // Neighbouring towers of the skyline.
    for (let i = 0; i < 4; i++) {
      const w = rnd.range(18, 30);
      const h = rnd.range(60, 130);
      const g = buildTower(rnd.fork(i), rnd.pick(['#e3b34a', '#d8a05a', '#bfc4ea', '#f2c6b4']), w, h, w * 0.8);
      const side = i % 2 ? 1 : -1;
      const pos = centre.clone().addScaledVector(f.right, side * (width / 2 + w / 2 + 6 + i * 6)).addScaledVector(outward, -rnd.range(0, 30));
      const mm = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward), new THREE.Vector3(1, 1, 1));
      this.place(g, mm);
    }

    // Plants and lamps sticking out of the wall along the road.
    const lamp = buildLamp(rnd);
    const pot = buildPottedPlant(rnd);
    const bush = buildBush(rnd, '#6fae3a');
    for (let s = s0 + 10; s < s1 - 5; s += rnd.range(10, 16)) {
      const side = rnd.chance(0.5) ? -1 : 1;
      this.sideProp(rnd.chance(0.5) ? lamp : pot, s, side, 0.7);
      if (rnd.chance(0.5)) this.sideProp(bush, s + 5, -side, 1.2);
    }
  }

  private dressCeiling(s0: number, s1: number, rnd: Random, walls: string[]): void {
    // A huge slab "above" the inverted road (in the road's -up direction).
    const range = this.findInvertedRange(s0, s1);
    // Extend back over the quarter-pipe to meet the tower, and a little past the end.
    const back = 48;
    const len = range.end - range.start + back + 20;
    const mid = (range.start - back + range.end + 20) / 2;
    const f = this.path.sample(mid, createFrame());
    const width = 90;
    const thick = 10;
    const slab = new ModelKit().box(width, thick, len, '#bfc4ea', { position: [0, -thick / 2 - 1.5, 0] });
    // Window tiles on the slab face around the road.
    for (let z = -len / 2 + 4; z < len / 2 - 4; z += 6) {
      for (let x = -width / 2 + 5; x < width / 2 - 5; x += 7) {
        if (Math.abs(x) < 16) continue;
        if (rnd.chance(0.25)) continue;
        slab.box(2.2, 0.25, 2.8, rnd.chance(0.3) ? '#2f8f86' : '#3f4f78', { position: [x, -1.45, z], nightGlow: rnd.chance(0.3) ? 1 : 0 });
      }
    }
    const geo = slab.build(0.1, 17);
    const basis = new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent.clone().negate());
    const m = new THREE.Matrix4().compose(f.position, new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3(1, 1, 1));
    this.place(geo, m);

    // Upside-down houses along the pavements (the road frame flips them for us).
    const houses = Array.from({ length: 8 }, (_, i) => buildHouse(rnd.fork(i + 40), walls[i % walls.length]));
    const trees = [buildRoundTree(rnd, '#f08a2e'), buildRoundTree(rnd, null)];
    for (const side of [-1, 1]) {
      let s = range.start + 4;
      while (s < range.end - 8) {
        const house = rnd.pick(houses);
        const fr = this.path.sample(s, this.frame);
        const x = side * (fr.width / 2 + KERB_WIDTH + PAVEMENT_WIDTH + WALL_WIDTH + 1 + house.depth / 2);
        const mm = this.roadMatrix(s + house.width / 2, x, -1.4, side > 0 ? Math.PI / 2 : -Math.PI / 2);
        this.place(house.geometry, mm);
        s += house.width + rnd.range(2, 8);
      }
    }
    for (let s = range.start + 6; s < range.end; s += rnd.range(12, 18)) {
      this.sideProp(rnd.pick(trees), s, rnd.chance(0.5) ? -1 : 1, 1.2, 0.18, 2.2, 3.5);
    }
    // A Ferris wheel on the ceiling, far off to one side.
    const wheel = new ModelKit();
    const R = 18;
    wheel.add(new THREE.TorusGeometry(R, 0.4, 5, 32), '#f6f0e4');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      wheel.box(0.25, R, 0.25, '#d8643a', { position: [Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0], rotation: [0, 0, a - Math.PI / 2] });
      wheel.box(2, 1.6, 1.6, ['#d8463a', '#f4d23b', '#3e6fa8', '#4f9a5a'][i % 4], { position: [Math.cos(a) * R, Math.sin(a) * R - 1, 0] });
    }
    wheel.box(1, R + 4, 1, '#d8643a', { position: [0, -(R + 4) / 2, 0] });
    const wheelObj = new THREE.Mesh(wheel.build(0.05, 5), this.material);
    wheelObj.matrixAutoUpdate = false;
    wheelObj.matrix.copy(this.roadMatrix(mid + 30, 34, R + 5, 0));
    this.group.add(wheelObj);
  }

  private dressArches(s0: number, s1: number, rnd: Random): void {
    const arches = [0, 1, 2].map((i) => buildFlowerArch(rnd.fork(i), 9.5, 7.5));
    const bush = buildBush(rnd, '#e8559a');
    const bush2 = buildBush(rnd, '#f08a2e');
    for (let s = s0 + 20; s < s1 - 10; s += 13) {
      const m = this.roadMatrix(s, 0, 0.18, 0);
      this.place(rnd.pick(arches), m);
      this.block(m, new THREE.Vector3(-9.5, 5, 0), 2.2);
      this.block(m, new THREE.Vector3(9.5, 5, 0), 2.2);
      this.block(m, new THREE.Vector3(0, 7.5, 0), 2.4);
    }
    for (let s = s0 + 10; s < s1 - 10; s += rnd.range(6, 10)) this.sideProp(rnd.chance(0.5) ? bush : bush2, s, rnd.chance(0.5) ? -1 : 1, 0.9);
  }

  private dressChute(s0: number, s1: number, rnd: Random): void {
    // Teal water-slide walls following the road on both sides.
    const kit = new ModelKit();
    const f = createFrame();
    const step = 4;
    for (let s = s0; s < s1; s += step) {
      this.path.sample(s + step / 2, f);
      const basis = new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent.clone().negate());
      const q = new THREE.Quaternion().setFromRotationMatrix(basis);
      const e = new THREE.Euler().setFromQuaternion(q);
      for (const side of [-1, 1]) {
        const x = side * (walkableHalfWidth(f.width, 0) + 2.2);
        const p = f.position.clone().addScaledVector(f.right, x).addScaledVector(f.up, 1.2);
        kit.box(3.2, 2.2, step + 0.05, s % 8 < 4 ? '#5fcfc8' : '#8fe0d8', { position: [p.x, p.y, p.z], rotation: [e.x, e.y, e.z] });
        const lip = f.position.clone().addScaledVector(f.right, x + side * 1.6).addScaledVector(f.up, 2.3);
        kit.box(0.4, 0.4, step + 0.05, '#f4fbf6', { position: [lip.x, lip.y, lip.z], rotation: [e.x, e.y, e.z] });
      }
    }
    this.place(kit.build(0.02, 3), new THREE.Matrix4());
    const lamp = buildLamp(rnd);
    for (let s = s0 + 8; s < s1; s += 24) this.sideProp(lamp, s, rnd.chance(0.5) ? -1 : 1, 0.6);
  }

  private dressBridge(s0: number, s1: number, rnd: Random): void {
    const lamp = buildLamp(rnd);
    for (let s = s0 + 6; s < s1 - 4; s += 22) {
      this.sideProp(lamp, s, -1, 0.5);
      this.sideProp(lamp, s + 11, 1, 0.5);
    }
    // Lighthouse on a rock inside the spiral.
    const f = this.path.sample((s0 + s1) / 2, createFrame());
    const centre = this.spiralCentre(s0, s1);
    const lh = new THREE.Matrix4().makeTranslation(centre.x, 0, centre.z);
    this.place(buildLighthouse(), lh);
    void f;
  }

  private dressLoop(s0: number, s1: number, rnd: Random): void {
    const kiosks = [0, 1, 2].map((i) => buildKiosk(rnd.fork(i)));
    for (let s = s0 + 6; s < s1 - 6; s += rnd.range(14, 22)) {
      this.sideProp(rnd.pick(kiosks), s, rnd.chance(0.5) ? -1 : 1, 1.8, 0.18, 2.2, 2);
    }
    // Floating book spines and a giant pencil beside the loop.
    const mid = this.path.sample((s0 + s1) / 2, createFrame());
    const books = ['#d8463a', '#3e6fa8', '#f4d23b', '#4f9a5a', '#e8559a', '#9a5bd6', '#2fb7b0'];
    for (let i = 0; i < 14; i++) {
      const g = new ModelKit().box(rnd.range(2, 3.5), rnd.range(14, 26), rnd.range(6, 9), rnd.pick(books), { position: [0, 0, 0] }).build(0.1, i);
      const pos = mid.position.clone().add(new THREE.Vector3(rnd.range(60, 110) * (i % 2 ? 1 : -1), rnd.range(-20, 50), rnd.range(-60, 60)));
      this.addFloater(g, pos, rnd.range(-0.3, 0.3), 0.02);
    }
    const pencil = buildCrayon('#f4d23b', 40);
    this.addFloater(pencil, mid.position.clone().add(new THREE.Vector3(-70, 60, 30)), 0.4, 0.01);
  }

  private dressGate(s0: number, s1: number, rnd: Random): void {
    const gate = buildBuntingGate(rnd, 9.8);
    for (let s = s0 + 30; s < s1 - 10; s += 45) this.place(gate, this.roadMatrix(s, 0, 0.18, 0));
    const lamp = buildLamp(rnd);
    for (let s = s0 + 10; s < s1; s += 18) this.sideProp(lamp, s, s % 36 < 18 ? -1 : 1, 0.5);
  }

  // ————— the wider world —————

  private dressBackground(rnd: Random): void {
    const bounds = this.path.bounds();
    const centre = bounds.getCenter(new THREE.Vector3());
    // Islands with villages on the sea.
    const islands = [0, 1, 2, 3].map((i) => buildIsland(rnd.fork(i), rnd.range(18, 34)));
    for (let i = 0; i < 16; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const d = rnd.range(380, 1100);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * d, 0, centre.z + Math.sin(a) * d);
      if (this.nearRoad(p, 90)) continue;
      const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd.range(0, 6)), new THREE.Vector3(1, 1, 1));
      this.place(rnd.pick(islands), m, false);
    }
    // Floating rocks and mini islands in the sky.
    const rocks = [0, 1, 2].map((i) => buildFloatingRock(rnd.fork(i + 10), rnd.range(5, 12)));
    for (let i = 0; i < 26; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const d = rnd.range(120, 520);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * d, rnd.range(60, 260), centre.z + Math.sin(a) * d);
      if (this.nearRoad(p, 45)) continue;
      this.addFloater(rnd.pick(rocks), p, rnd.range(-0.1, 0.1), 0.01);
    }
    // Crayons hanging in the sky.
    const crayonColours = ['#d8463a', '#3e6fa8', '#4f9a5a', '#e8559a', '#f08a2e', '#9a5bd6'];
    for (let i = 0; i < 10; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const d = rnd.range(200, 600);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * d, rnd.range(140, 320), centre.z + Math.sin(a) * d);
      if (this.nearRoad(p, 50)) continue;
      this.addFloater(buildCrayon(rnd.pick(crayonColours), rnd.range(16, 34)), p, rnd.range(-0.2, 0.2), 0);
    }
    // Clouds.
    const clouds = [0, 1, 2, 3].map((i) => buildCloud(rnd.fork(i + 30)));
    for (let i = 0; i < 22; i++) {
      const a = rnd.range(0, Math.PI * 2);
      const d = rnd.range(250, 1200);
      const p = new THREE.Vector3(centre.x + Math.cos(a) * d, rnd.range(120, 380), centre.z + Math.sin(a) * d);
      if (this.nearRoad(p, 60)) continue;
      const s = rnd.range(1, 2.4);
      const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd.range(0, 6)), new THREE.Vector3(s, s, s));
      this.place(rnd.pick(clouds), m, false);
    }
    // Paper boats.
    const boat = buildPaperBoat();
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Vector3(centre.x + rnd.range(-700, 700), 0.2, centre.z + rnd.range(-700, 700));
      const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd.range(0, 6)), new THREE.Vector3(2, 2, 2));
      this.place(boat, m, false);
    }
    // A pier under the start street so the town stands on something.
    const start = this.path.spanOf(0);
    if (start) {
      const pier = new ModelKit();
      const f = createFrame();
      for (let s = start.start; s < start.end - 20; s += 18) {
        this.path.sample(s, f);
        for (const side of [-1, 1]) {
          const x = side * (walkableHalfWidth(f.width, f.plaza) - 2);
          const p = f.position.clone().addScaledVector(f.right, x);
          pier.cylinder(1.2, 1.5, p.y, 8, '#b4aed0', { position: [p.x, p.y / 2 - 1, p.z] });
        }
      }
      this.place(pier.build(0.1, 2), new THREE.Matrix4(), false);
    }
  }

  private addFloater(geometry: THREE.BufferGeometry, position: THREE.Vector3, tilt: number, spin: number): void {
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.copy(position);
    mesh.rotation.set(tilt, Math.random() * 6, tilt * 0.5);
    this.group.add(mesh);
    this.floaters.push({ object: mesh, base: position.clone(), phase: Math.random() * 6, spin });
  }

  private nearRoad(p: THREE.Vector3, distance: number): boolean {
    const f = createFrame();
    for (let s = 0; s < this.path.length; s += 10) {
      if (this.path.sample(s, f).position.distanceTo(p) < distance) return true;
    }
    return false;
  }

  private maxY(s0: number, s1: number): number {
    const f = createFrame();
    let y = -Infinity;
    for (let s = s0; s <= s1; s += 2) y = Math.max(y, this.path.sample(s, f).position.y);
    return y;
  }

  private findMostVertical(s0: number, s1: number): number {
    const r = this.findVerticalRange(s0, s1);
    return (r.start + r.end) / 2;
  }

  private findVerticalRange(s0: number, s1: number): { start: number; end: number } {
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

  private findInvertedRange(s0: number, s1: number): { start: number; end: number } {
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

  private spiralCentre(s0: number, s1: number): THREE.Vector3 {
    const f = createFrame();
    const c = new THREE.Vector3();
    let n = 0;
    for (let s = s0 + 150; s < s1 - 60; s += 4) {
      c.add(this.path.sample(s, f).position);
      n++;
    }
    return c.divideScalar(Math.max(1, n)).setY(0);
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

  /** Slow bobbing and spinning of the floating sky props. */
  update(time: number): void {
    for (const f of this.floaters) {
      f.object.position.y = f.base.y + Math.sin(time * 0.3 + f.phase) * 2;
      f.object.rotation.y += f.spin * 0.016;
    }
  }
}

export { shade };
