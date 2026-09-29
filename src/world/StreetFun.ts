import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { HumanModel } from '../models/Human';
import { PaintMaterial } from '../render/PaintMaterial';
import { Random } from '../core/Random';
import { BowlOver, CricketMatch, PITCHES, PITCH_LENGTH, type Shot } from '../gameplay/Cricket';
import { FOOD_STALLS, type FoodId } from '../gameplay/Bazaar';
import { personOf, type RegionId } from './Peoples';
import type { AreaZone } from './FreeRoamArea';
import type { FreeWorld } from '../gameplay/FreeRoam';

let pitchMat: PaintMaterial | null = null;
const mat = (): PaintMaterial => (pitchMat ??= new PaintMaterial({ vertexColors: true, flat: true }));

/** Stumps with bails (origin at the ground, middle stump). */
function stumps(k: ModelKit, x: number, z: number, yaw: number): void {
  const r: [number, number] = [Math.cos(yaw), -Math.sin(yaw)];
  for (const o of [-0.11, 0, 0.11]) k.cylinder(0.018, 0.018, 0.72, 5, '#f2e3c2', { position: [x + r[0] * o, 0.36, z + r[1] * o] });
  k.box(0.26, 0.03, 0.03, '#e0903a', { position: [x, 0.73, z], rotation: [0, yaw, 0] });
}

/** A cricket bat: handle at the origin, the blade along +Y. */
export function buildBat(): THREE.BufferGeometry {
  return new ModelKit()
    .cylinder(0.02, 0.02, 0.28, 6, '#c8323a', { position: [0, 0.14, 0] })
    .box(0.11, 0.56, 0.04, '#e8c98a', { position: [0, 0.56, 0], pattern: Pattern.Planks })
    .build(0);
}

/** A tennis ball taped up for street cricket. */
function buildBall(): THREE.BufferGeometry {
  return new ModelKit().blob(0.045, '#f4d23b', { detail: 1 }).build(0);
}

/**
 * A street cricket pitch (docs/06): a dusty strip with stumps at both ends and
 * local kids playing their own game — a bowler running in, a wicketkeeper,
 * two fielders and a batter. Step into the ring at the batting end and press
 * E to take the bat for an over (see Cricket.ts); the batter steps aside to
 * field.
 */
export class CricketPitch {
  readonly group = new THREE.Group();
  readonly zone: AreaZone;
  /** The player's innings, when batting. */
  match: CricketMatch | null = null;
  /** Balls in the player's over since the game last looked. */
  readonly bowlShots: Shot[] = [];
  /** Shots in the player's innings since the game last looked. */
  readonly shots: Shot[] = [];
  /** Bowling an over to the kids: the over, the ball in play, and when the kid batter swings. */
  bowling: { over: BowlOver; match: CricketMatch; swingAt: number; rnd: Random } | null = null;
  /** The ring at the bowler's end. */
  readonly bowlZone: AreaZone;
  private readonly kids: HumanModel[] = [];
  private readonly ball: THREE.Mesh;
  private readonly kidBat: THREE.Mesh;
  private readonly kidMatch: CricketMatch;
  private readonly fwd: { x: number; z: number };
  private readonly right: { x: number; z: number };
  /** The hit ball in flight: start, end, height, time. */
  private flying: { from: THREE.Vector3; to: THREE.Vector3; up: number; t: number; dur: number; fielder: number } | null = null;
  /** The fielders' spots. */
  private readonly spots: { x: number; z: number }[];
  private readonly fielderAt: { x: number; z: number }[];
  /** Cheering after a big hit. */
  private joy = 0;

