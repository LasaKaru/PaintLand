import * as THREE from 'three';
import { RoadPath, createFrame } from '../road/RoadPath';
import { KERB_WIDTH } from '../road/RoadMesh';
import { HumanModel, randomLook, DEFAULT_HUMAN_LOOK, type HumanPose } from '../models/Human';
import { VEHICLES, VehicleModel, tuningFor } from '../models/Vehicles';
import { RoverController } from './RoverController';
import { Autopilot } from './Autopilot';
import type { Note } from './Collectibles';
import type { MissionDef } from './Missions';
import { Random, hashString } from '../core/Random';
import { PaintMaterial } from '../render/PaintMaterial';
import { ModelKit } from '../models/ModelKit';
import { PALETTE } from './Profile';

interface Walker {
  model: HumanModel;
  s: number;
  x: number;
  dir: number;
  speed: number;
  s0: number;
  s1: number;
  pause: number;
  pose: HumanPose;
}

export interface Giver {
  mission: MissionDef;
  model: HumanModel;
  marker: THREE.Mesh;
  s: number;
  x: number;
}

export interface Car {
  ctrl: RoverController;
  pilot: Autopilot;
  model: VehicleModel;
  driver: HumanModel;
  rival: boolean;
}

export interface Marker {
  mesh: THREE.Mesh;
  s: number;
  x: number;
  h: number;
  kind: 'stamp' | 'visit';
  taken: boolean;
}

/**
 * Everyone else in the world (docs/04 §7): pedestrians strolling the pavements
 * (upside down on ceiling streets too), mission givers with a floating "!",
 * AI traffic driving the route, and mission markers.
 */
export class Population {
  readonly group = new THREE.Group();
  readonly walkers: Walker[] = [];
  readonly givers: Giver[] = [];
  readonly cars: Car[] = [];
  readonly markers: Marker[] = [];
  /** Off in time trials: no traffic on the road. */
  trafficEnabled = true;
  private readonly frame = createFrame();
  private readonly basis = new THREE.Matrix4();
  private readonly yq = new THREE.Quaternion();
  private readonly tmp = new THREE.Vector3();
  private readonly markerGeo: THREE.BufferGeometry;
  private readonly doneGeo: THREE.BufferGeometry;
  private readonly stampGeo: THREE.BufferGeometry;

  constructor(private readonly path: RoadPath, chapterId: string) {
    this.group.name = 'population';
    const rnd = new Random(hashString(chapterId + ':people'));
    // Pedestrians spread along the whole route.
    const count = 16;
    for (let i = 0; i < count; i++) {
      const s = ((i + rnd.next()) / count) * (path.length - 60) + 30;
      const side = rnd.chance(0.5) ? -1 : 1;
      const f = path.sample(s, this.frame);
      const x = side * (f.width / 2 + KERB_WIDTH + 0.8 + rnd.range(0, 1.4));
      const model = new HumanModel(randomLook(() => rnd.next()));
      this.group.add(model.root);
      this.walkers.push({ model, s, x, dir: rnd.chance(0.5) ? 1 : -1, speed: rnd.range(0.9, 1.6), s0: s - rnd.range(15, 40), s1: s + rnd.range(15, 40), pause: rnd.range(0, 4), pose: 'walk' });
    }
    // Marker shapes.
    this.markerGeo = new ModelKit()
      .box(0.35, 1.1, 0.35, '#f4d23b', { position: [0, 0.75, 0] })
      .blob(0.22, '#f4d23b', { position: [0, 0, 0], detail: 1 })
      .build(0, 1);
    this.doneGeo = new ModelKit().box(0.3, 0.7, 0.3, '#5dbb3f', { position: [-0.25, 0.3, 0], rotation: [0, 0, 0.7] }).box(0.3, 1.2, 0.3, '#5dbb3f', { position: [0.2, 0.55, 0], rotation: [0, 0, -0.5] }).build(0, 1);
    this.stampGeo = new ModelKit().box(1.2, 1.5, 0.12, '#f6f0e4').box(0.9, 1.1, 0.14, '#e8559a').blob(0.25, '#f4d23b', { position: [0, 0, 0.1], detail: 0 }).build(0, 1);

    // AI traffic.
    const trafficRnd = new Random(hashString(chapterId + ':traffic'));
    const bodies = VEHICLES.filter((v) => v.id !== 'scooter');
    for (let i = 0; i < 3; i++) this.addCar(trafficRnd, bodies[(i + 1) % bodies.length].id, 80 + i * 260, false);
  }

