import * as THREE from 'three';
import { ModelKit, Pattern } from '../models/ModelKit';
import { HumanModel } from '../models/Human';
import { PaintMaterial } from '../render/PaintMaterial';
import { Random } from '../core/Random';
import { CricketMatch, PITCHES, PITCH_LENGTH, type Shot } from '../gameplay/Cricket';
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
  /** Shots in the player's innings since the game last looked. */
  readonly shots: Shot[] = [];
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
    const m = this.match ?? this.kidMatch;
    const auto = !this.match;
    let shot = m.step(dt);
    // The kid batter swings on their own, some good, some not.
    if (auto && m.phase === 'flight' && !m.swung && m.t > m.ball.flight - 0.25 + Math.sin(time * 7.3) * 0.2) shot = m.swing() ?? shot;
    if (auto && m.over) this.kidMatch.reset();
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
    face(bowler, bp, this.def.x, this.def.z);
    bowler.swing = m.phase === 'flight' ? Math.min(1, m.t / 0.25) : 0;
    bowler.animate(dt, m.phase === 'runup' ? 'run' : m.phase === 'flight' && m.t < 0.4 ? 'bowl' : this.joy > 0 ? 'clap' : 'idle', m.phase === 'runup' ? 4 : 0, time);
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
    area.zones.push(pitch.zone);
    pitch.addColliders(area.world);
    out.push(pitch);
  }
  return out;
}