  constructor(
    readonly def: { id: string; area: string; x: number; z: number; yaw: number },
    region: RegionId,
    seed: number,
  ) {
    const { x, z, yaw } = def;
    this.fwd = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    this.right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const at = (s: number, w = 0): { x: number; z: number } => ({ x: x + this.fwd.x * s + this.right.x * w, z: z + this.fwd.z * s + this.right.z * w });
    // The strip and the stumps.
    const k = new ModelKit();
    const mid = at(PITCH_LENGTH / 2);
    k.box(2.6, 0.04, PITCH_LENGTH + 4, '#d9b98a', { position: [mid.x, 0.02, mid.z], rotation: [0, yaw, 0], pattern: Pattern.Matte });
    for (const s of [-0.9, PITCH_LENGTH + 0.9]) {
      const c = at(s);
      k.box(2.4, 0.045, 0.05, '#f6f0e4', { position: [c.x, 0.03, c.z], rotation: [0, yaw, 0] });
    }
    const back = at(-0.9);
    const far = at(PITCH_LENGTH + 1.2);
    stumps(k, back.x, back.z, yaw);
    stumps(k, far.x, far.z, yaw);
    const strip = new THREE.Mesh(k.build(0.01), mat());
    strip.receiveShadow = true;
    this.group.add(strip);
    // Kids: bowler, keeper, two fielders, a batter.
    const rnd = new Random(seed);
    const r = () => rnd.next();
    for (let i = 0; i < 5; i++) {
      const look = personOf(region, r, { age: i === 0 ? 'adult' : 'child', aids: false, faith: false }).look;
      // The bowler is a teenager.
      if (i === 0) look.height = 0.86;
      const m = new HumanModel(look);
      this.group.add(m.root);
      this.kids.push(m);
    }
    this.kidBat = new THREE.Mesh(buildBat(), mat());
    this.kidBat.rotation.x = Math.PI - 0.5;
    this.kids[4].hold(this.kidBat);
    this.ball = new THREE.Mesh(buildBall(), mat());
    this.group.add(this.ball);
    this.spots = [at(PITCH_LENGTH + 5), at(-3), at(9, 10), at(7, -11), at(0, 0.4)];
    this.fielderAt = this.spots.map((p) => ({ ...p }));
    this.kidMatch = new CricketMatch(new Random(seed + 1));
    const ring = at(1.6, 0);
    this.zone = { kind: 'cricket', label: '🏏', x: ring.x, z: ring.z, r: 1.8, colour: '#5dbb3f', spot: def.id };
    const bring = at(PITCH_LENGTH + 3.5, 0);
    this.bowlZone = { kind: 'cricket', label: '🎯', x: bring.x, z: bring.z, r: 1.6, colour: '#f4a13b', spot: `${def.id}:bowl` };
  }

  /** Where the player bowls from, facing the batter. */
  get bowlingEnd(): { x: number; z: number; yaw: number } {
    return { x: this.def.x + this.fwd.x * (PITCH_LENGTH + 0.8), z: this.def.z + this.fwd.z * (PITCH_LENGTH + 0.8), yaw: this.def.yaw + Math.PI };
  }

  /** Take the ball: the kid bowler goes to field. */
  startBowling(rnd: Random): BowlOver {
    const match = new CricketMatch(rnd);
    match.phase = 'result';
    match.t = 0;
    this.bowling = { over: new BowlOver(rnd), match, swingAt: 99, rnd };
    this.kids[0].root.visible = false;
    return this.bowling.over;
  }

  stopBowling(): void {
    this.bowling = null;
    this.kids[0].root.visible = true;
  }

  /** Bowl the ball (E): how good it is sets the kid batter's timing. */
  release(): number | null {
    const b = this.bowling;
    if (!b) return null;
    const a = b.over.release();
    if (a === null) return null;
    const m = b.match;
    m.ball = { flight: 0.85 + (1 - a) * 0.2, short: a < 0.3, onStumps: a > 0.45 || b.rnd.chance(0.25) };
    m.phase = 'flight';
    m.t = 0;
    m.swung = false;
    b.swingAt = m.ball.flight + b.over.batterError(a);
    return a;
  }

  /** Where the player stands to bat, facing the bowler. */
  get crease(): { x: number; z: number; yaw: number } {
    return { x: this.def.x + this.right.x * 0.35, z: this.def.z + this.right.z * 0.35, yaw: this.def.yaw };
  }

