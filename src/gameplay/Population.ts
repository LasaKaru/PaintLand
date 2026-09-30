import * as THREE from 'three';
import { RoadPath, createFrame } from '../road/RoadPath';
import { KERB_WIDTH } from '../road/RoadMesh';
import { HumanModel, DEFAULT_HUMAN_LOOK, type HumanLook, type HumanPose } from '../models/Human';
import { personOf, regionFor, type RegionId } from '../world/Peoples';
import { AnimalModel, COATS, type AnimalPose, type Species } from '../models/Animals';
import { kindOf, presence, speechBubble, type Kind } from '../world/TownLife';
import { StandIns } from '../world/StandIns';
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
  /** Built the first time the walker comes near (so long routes load quickly). */
  model: HumanModel | null;
  look: HumanLook;
  /** A companion walks beside this walker (a child with a parent, or friends). */
  lead: Walker | null;
  /** The companion walking beside this lead walker, if any. */
  mate: Walker | null;
  side: number;
  s: number;
  x: number;
  dir: number;
  speed: number;
  s0: number;
  s1: number;
  pause: number;
  pose: HumanPose;
  kind: Kind;
  /** Out for a run (a few adults jog up and down the pavement). */
  jogger: boolean;
  /** Held while stopped: a phone, a stretch, or chatting with your companion. */
  still: HumanPose;
  /** A child's hop: height above the pavement and upward speed. */
  hop: number;
  vy: number;
  /** 0..1, fixed: who stays out late and who carries an umbrella. */
  temper: number;
}

/** An animal by the road: a stray dog, a cat, a cow, deer in Japan, kangaroos in Australia. */
export interface RoadAnimal {
  species: Species;
  coat: string;
  model: AnimalModel | null;
  s: number;
  x: number;
  home: number;
  side: number;
  state: 'rest' | 'wander' | 'flee';
  t: number;
  dir: number;
  rest: AnimalPose;
  pose: AnimalPose;
}