  private addCar(rnd: Random, id: string, s: number, rival: boolean): Car {
    const def = VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
    const look = { ...def.defaultLook, body: rnd.pick(PALETTE.paint), accent: rnd.pick(PALETTE.paint) };
    const model = new VehicleModel(def, look);
    const driver = new HumanModel(randomLook(() => rnd.next()));
    driver.root.scale.multiplyScalar(0.85);
    model.seat.add(driver.root);
    driver.root.position.set(0, -0.45, 0);
    this.group.add(model.root);
    const ctrl = new RoverController(this.path);
    ctrl.tuning = tuningFor(id);
    ctrl.reset(s);
    ctrl.cruise = true;
    ctrl.v = 20;
    const lane = rnd.chance(0.5) ? -3 : 3;
    ctrl.x = lane;
    const pilot = new Autopilot({ speed: rnd.range(22, 34), lane, followNotes: false, showOff: false });
    const car = { ctrl, pilot, model, driver, rival };
    this.cars.push(car);
    return car;
  }

  /** Put mission givers on the pavements (only for missions not yet done, plus completed ones with a tick). */
  setGivers(missions: MissionDef[], done: (id: string) => boolean): void {
    for (const g of this.givers) {
      g.model.root.removeFromParent();
      g.marker.removeFromParent();
    }
    this.givers.length = 0;
    for (const m of missions) {
      const span = this.path.spanOf(m.giver.district);
      if (!span) continue;
      const s = Math.min(span.end - 5, span.start + m.giver.offset);
      const f = this.path.sample(s, this.frame);
      const x = m.giver.side * (f.width / 2 + KERB_WIDTH + 1.3);
      const model = new HumanModel({ ...DEFAULT_HUMAN_LOOK, scarf: null, ...m.giver.look });
      const marker = new THREE.Mesh(done(m.id) ? this.doneGeo : this.markerGeo, new PaintMaterial({ vertexColors: true, emissive: 0.6 }));
      this.group.add(model.root, marker);
      this.givers.push({ mission: m, model, marker, s, x });
    }
  }

  /** Spawn stamps (collect) or a visit marker for the active mission. */
  setMarkers(kind: 'stamp' | 'visit' | null, district: number, count: number, visitS?: number): void {
    for (const m of this.markers) m.mesh.removeFromParent();
    this.markers.length = 0;
    const span = this.path.spanOf(district);
    if (!kind || !span) return;
    const mat = new PaintMaterial({ vertexColors: true, emissive: 0.5 });
    if (kind === 'visit') {
      const s = visitS ?? (span.start + span.end) / 2;
      const f = this.path.sample(s, this.frame);
      const mesh = new THREE.Mesh(this.markerGeo, mat);
      mesh.scale.setScalar(2);
      this.group.add(mesh);
      this.markers.push({ mesh, s, x: f.width / 2 + KERB_WIDTH + 1.4, h: 3, kind, taken: false });
      return;
    }
    const rnd = new Random(district * 17 + count);
    for (let i = 0; i < count; i++) {
      const s = span.start + ((i + 0.5) / count) * (span.end - span.start);
      const mesh = new THREE.Mesh(this.stampGeo, mat);
      this.group.add(mesh);
      this.markers.push({ mesh, s, x: rnd.range(-4, 4), h: rnd.chance(0.4) ? 4.5 : 1.6, kind, taken: false });
    }
  }

  /** A race rival that starts next to the player. */
  spawnRival(s: number, x: number, speed: number, vehicle: string): Car {
    this.removeRival();
    const car = this.addCar(new Random(Math.floor(s)), vehicle, s, true);
    car.ctrl.x = x;
    car.ctrl.v = 0;
    car.pilot.options = { speed, lane: x, followNotes: true, showOff: false };
    return car;
  }