  /** The stumps and the kids are solid (the strip is open). */
  addColliders(world: FreeWorld): void {
    const back = { x: this.def.x - this.fwd.x * 0.9, z: this.def.z - this.fwd.z * 0.9 };
    const far = { x: this.def.x + this.fwd.x * (PITCH_LENGTH + 1.2), z: this.def.z + this.fwd.z * (PITCH_LENGTH + 1.2) };
    world.circle(back.x, back.z, 0.25);
    world.circle(far.x, far.z, 0.25);
  }

  start(rnd: Random): CricketMatch {
    this.match = new CricketMatch(rnd);
    this.kids[4].root.visible = false;
    return this.match;
  }

  /** The player swings: record the shot and send the ball flying. */
  swing(): Shot | null {
    const shot = this.match?.swing() ?? null;
    if (shot) {
      this.shots.push(shot);
      this.hit(shot);
    }
    return shot;
  }

  stop(): void {
    this.match = null;
    this.kids[4].root.visible = true;
  }

  /** A shot was played (by the player or the kid batter): send the ball flying and a fielder after it. */
  hit(shot: Shot): void {
    if (shot === 'bowled' || shot === 'dot') return;
    const dist = shot === 'six' ? 45 : shot === 'four' ? 32 : 12;
    const ang = (Math.random() - 0.5) * 2.2;
    // Back past the batter (towards the leg or off side) or straight down the ground.
    const dir = Math.random() < 0.5 ? -1 : 1;
    const dx = this.fwd.x * Math.cos(ang) * dir + this.right.x * Math.sin(ang);
    const dz = this.fwd.z * Math.cos(ang) * dir + this.right.z * Math.sin(ang);
    const from = new THREE.Vector3(this.def.x + this.fwd.x * 0.8, 0.8, this.def.z + this.fwd.z * 0.8);
    const to = new THREE.Vector3(from.x + dx * dist, 0.05, from.z + dz * dist);
    let fielder = 2;
    let best = Infinity;
    for (const i of [2, 3]) {
      const d = Math.hypot(this.fielderAt[i].x - to.x, this.fielderAt[i].z - to.z);
      if (d < best) {
        best = d;
        fielder = i;
      }
    }
    this.flying = { from, to, up: shot === 'six' ? 14 : shot === 'four' ? 1.5 : 4, t: 0, dur: shot === 'six' ? 2.2 : 1.4, fielder };
    if (shot === 'six' || shot === 'four') this.joy = 2.5;
  }