/** Which animals live along the roads of each region (and how many per district). */
const ROAD_ANIMALS: Record<RegionId, [Species, number][]> = {
  lanka: [['dog', 2], ['cow', 1]],
  india: [['cow', 2], ['dog', 1]],
  japan: [['deer', 1], ['cat', 1]],
  korea: [['cat', 1], ['dog', 1]],
  china: [['cat', 1], ['dog', 1]],
  seasia: [['dog', 1], ['cat', 1]],
  himalaya: [['cow', 1], ['dog', 1]],
  mena: [['cat', 2]],
  europe: [['dog', 1], ['cat', 1]],
  americas: [['dog', 1]],
  oceania: [['kangaroo', 2]],
  mixed: [['dog', 1], ['cat', 1]],
};

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
  readonly animals: RoadAnimal[] = [];
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

  /** Things people do when they stop on their own, by who they are. */
  private static readonly STILLS: Record<Kind, HumanPose[]> = {
    adult: ['idle', 'phone', 'phone', 'stretch', 'point'],
    child: ['cheer', 'point', 'wave'],
    elder: ['idle', 'point'],
    wheels: ['idle', 'phone', 'point'],
  };
  private readonly bubbles: THREE.Mesh[] = [];
  /** The hour and the rain, set by the game each frame (umbrellas, lanterns, quiet nights). */
  env = { hour: 12, rain: 0 };

  /** Most pedestrians on one route at the normal crowd setting (their models are built only when near). */
  static readonly MAX_WALKERS = 110;
  /** Crowd setting (Settings → Graphics → Crowds), used when a route is built. */
  static density = 1;
  /** Beyond this distance along the road, people are drawn as cheap stand-ins. */
  static readonly FULL_MODEL = 60;
  private readonly standIns = new StandIns(96);
  private readonly dummy = new THREE.Object3D();
  /** The crowd's own dice (seeded by the chapter, so the same road behaves the same every time). */
  private readonly dice: Random;

  constructor(private readonly path: RoadPath, private readonly chapterId: string, private readonly districtIds: string[] = []) {
    this.group.name = 'population';
    this.group.add(this.standIns.group);
    const rnd = new Random(hashString(chapterId + ':people'));
    this.dice = new Random(hashString(chapterId + ':crowd'));
    const r = () => rnd.next();
    // Pedestrians in every district, dressed as the people who live there: people on their own,
    // friends walking together, and a parent with a child.
    const spans = path.length > 0 ? this.districtSpans() : [];
    for (const sp of spans) {
      const region = regionFor(chapterId, districtIds[sp.district]);
      const d = Population.density;
      const groups = Math.max(2, Math.round(Math.max(3, Math.min(9, Math.round((sp.end - sp.start) / 110))) * d));
      for (let g = 0; g < groups && this.walkers.length < Math.round(Population.MAX_WALKERS * d) - 1; g++) {
        const s = sp.start + ((g + 0.2 + rnd.next() * 0.6) / groups) * (sp.end - sp.start);
        const side = rnd.chance(0.5) ? -1 : 1;
        const f = path.sample(Math.min(path.length - 1, Math.max(1, s)), this.frame);
        const x = side * (f.width / 2 + KERB_WIDTH + 0.8 + rnd.range(0, 1.2));
        const kind = rnd.next();
        const lead = this.addWalker(personOf(region, r, { age: kind < 0.22 ? 'adult' : undefined }).look, s, x, side, rnd, null);
        // Some people on their own are out for a run.
        if (kind >= 0.4 && lead.kind === 'adult' && rnd.chance(0.25)) {
          lead.jogger = true;
          lead.speed = rnd.range(2.8, 3.6);
          lead.s0 = s - rnd.range(40, 70);
          lead.s1 = s + rnd.range(40, 70);
        }
        if (kind < 0.22) this.addWalker(personOf(region, r, { age: 'child', aids: false }).look, s, x, side, rnd, lead);
        else if (kind < 0.4) this.addWalker(personOf(region, r, { aids: false }).look, s, x, side, rnd, lead);
      }
    }
    // Animals by the road, from the same region's list (kangaroos only in Australia; now and then an elephant in Sri Lanka).
    const arnd = new Random(hashString(chapterId + ':animals'));
    for (const sp of spans) {
      const region = regionFor(chapterId, districtIds[sp.district]);
      for (const [kind, n] of ROAD_ANIMALS[region]) {
        let species: Species = kind === 'kangaroo' && chapterId !== 'australia' ? 'dog' : kind;
        if (species === 'cow' && region === 'lanka' && arnd.chance(0.2)) species = 'elephant';
        for (let i = 0; i < n; i++) {
          const s = sp.start + arnd.range(0.1, 0.9) * (sp.end - sp.start);
          const side = arnd.chance(0.5) ? -1 : 1;
          const f = path.sample(Math.min(path.length - 1, Math.max(1, s)), this.frame);
          const far = species === 'elephant' ? 7 : species === 'cow' || species === 'kangaroo' || species === 'deer' ? 4 : 2;
          this.animals.push({
            species,
            coat: arnd.pick(COATS[species]),
            model: null,
            s,
            x: side * (f.width / 2 + KERB_WIDTH + far + arnd.range(0, 2)),
            home: s,
            side,
            state: 'rest',
            t: arnd.range(2, 10),
            dir: arnd.chance(0.5) ? 1 : -1,
            rest: arnd.pick(species === 'cow' || species === 'deer' || species === 'elephant' ? ['eat', 'idle', 'lie'] as AnimalPose[] : ['sit', 'lie', 'idle'] as AnimalPose[]),
            pose: 'idle',
          });
        }
      }
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

  /** Where each district's stretch of road starts and ends. */
  private districtSpans(): { district: number; start: number; end: number }[] {
    const out: { district: number; start: number; end: number }[] = [];
    const n = Math.max(1, this.districtIds.length);
    for (let d = 0; d < n; d++) {
      const sp = this.path.spanOf(d);
      if (sp && sp.end - sp.start > 20) out.push({ district: d, start: sp.start + 10, end: sp.end - 10 });
    }
    // A route without district spans (a custom road): spread along the whole length.
    if (!out.length && this.path.length > 60) out.push({ district: 0, start: 30, end: this.path.length - 30 });
    return out;
  }

  private addWalker(look: HumanLook, s: number, x: number, side: number, rnd: Random, lead: Walker | null): Walker {
    const slow = look.aid === 'cane' || (look.stoop ?? 0) > 0 ? 0.55 : look.aid === 'wheelchair' ? 0.8 : 1;
    const w: Walker = {
      model: null,
      look,
      lead,
      mate: null,
      side,
      s,
      x: lead ? lead.x + (side > 0 ? 0.75 : -0.75) : x,
      dir: lead ? lead.dir : rnd.chance(0.5) ? 1 : -1,
      speed: (lead ? lead.speed : rnd.range(0.9, 1.5)) * (lead ? 1 : slow),
      s0: s - rnd.range(15, 40),
      s1: s + rnd.range(15, 40),
      pause: rnd.range(0, 4),
      pose: 'walk',
      kind: kindOf(look),
      jogger: false,
      still: 'idle',
      hop: 0,
      vy: 0,
      temper: lead ? lead.temper : rnd.next(),
    };
    if (lead) lead.mate = w;
    this.walkers.push(w);
    return w;
  }

  private addCar(rnd: Random, id: string, s: number, rival: boolean): Car {
    const def = VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
    const look = { ...def.defaultLook, body: rnd.pick(PALETTE.paint), accent: rnd.pick(PALETTE.paint) };
    const model = new VehicleModel(def, look);
    const driver = new HumanModel(personOf(regionFor(this.chapterId), () => rnd.next(), { age: 'adult', aids: false }).look);
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
    let bubbles = 0;
    const wet = this.env.rain > 0.3;
    const dark = this.env.hour >= 19 || this.env.hour < 6;
    this.standIns.begin();
    for (const w of this.walkers) {
      // At night most people are at home (a family goes in together).
      const head = w.lead ?? w;
      const withChild = head.kind === 'child' || head.mate?.kind === 'child';
      const out = head.temper <= presence(this.env.hour, withChild ? 'child' : 'adult');
      const visible = Math.abs(w.s - focusS) < near && out;
      if (w.model) w.model.root.visible = visible;
      if (!visible) continue;
      // Further off: a cheap stand-in walking along (the full model is built only when close).
      if (Math.abs(w.s - focusS) > Population.FULL_MODEL) {
        if (w.model) w.model.root.visible = false;
        if (w.pause <= 0 && !w.lead) {
          w.s += w.dir * w.speed * dt;
          if (w.s > w.s1 || w.s < w.s0) w.dir = -w.dir;
        } else if (w.pause > 0 && !w.lead) w.pause -= dt;
        else if (w.lead) w.s = w.lead.s - w.lead.dir * 0.4;
        this.place(this.dummy, w.s, w.x, 0.18, w.dir > 0 ? 0 : Math.PI);
        const h = w.look.height ?? 1;
        this.dummy.scale.set(h * (w.look.build ?? 1), h, h * (w.look.build ?? 1));
        this.dummy.updateMatrix();
        this.standIns.add(this.dummy.matrix, w.look.top, w.look.skin, w.look.hat === 'hijab' || w.look.hat === 'turban' ? w.look.scarf ?? w.look.top : w.look.hair);
        continue;
      }
      if (!w.model) {
        w.model = new HumanModel(w.look);
        this.group.add(w.model.root);
      }
      w.model.root.visible = true;
      const playerClose = Math.abs(w.s - focusS) < 7 && Math.abs(w.x - focusX) < 6;
      const want = wet && w.temper < 0.75 && !w.jogger ? 'umbrella' : dark && w.temper > 0.55 ? 'lantern' : null;
      if (w.model.carry !== want) w.model.setCarry(want, UMBRELLAS[Math.floor(w.temper * 97) % UMBRELLAS.length]);
      let yaw = w.dir > 0 ? 0 : Math.PI;
      if (w.lead) {
        // Walk beside your companion; when they stop, chat (or wave at the player).
        w.s = w.lead.s - w.lead.dir * 0.4;
        w.dir = w.lead.dir;
        w.pause = w.lead.pause;
        const talking = w.lead.pose === 'talk' || w.lead.pose === 'listen';
        w.pose = w.lead.pose === 'walk' ? 'walk' : playerClose ? 'wave' : talking ? (w.lead.pose === 'talk' ? 'listen' : 'talk') : 'idle';
        if (talking && !playerClose) yaw = w.x > w.lead.x ? Math.PI / 2 : -Math.PI / 2;
        if (w.pose === 'listen' && Math.sin(time * 0.7 + w.s) > 0.93) w.pose = 'laugh';
        // Children hop and skip beside their parent.
        if (w.kind === 'child' && w.pose === 'walk' && w.hop <= 0 && this.dice.next() < dt * 0.6) w.vy = 3.2;
      } else if (w.pause > 0) {
        w.pause -= dt;
        const partner = w.mate;
        if (playerClose) w.pose = 'wave';
        else if (partner) {
          // Friends and families stop for a chat, taking turns to talk.
          w.pose = Math.sin(time * 0.9 + w.s) > 0 ? 'talk' : 'listen';
          yaw = partner.x > w.x ? -Math.PI / 2 : Math.PI / 2;
        } else w.pose = w.still;
      } else {
        w.s += w.dir * w.speed * dt;
        w.pose = w.jogger ? 'run' : 'walk';
        const turn = w.s > w.s1 || w.s < w.s0;
        // Now and then people stop along the way (joggers stop to stretch at the ends).
        if (turn || (!w.jogger && this.dice.next() < dt * 0.04)) {
          if (turn) w.dir = -w.dir;
          w.pause = w.jogger ? (turn ? 3 + this.dice.next() * 3 : 0) : 2 + this.dice.next() * 5;
          w.still = w.jogger ? 'stretch' : Population.STILLS[w.kind][Math.floor(this.dice.next() * Population.STILLS[w.kind].length)];
        }
      }
      if (w.vy > 0 || w.hop > 0) {
        w.vy -= 14 * dt;
        w.hop = Math.max(0, w.hop + w.vy * dt);
        if (w.hop <= 0) w.vy = 0;
        else w.pose = 'air';
      }
      this.place(w.model.root, w.s, w.x, 0.18 + w.hop, yaw);
      w.model.animate(dt, w.pose, w.pose === 'walk' || w.pose === 'run' ? w.speed : 0, time);
      if (w.pose === 'talk' && bubbles < 6 && Math.abs(w.s - focusS) < 40) {
        if (!this.bubbles[bubbles]) this.group.add((this.bubbles[bubbles] = speechBubble()));
        const b = this.bubbles[bubbles];
        b.visible = true;
        this.place(b, w.s, w.x, 0.18 + (w.kind === 'wheels' ? 1.85 : 2.4) * (w.look.height ?? 1) + Math.sin(time * 3 + bubbles) * 0.05, 0);
        bubbles++;
      }
    }
    this.standIns.end();
    for (let i = bubbles; i < this.bubbles.length; i++) this.bubbles[i].visible = false;
    for (const a of this.animals) this.updateAnimal(a, dt, time, focusS, focusX);
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

  /** Animals rest, amble about near home, and get out of the way when you come close. */
  private updateAnimal(a: RoadAnimal, dt: number, time: number, focusS: number, focusX: number): void {
    const visible = Math.abs(a.s - focusS) < 150;
    if (a.model) a.model.root.visible = visible;
    if (!visible) return;
    if (!a.model) {
      a.model = new AnimalModel(a.species, a.coat);
      this.group.add(a.model.root);
    }
    a.t -= dt;
    const close = Math.abs(a.s - focusS) < 9 && Math.abs(a.x - focusX) < 6;
    if (close && a.state !== 'flee' && a.species !== 'elephant' && a.species !== 'cow') {
      a.state = 'flee';
      a.t = 1.5;
    }
    if (a.t <= 0) {
      a.state = a.state === 'rest' ? 'wander' : 'rest';
      a.t = a.state === 'rest' ? 4 + this.dice.next() * 10 : 3 + this.dice.next() * 6;
      if (a.state === 'wander') a.dir = Math.abs(a.s - a.home) > 8 ? Math.sign(a.home - a.s) : this.dice.next() < 0.5 ? 1 : -1;
    }
    let yaw = a.dir > 0 ? 0 : Math.PI;
    const walk = a.species === 'elephant' || a.species === 'cow' ? 0.6 : a.species === 'kangaroo' ? 1.8 : 1.1;
    if (a.state === 'wander') {
      a.s += a.dir * walk * dt;
      a.pose = a.species === 'kangaroo' ? 'hop' : 'walk';
    } else if (a.state === 'flee') {
      // Away from the road.
      if (Math.abs(a.x) < 24) a.x += a.side * 4 * dt;
      yaw = a.side > 0 ? -Math.PI / 2 : Math.PI / 2;
      a.pose = a.species === 'kangaroo' ? 'hop' : 'run';
    } else a.pose = a.rest;
    this.place(a.model.root, a.s, a.x, 0.18, yaw);
    a.model.animate(dt, a.pose, a.state === 'wander' ? walk : a.state === 'flee' ? 4 : 0, time);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}

const _y = new THREE.Vector3(0, 1, 0);
const UMBRELLAS = ['#e0432f', '#3e6fa8', '#f4d23b', '#2d8a5a', '#e8559a', '#2b2622', '#f08a2e'];