  removeRival(): void {
    for (let i = this.cars.length - 1; i >= 0; i--) {
      if (!this.cars[i].rival) continue;
      this.cars[i].model.root.removeFromParent();
      this.cars.splice(i, 1);
    }
  }

  get rival(): Car | undefined {
    return this.cars.find((c) => c.rival);
  }

  /** Fixed-step AI driving. */
  step(dt: number, notes: readonly Note[], playerS: number, playerX: number): void {
    for (const car of this.cars) {
      if (!this.trafficEnabled && !car.rival) continue;
      const input = car.pilot.drive(car.ctrl, notes, dt, [{ s: playerS, x: playerX }, ...this.cars.filter((c) => c !== car).map((c) => ({ s: c.ctrl.s, x: c.ctrl.x }))]);
      car.ctrl.step(dt, input);
      if (!car.rival && car.ctrl.s > this.path.length - 3) {
        car.ctrl.reset(4);
        car.ctrl.cruise = true;
        car.ctrl.v = 20;
        car.ctrl.x = car.pilot.options.lane;
      }
    }
  }

  obstacles(): { s: number; x: number }[] {
    return this.cars.map((c) => ({ s: c.ctrl.s, x: c.ctrl.x }));
  }

  private place(obj: THREE.Object3D, s: number, x: number, h: number, yaw: number): void {
    const f = this.path.sample(s, this.frame);
    this.basis.makeBasis(f.right, f.up, this.tmp.copy(f.tangent).negate());
    obj.quaternion.setFromRotationMatrix(this.basis).multiply(this.yq.setFromAxisAngle(_y, yaw));
    obj.position.copy(f.position).addScaledVector(f.right, x).addScaledVector(f.up, h);
  }

  /** Per render frame: walk, animate, and hide what is far away. */
  update(dt: number, time: number, focusS: number, focusX: number, alpha: number): void {
    const near = 170;
    for (const w of this.walkers) {
      const visible = Math.abs(w.s - focusS) < near;
      w.model.root.visible = visible;
      if (!visible) continue;
      const playerClose = Math.abs(w.s - focusS) < 7 && Math.abs(w.x - focusX) < 6;
      if (w.pause > 0) {
        w.pause -= dt;
        w.pose = playerClose ? 'wave' : 'idle';
      } else {
        w.s += w.dir * w.speed * dt;
        w.pose = 'walk';
        if (w.s > w.s1 || w.s < w.s0) {
          w.dir = -w.dir;
          w.pause = 1 + Math.random() * 3;
        }
      }
      this.place(w.model.root, w.s, w.x, 0.18, w.dir > 0 ? 0 : Math.PI);
      w.model.animate(dt, w.pose, w.pose === 'walk' ? w.speed : 0, time);
    }
    for (const g of this.givers) {
      const visible = Math.abs(g.s - focusS) < near + 60;
      g.model.root.visible = g.marker.visible = visible;
      if (!visible) continue;
      const close = Math.abs(g.s - focusS) < 10;
      this.place(g.model.root, g.s, g.x, 0.18, g.x > 0 ? -Math.PI / 2 : Math.PI / 2);
      g.model.animate(dt, close ? 'wave' : 'idle', 0, time);
      this.place(g.marker, g.s, g.x, 2.4 + Math.sin(time * 3) * 0.15, time * 1.5);
    }
    for (const m of this.markers) {
      m.mesh.visible = !m.taken && Math.abs(m.s - focusS) < 300;
      if (m.mesh.visible) this.place(m.mesh, m.s, m.x, m.h + Math.sin(time * 2 + m.s) * 0.2, time * 1.2);
    }
    for (const car of this.cars) {
      const st = car.ctrl.lerpState(alpha);
      const visible = (this.trafficEnabled || car.rival) && Math.abs(st.s - focusS) < 400;
      car.model.root.visible = visible;
      if (!visible) continue;
      this.place(car.model.root, st.s, st.x, st.h + 0.02, -st.yaw);
      car.model.roll(car.ctrl.v * dt);
      car.model.setBrakeLights(car.ctrl.braking);
      car.driver.animate(dt, 'sit', 0, time);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}

const _y = new THREE.Vector3(0, 1, 0);