  update(dt: number, time: number): Shot | null {
    const bw = this.bowling;
    const m = bw ? bw.match : this.match ?? this.kidMatch;
    const auto = !this.match;
    let shot: Shot | null = null;
    if (bw) {
      // The player bowls: the ball flies from their hand; the kid batter swings when they judge it.
      bw.over.update(dt);
      if (m.phase === 'flight') {
        shot = m.step(dt);
        if (!shot && !m.swung && m.t >= bw.swingAt) shot = m.swing();
        if (shot) {
          bw.over.result(shot, m.last?.runs ?? 0);
          this.bowlShots.push(shot);
        }
      } else m.t += dt;
    } else {
      shot = m.step(dt);
      // The kid batter swings on their own, some good, some not.
      if (auto && m.phase === 'flight' && !m.swung && m.t > m.ball.flight - 0.25 + Math.sin(time * 7.3) * 0.2) shot = m.swing() ?? shot;
      if (auto && m.over) this.kidMatch.reset();
    }
    if (shot) this.hit(shot);
    this.joy = Math.max(0, this.joy - dt);
    const [bowler, keeper, f1, f2, batter] = this.kids;
    const face = (h: HumanModel, p: { x: number; z: number }, tx: number, tz: number): void => {
      h.root.position.set(p.x, 0, p.z);
      h.root.rotation.y = Math.atan2(-(tx - p.x), -(tz - p.z));
    };
    // The bowler runs in, bowls, and walks back.
    const s = m.phase === 'runup' ? PITCH_LENGTH + 5 - (m.t / 1.4) * 4.5 : m.phase === 'flight' ? PITCH_LENGTH + 0.5 : PITCH_LENGTH + 0.5 + Math.min(1, m.t / 1.6) * 4.5;
    const bp = { x: this.def.x + this.fwd.x * s, z: this.def.z + this.fwd.z * s };
    if (!bw) face(bowler, bp, this.def.x, this.def.z);
    bowler.swing = m.phase === 'flight' ? Math.min(1, m.t / 0.25) : 0;
    if (!bw) bowler.animate(dt, m.phase === 'runup' ? 'run' : m.phase === 'flight' && m.t < 0.4 ? 'bowl' : this.joy > 0 ? 'clap' : 'idle', m.phase === 'runup' ? 4 : 0, time);
    face(keeper, this.spots[1], this.def.x + this.fwd.x * 10, this.def.z + this.fwd.z * 10);
    keeper.animate(dt, this.joy > 0 ? 'cheer' : 'idle', 0, time);
    // Fielders: chase the ball, then drift back.
    for (const [i, f] of [[2, f1], [3, f2]] as [number, HumanModel][]) {
      const home = this.spots[i];
      const cur = this.fielderAt[i];
      const target = this.flying && this.flying.fielder === i ? this.flying.to : home;
      const dx = target.x - cur.x;
      const dz = target.z - cur.z;
      const d = Math.hypot(dx, dz);
      const running = d > 0.6;
      if (running) {
        const v = Math.min(d, (this.flying ? 5 : 1.6) * dt);
        cur.x += (dx / d) * v;
        cur.z += (dz / d) * v;
        f.root.position.set(cur.x, 0, cur.z);
        f.root.rotation.y = Math.atan2(-dx, -dz);
      } else face(f, cur, this.def.x, this.def.z);
      f.animate(dt, running ? (this.flying ? 'run' : 'walk') : this.joy > 0 ? 'cheer' : 'idle', running ? (this.flying ? 5 : 1.6) : 0, time);
    }
    // While the player bowls, the kid bowler fields at mid-on.
    if (bw) {
      const mid = { x: this.def.x + this.fwd.x * 12 + this.right.x * 6, z: this.def.z + this.fwd.z * 12 + this.right.z * 6 };
      bowler.root.visible = true;
      face(bowler, mid, this.def.x, this.def.z);
      bowler.animate(dt, this.joy > 0 ? 'cheer' : 'idle', 0, time);
    }
    // The kid batter (hidden while the player bats).
    if (!this.match) {
      face(batter, this.spots[4], this.def.x + this.fwd.x * 10, this.def.z + this.fwd.z * 10);
      batter.swing = m.swung ? Math.min(1, batter.swing + dt * 5) : 0;
      batter.animate(dt, 'bat', 0, time);
    }
    // The ball: in the bowler's hand, in flight, or hit away.
    if (this.flying) {
      const fl = this.flying;
      fl.t += dt;
      const k = Math.min(1, fl.t / fl.dur);
      this.ball.position.lerpVectors(fl.from, fl.to, k);
      this.ball.position.y = fl.from.y * (1 - k) + fl.to.y * k + Math.sin(Math.PI * k) * fl.up;
      if (fl.t > fl.dur + 2.5) this.flying = null;
    } else if (m.phase === 'flight') {
      const b = m.ballPosition();
      const along = PITCH_LENGTH * (1 - b.along) + 0.8 * b.along;
      this.ball.position.set(this.def.x + this.fwd.x * along + this.right.x * 0.2, b.height, this.def.z + this.fwd.z * along + this.right.z * 0.2);
    } else if (bw) {
      // In the player's hand at the bowling end.
      const e = this.bowlingEnd;
      this.ball.position.set(e.x + this.right.x * 0.3, 1.2, e.z + this.right.z * 0.3);
    } else {
      this.ball.position.set(bp.x + this.right.x * 0.3, 1.1, bp.z + this.right.z * 0.3);
    }
    if (this.match && shot) this.shots.push(shot);
    return this.match ? shot : null;
  }
}

/** Build an area's cricket pitches and add their rings (call before the area draws its rings). */
export function addCricket(area: { zones: AreaZone[]; world: FreeWorld; group: THREE.Group }, id: string, region: RegionId): CricketPitch[] {
  const out: CricketPitch[] = [];
  for (const [i, def] of PITCHES.filter((p) => p.area === id).entries()) {
    const pitch = new CricketPitch(def, region, 900 + i + id.length * 17);
    area.group.add(pitch.group);
    area.zones.push(pitch.zone, pitch.bowlZone);
    pitch.addColliders(area.world);
    out.push(pitch);
  }
  return out;
}


// ————— street food stalls and the souvenir stall —————

/** The nearest spot to (x, z) with a clear w × d patch and no ring nearby. */
export function roomAt(world: FreeWorld, zones: readonly AreaZone[], x: number, z: number, half = 2.6, keep: readonly { x: number; z: number }[] = []): { x: number; z: number } {
  const clear = (px: number, pz: number): boolean => {
    for (let dx = -half; dx <= half + 1e-6; dx += half / 4) for (let dz = -half; dz <= half + 1e-6; dz += half / 4) if (world.resolve({ x: px + dx, z: pz + dz }, 0.45)) return false;
    return !zones.some((q) => Math.hypot(q.x - px, q.z - pz) < q.r + half + 2) && !keep.some((q) => Math.hypot(q.x - px, q.z - pz) < half + 2.5);
  };
  if (clear(x, z)) return { x, z };
  for (let r = 2; r <= 60; r += 2)
    for (let a = 0; a < 16; a++) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r;
      const pz = z + Math.sin((a / 16) * Math.PI * 2) * r;
      if (clear(px, pz)) return { x: px, z: pz };
    }
  return { x, z };
}

/** A street stall: a painted cart with a striped awning, and what it sells on the counter. Faces −Z (local). */
export function buildStall(kind: FoodId | 'souvenir', colour: string): THREE.BufferGeometry {
  const k = new ModelKit();
  k.box(2.4, 1.0, 1.1, '#8a5a3a', { position: [0, 0.5, 0], pattern: Pattern.Planks });
  k.box(2.5, 0.08, 1.2, '#f6f0e4', { position: [0, 1.04, 0] });
  for (const x of [-1.1, 1.1]) for (const z of [-0.5, 0.5]) k.box(0.07, 2.4, 0.07, '#5a3a24', { position: [x, 1.2, z] });
  // Striped awning.
  for (let i = 0; i < 6; i++) k.box(0.45, 0.06, 1.6, i % 2 ? '#f6f0e4' : colour, { position: [-1.125 + i * 0.45, 2.45, -0.15], rotation: [0.18, 0, 0] });
  // Wheels (a cart).
  for (const x of [-0.9, 0.9]) k.cylinder(0.28, 0.28, 0.08, 12, '#2b2622', { position: [x, 0.28, 0.6], rotation: [Math.PI / 2, 0, 0] });
  const top = 1.1;
  switch (kind) {
    case 'kottu':
      // A big flat griddle with chopped roti, and two blades.
      k.cylinder(0.55, 0.55, 0.05, 16, '#3a3530', { position: [0, top + 0.03, 0] });
      for (let i = 0; i < 9; i++) k.box(0.1, 0.03, 0.06, i % 3 ? '#e8c98a' : '#d8463a', { position: [Math.cos(i) * 0.3, top + 0.07, Math.sin(i * 1.7) * 0.25] });
      break;
    case 'vadai':
      // A basket of prawn fritters.
      k.cylinder(0.35, 0.28, 0.18, 12, '#c9a860', { position: [0.4, top + 0.09, 0], pattern: Pattern.Thatch });
      for (let i = 0; i < 7; i++) k.blob(0.07, '#d98a2a', { position: [0.4 + Math.cos(i) * 0.2, top + 0.2, Math.sin(i) * 0.15], scale: [1, 0.5, 1], detail: 0 });
      k.box(0.5, 0.2, 0.4, '#f6f0e4', { position: [-0.5, top + 0.1, 0] });
      break;
    case 'hoppers':
      // Hopper pans on the fire, bowl-shaped pancakes.
      for (const x of [-0.5, 0.5]) {
        k.cylinder(0.25, 0.12, 0.14, 12, '#3a3530', { position: [x, top + 0.07, 0] });
        k.cylinder(0.22, 0.1, 0.1, 12, '#efd9a8', { position: [x, top + 0.12, 0] });
        k.blob(0.05, '#f4d23b', { position: [x, top + 0.13, 0], detail: 0 });
      }
      break;
    case 'takoyaki':
      // A grill with rows of round dimples.
      k.box(1.2, 0.1, 0.6, '#3a3530', { position: [0, top + 0.05, 0] });
      for (let i = 0; i < 12; i++) k.blob(0.06, '#c8843a', { position: [-0.45 + (i % 6) * 0.18, top + 0.12, -0.12 + Math.floor(i / 6) * 0.24], detail: 0 });
      k.box(0.3, 0.4, 0.05, '#f6f0e4', { position: [0.9, top + 0.9, -0.55] });
      break;
    case 'chai':
      // A big kettle and little glasses.
      k.cylinder(0.18, 0.22, 0.35, 10, '#b8b8c0', { position: [-0.4, top + 0.18, 0] });
      k.cylinder(0.02, 0.02, 0.25, 4, '#b8b8c0', { position: [-0.18, top + 0.3, 0], rotation: [0, 0, -0.8] });
      for (let i = 0; i < 5; i++) k.cylinder(0.04, 0.035, 0.1, 6, '#c8843a', { position: [0.15 + i * 0.14, top + 0.05, 0.1] });
      break;
    case 'icecream':
      // A freezer box and cones.
      k.box(1.4, 0.35, 0.8, '#bfd9e8', { position: [0, top + 0.18, 0] });
      for (let i = 0; i < 4; i++) {
        k.cylinder(0.05, 0.001, 0.2, 6, '#d9a860', { position: [-0.45 + i * 0.3, top + 0.46, -0.3], rotation: [Math.PI, 0, 0] });
        k.blob(0.07, ['#f7b8cf', '#f6f0e4', '#8a5a3a', '#bfe0a8'][i], { position: [-0.45 + i * 0.3, top + 0.6, -0.3], detail: 0 });
      }
      break;
    case 'souvenir':
      // Shelves of little crafts.
      k.box(2.2, 0.06, 0.5, '#5a3a24', { position: [0, top + 0.55, 0.25] });
      const cs = ['#e0432f', '#f4d23b', '#3e6fa8', '#2d8a5a', '#e8559a', '#f4a13b'];
      for (let i = 0; i < 6; i++) {
        k.blob(0.1, cs[i], { position: [-0.9 + i * 0.36, top + 0.1, 0], detail: 0 });
        k.box(0.14, 0.2, 0.1, cs[(i + 2) % 6], { position: [-0.9 + i * 0.36, top + 0.7, 0.25] });
      }
      break;
  }
  return k.build(0.015);
}

/** A stall in town: the cart, the stall-keeper and the ring in front. */
export class Stall {
  readonly group = new THREE.Group();
  readonly zone: AreaZone;
  readonly vendor: HumanModel;
  constructor(
    readonly kind: FoodId | 'souvenir',
    readonly x: number,
    readonly z: number,
    readonly yaw: number,
    colour: string,
    region: RegionId,
    seed: number,
  ) {
    const cart = new THREE.Mesh(buildStall(kind, colour), mat());
    cart.castShadow = true;
    cart.position.set(x, 0, z);
    cart.rotation.y = yaw;
    this.group.add(cart);
    const rnd = new Random(seed);
    const look = personOf(region, () => rnd.next(), { age: 'adult', aids: false }).look;
    this.vendor = new HumanModel(look);
    // Behind the counter, facing the customers.
    this.vendor.root.position.set(x + Math.sin(yaw) * 0.9, 0, z + Math.cos(yaw) * 0.9);
    this.vendor.root.rotation.y = yaw;
    this.vendor.tempo = kind === 'kottu' ? 220 : 100;
    this.group.add(this.vendor.root);
    const front = { x: x - Math.sin(yaw) * 2.8, z: z - Math.cos(yaw) * 2.8 };
    this.zone = { kind: kind === 'souvenir' ? 'souvenir' : 'food', label: '', x: front.x, z: front.z, r: 1.3, colour: kind === 'souvenir' ? '#f4a13b' : '#e0432f', spot: kind };
  }

  addColliders(world: FreeWorld): void {
    world.circle(this.x, this.z, 1.35);
  }

  /** Open for business: sellers set up from 10:00 and serve 11:00–22:00. */
  static hours = { setup: 10, open: 11, close: 22 };
  static isOpen(hour: number): boolean {
    return hour >= Stall.hours.open && hour < Stall.hours.close;
  }

  update(dt: number, time: number, hour = 12): void {
    const h = Stall.hours;
    // The seller arrives to set up, serves through the day, and goes home at night.
    this.vendor.root.visible = hour >= h.setup && hour < h.close;
    if (!this.vendor.root.visible) return;
    // Setting up (unpacking, wiping the counter); then the kottu maker chops on the griddle (clang-clang!), the others chat to customers.
    const pose = hour < h.open ? 'tend' : this.kind === 'kottu' ? 'drum' : Math.sin(time * 0.4 + this.x) > 0.3 ? 'talk' : 'idle';
    this.vendor.animate(dt, pose, 0, time);
  }
}

/** Build an area's food stalls (and, in Harbour Town, the souvenir stall); add their rings. */
export function addStalls(
  area: { zones: AreaZone[]; world: FreeWorld; group: THREE.Group; secrets?: { x: number; z: number }[]; chests?: { x: number; z: number }[]; pockets?: { x: number; z: number }[]; spawn?: { x: number; z: number }; places?: { x: number; z: number }[] },
  id: string,
  region: RegionId,
): Stall[] {
  // Keep clear of golden pots, chests, pockets, the spawn point and named places.
  const keep = [...(area.secrets ?? []), ...(area.chests ?? []), ...(area.pockets ?? []), ...(area.places ?? []), ...(area.spawn ? [area.spawn] : [])];
  const out: Stall[] = [];
  const defs: { kind: FoodId | 'souvenir'; near: [number, number]; colour: string }[] = FOOD_STALLS.filter((f) => f.area === id).map((f) => ({ kind: f.id, near: f.near, colour: f.colour }));
  if (id === 'harbour') defs.push({ kind: 'souvenir', near: [-30, 52], colour: '#f4a13b' });
  defs.forEach((d, i) => {
    const p = roomAt(area.world, area.zones, d.near[0], d.near[1], 2.6, keep);
    // Face toward the middle of town, or whichever way leaves the ring in front clear.
    const base = Math.atan2(p.x, p.z);
    const yaw = [0, Math.PI / 2, -Math.PI / 2, Math.PI].map((d) => base + d).find((y) => !area.world.resolve({ x: p.x - Math.sin(y) * 2.8, z: p.z - Math.cos(y) * 2.8 }, 1.3)) ?? base;
    const s = new Stall(d.kind, p.x, p.z, yaw, d.colour, region, 400 + i + id.length * 13);
    area.group.add(s.group);
    area.zones.push(s.zone);
    s.addColliders(area.world);
    out.push(s);
  });
  return out;
}
