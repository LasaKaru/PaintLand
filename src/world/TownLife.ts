import * as THREE from 'three';
import { FreeWalker, type FreeWorld } from '../gameplay/FreeRoam';
import type { Carry, HumanLook, HumanModel, HumanPose } from '../models/Human';
import { ModelKit } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import type { Random } from '../core/Random';

/** What a townsperson is doing right now. */
export type Activity = 'stroll' | 'jog' | 'play' | 'chat' | 'pause' | 'greet' | 'dodge' | 'home' | 'away' | 'busk' | 'hail' | 'ride';

/** Who someone is, which decides what they like to do. */
export type Kind = 'child' | 'adult' | 'elder' | 'wheels';

export interface TownPerson {
  model: HumanModel;
  body: FreeWalker;
  kind: Kind;
  act: Activity;
  /** Seconds left in this activity. */
  t: number;
  target: { x: number; z: number };
  /** A pose held while pausing or greeting. */
  still: HumanPose;
  /** Who you are chatting with or greeting. */
  other: TownPerson | null;
  /** In a chat: your turn to talk. */
  speaking: boolean;
  /** Seconds until the speaker changes (or until a child's next hop). */
  beat: number;
  /** Seconds before you greet anyone again. */
  cool: number;
  pose: HumanPose;
  /** How this person says hello to the player. */
  hello: HumanPose;
  /** 0..1, fixed: who stays out late, who carries an umbrella, who likes a sun hat (compared with the hour and weather). */
  temper: number;
  /** Where they come from and go back to. */
  home: { x: number; z: number };
  /** Stepping out of the way: the direction to move in. */
  away: { x: number; z: number };
  /** A busker's instrument. */
  instrument: Carry;
  /** A busker's pitch (they stay put). */
  pitch: { x: number; z: number; heading: number } | null;
  /** Where the model lives in the scene while walking (it moves into the car for a taxi ride). */
  parent: THREE.Object3D | null;
}

/** The world around the town this frame (set by the game before update). */
export interface TownEnv {
  /** 0..24. */
  hour: number;
  /** 0..1. */
  rain: number;
  /** The player's car, when driving: position and velocity (m/s). */
  car: { x: number; z: number; vx: number; vz: number } | null;
  /** The player on foot. */
  onFoot: boolean;
  /** Tempo for buskers (the radio's, if it is playing). */
  bpm: number;
}

/** Share of townspeople out and about at each hour (the rest are at home). */
export function presence(hour: number, kind: Kind): number {
  const h = ((hour % 24) + 24) % 24;
  if (kind === 'child') return h >= 7 && h < 20 ? 1 : h >= 6 && h < 21 ? 0.3 : 0;
  if (h >= 7 && h < 21) return 1;
  if (h >= 6 && h < 22) return 0.7;
  if (h >= 5 && h < 23) return 0.45;
  return 0.25;
}

/** How each activity's chances change through the day (morning jogs, midday rests, evening walks and chats). */
function hourBias(hour: number, act: Activity, kind: Kind): number {
  const h = ((hour % 24) + 24) % 24;
  const morning = h >= 5.5 && h < 9;
  const midday = h >= 11 && h < 15;
  const evening = h >= 17 && h < 21;
  const night = h >= 21 || h < 5.5;
  switch (act) {
    case 'jog':
      return morning ? 3 : evening ? 1.5 : midday ? 0.3 : night ? 0.3 : 1;
    case 'play':
      // Children walk to school in the morning and play most in the late afternoon.
      return morning ? 0.4 : evening || (h >= 15 && h < 17) ? 1.6 : 1;
    case 'pause':
      return midday ? 1.6 : 1;
    case 'chat':
      return evening ? 1.7 : night ? 1.3 : 1;
    case 'stroll':
      return evening ? 1.3 : kind === 'child' && morning ? 2 : 1;
    default:
      return 1;
  }
}

const UMBRELLAS = ['#e0432f', '#3e6fa8', '#f4d23b', '#2d8a5a', '#e8559a', '#2b2622', '#f08a2e'];

export interface TownLifeOptions {
  /** How the town greets the player and each other (a wave everywhere; a bow, or ayubowan). */
  greetings?: HumanPose[];
  /** Hide and skip people further than this from the player (big maps). */
  cull?: number;
  /** Strolling pace as a share of jogging speed (≈4.3 m/s). */
  pace?: number;
}

/** Tell children, elders and wheelchair users apart from the look. */
export function kindOf(look: HumanLook): Kind {
  if (look.aid === 'wheelchair') return 'wheels';
  if (look.aid === 'cane' || (look.stoop ?? 0) > 0) return 'elder';
  if ((look.height ?? 1) < 0.8) return 'child';
  return 'adult';
}

/** Chances of starting each activity, by who you are. */
const WEIGHTS: Record<Kind, [Activity, number][]> = {
  adult: [['stroll', 45], ['jog', 10], ['chat', 20], ['pause', 25]],
  child: [['stroll', 25], ['play', 40], ['chat', 15], ['pause', 20]],
  elder: [['stroll', 50], ['chat', 25], ['pause', 25]],
  wheels: [['stroll', 50], ['chat', 25], ['pause', 25]],
};

/** Poses held when stopping for a moment, by who you are. */
const PAUSES: Record<Kind, HumanPose[]> = {
  adult: ['idle', 'phone', 'phone', 'stretch', 'point', 'sitdown', 'clap'],
  child: ['cheer', 'sitdown', 'point', 'dance', 'wave', 'laugh'],
  elder: ['idle', 'point', 'listen', 'idle'],
  wheels: ['idle', 'phone', 'point', 'wave'],
};

/**
 * Everyday life for the people in a town (docs/04 §7): they stroll, jog,
 * stop to check a phone or stretch, children run about and hop, friends meet
 * up and chat (a speech bubble shows who is talking), and people greet each
 * other and the player in the local way. Elders and wheelchair users never
 * run or jump. One shared class so every town behaves alike.
 */
export class TownLife {
  readonly people: TownPerson[] = [];
  readonly group = new THREE.Group();
  /** The hour, weather and the player's car, set each frame by the game. */
  env: TownEnv = { hour: 12, rain: 0, car: null, onFoot: true, bpm: 96 };
  private carStill = 0;
  private readonly bubbles: THREE.Mesh[] = [];
  private readonly greetings: HumanPose[];
  private readonly pace: number;

  constructor(
    private readonly spot: (rnd: Random) => { x: number; z: number },
    private readonly rnd: Random,
    private readonly opts: TownLifeOptions = {},
  ) {
    this.group.name = 'town-life';
    this.greetings = opts.greetings?.length ? opts.greetings : ['wave'];
    this.pace = opts.pace ?? 0.45;
  }

  /** Add someone standing at (x, z), about to start their day. */
  add(model: HumanModel, look: HumanLook, x: number, z: number): TownPerson {
    const body = new FreeWalker();
    body.place(x, z, this.rnd.range(-3, 3));
    const p: TownPerson = {
      model,
      body,
      kind: kindOf(look),
      act: 'stroll',
      t: this.rnd.range(4, 20),
      target: this.spot(this.rnd),
      still: 'idle',
      other: null,
      speaking: false,
      beat: 0,
      cool: this.rnd.range(0, 6),
      pose: 'idle',
      hello: this.rnd.pick(this.greetings),
      temper: this.rnd.next(),
      home: { x, z },
      away: { x: 0, z: 0 },
      instrument: null,
      pitch: null,
      parent: null,
    };
    this.people.push(p);
    return p;
  }

  /** A street musician who stays at one spot, playing along with the radio (09:00–22:00). */
  addBusker(model: HumanModel, look: HumanLook, x: number, z: number, heading: number, instrument: 'guitar' | 'drum'): TownPerson {
    const p = this.add(model, look, x, z);
    p.act = 'busk';
    p.t = Infinity;
    p.instrument = instrument;
    p.pitch = { x, z, heading };
    p.body.place(x, z, heading);
    model.setCarry(instrument);
    return p;
  }

  /** The nearest spot to (x, z) with room to stand. */
  static clearSpot(world: FreeWorld, x: number, z: number): { x: number; z: number } {
    for (let r = 1; r <= 16; r++)
      for (let a = 0; a < 12; a++) {
        const q = { x: x + Math.cos((a / 12) * Math.PI * 2) * r, z: z + Math.sin((a / 12) * Math.PI * 2) * r };
        if (!world.resolve({ ...q }, 0.6)) return q;
      }
    return { x, z };
  }

  /** The nearest person the player could talk to (a busker too), or null. */
  nearest(x: number, z: number, reach = 2): TownPerson | null {
    let best: TownPerson | null = null;
    let bestD = reach;
    for (const p of this.people) {
      if (p.act === 'away' || p.act === 'ride' || p.act === 'home' || !p.model.root.visible) continue;
      const d = Math.hypot(p.body.x - x, p.body.z - z);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }

  /** Stop and chat with the player for a few seconds. */
  talkTo(p: TownPerson, player: { x: number; z: number }): void {
    if (p.act === 'busk') return;
    this.leave(p);
    p.act = 'pause';
    p.still = 'talk';
    p.t = 4;
    p.away = { x: player.x, z: player.z };
  }

  /** Someone who would like a taxi ride, somewhere between `near` and `far` metres from the car. */
  pickHail(car: { x: number; z: number }, near = 20, far = 70): TownPerson | null {
    const ok = this.people.filter((p) => {
      if (p.kind !== 'adult' && p.kind !== 'elder') return false;
      if (p.act !== 'stroll' && p.act !== 'pause') return false;
      if (!p.model.root.visible) return false;
      const d = Math.hypot(p.body.x - car.x, p.body.z - car.z);
      return d > near && d < far;
    });
    if (!ok.length) return null;
    const p = this.rnd.pick(ok);
    this.leave(p);
    p.act = 'hail';
    p.t = 45;
    return p;
  }

  /** Get into the car (the game moves the model onto the back seat). */
  board(p: TownPerson): void {
    this.leave(p);
    p.act = 'ride';
    p.t = Infinity;
    p.parent = p.model.root.parent;
  }

  /** Get out of the car at (x, z) and walk off. */
  alight(p: TownPerson, x: number, z: number): void {
    const parent = p.parent;
    if (parent) parent.add(p.model.root);
    p.model.root.scale.setScalar(p.model.look.height ?? 1);
    p.model.root.rotation.set(0, 0, 0);
    p.body.place(x, z, p.body.heading);
    p.act = 'pause';
    p.still = 'wave';
    p.t = 2;
    p.home = { x, z };
    p.target = this.spot(this.rnd);
  }

  /** People nearby clap and cheer (a big jump landed, a district painted back to colour). */
  celebrate(x: number, z: number, radius = 45): number {
    let n = 0;
    for (const p of this.people) {
      if (p.act === 'away' || p.act === 'home' || p.act === 'busk' || p.act === 'dodge') continue;
      if (Math.hypot(p.body.x - x, p.body.z - z) > radius) continue;
      this.leave(p);
      p.act = 'pause';
      p.still = p.kind === 'child' ? 'cheer' : this.rnd.pick(['clap', 'clap', 'cheer'] as HumanPose[]);
      p.t = this.rnd.range(2.5, 4);
      p.away = { x, z };
      n++;
    }
    return n;
  }

  /** How lively it sounds around the player: how many people are near, and how many are talking or laughing. */
  crowdAt(x: number, z: number): { people: number; talk: number } {
    let people = 0;
    let talk = 0;
    for (const p of this.people) {
      if (p.act === 'away' || !p.model.root.visible) continue;
      const d = Math.hypot(p.body.x - x, p.body.z - z);
      if (d > 22) continue;
      const w = 1 - d / 22;
      people += w;
      if (p.pose === 'talk' || p.pose === 'laugh' || p.pose === 'cheer' || p.pose === 'clap') talk += w;
    }
    return { people: Math.min(1, people / 8), talk: Math.min(1, talk / 3) };
  }

  /** Pick the next thing to do. */
  private next(p: TownPerson): void {
    const rnd = this.rnd;
    this.leave(p);
    p.away = { x: 0, z: 0 };
    // Time to go home for the night?
    if (p.temper > presence(this.env.hour, p.kind)) {
      p.act = 'home';
      p.target = p.home;
      p.t = 60;
      return;
    }
    const wet = this.env.rain > 0.3;
    const weights = WEIGHTS[p.kind].map(([a, w]) => [a, w * hourBias(this.env.hour, a, p.kind) * (wet && a === 'chat' ? 0.4 : 1)] as [Activity, number]);
    let roll = rnd.next() * weights.reduce((a, [, w]) => a + w, 0);
    let act: Activity = 'stroll';
    for (const [a, w] of weights) if ((roll -= w) <= 0) {
      act = a;
      break;
    }
    if (act === 'chat' && this.startChat(p)) return;
    if (act === 'chat') act = 'pause';
    p.act = act;
    p.other = null;
    if (act === 'pause') {
      p.still = rnd.pick(PAUSES[p.kind]);
      // Nobody sits on wet grass or stretches in the rain.
      if (wet && (p.still === 'sitdown' || p.still === 'stretch' || p.still === 'dance')) p.still = p.kind === 'child' ? 'cheer' : 'idle';
      p.t = rnd.range(3, 8);
    } else {
      p.target = this.spot(rnd);
      p.t = act === 'stroll' ? rnd.range(10, 30) : rnd.range(6, 14);
      p.beat = rnd.range(0.4, 1.5);
    }
  }

  /** Find someone nearby who is free and walk over to chat. */
  private startChat(p: TownPerson): boolean {
    let best: TownPerson | null = null;
    let bestD = 30;
    for (const q of this.people) {
      if (q === p || q.other || (q.act !== 'stroll' && q.act !== 'pause')) continue;
      const d = Math.hypot(q.body.x - p.body.x, q.body.z - p.body.z);
      if (d < bestD) {
        best = q;
        bestD = d;
      }
    }
    if (!best) return false;
    const q = best;
    // Meet halfway, standing a little over a metre apart.
    const mx = (p.body.x + q.body.x) / 2;
    const mz = (p.body.z + q.body.z) / 2;
    const d = Math.max(0.01, bestD);
    const ux = (p.body.x - q.body.x) / d;
    const uz = (p.body.z - q.body.z) / d;
    const t = this.rnd.range(7, 14);
    for (const [a, b, side] of [[p, q, 1], [q, p, -1]] as const) {
      a.act = 'chat';
      a.other = b;
      a.t = t;
      a.target = { x: mx + ux * 0.65 * side, z: mz + uz * 0.65 * side };
      a.beat = this.rnd.range(1.5, 3.5);
    }
    p.speaking = true;
    q.speaking = false;
    return true;
  }

  /** Stop chatting or greeting, and free the other person too. */
  private leave(p: TownPerson): void {
    const o = p.other;
    p.other = null;
    if (o && o.other === p) {
      o.other = null;
      o.act = 'pause';
      o.still = 'wave';
      o.t = 1.2;
    }
  }

  /** How close you are to your spot in a chat. */
  private arrived(p: TownPerson): boolean {
    return Math.hypot(p.target.x - p.body.x, p.target.z - p.body.z) < 0.5;
  }

  update(dt: number, time: number, player: { x: number; z: number }, world: FreeWorld): void {
    const rnd = this.rnd;
    const env = this.env;
    let bubble = 0;
    const car = env.car;
    const carSpeed = car ? Math.hypot(car.vx, car.vz) : 0;
    this.carStill = car && carSpeed < 3 ? this.carStill + dt : 0;
    const wet = env.rain > 0.3;
    const sunny = env.rain < 0.1 && env.hour >= 10 && env.hour < 16;
    const dark = env.hour >= 19 || env.hour < 6;
    for (const p of this.people) {
      const pd = Math.hypot(player.x - p.body.x, player.z - p.body.z);
      // Riding in the player's taxi: the game looks after the model.
      if (p.act === 'ride') continue;
      // At home: come back out (somewhere the player isn't looking) when the day starts.
      if (p.act === 'away') {
        p.model.root.visible = false;
        p.t -= dt;
        if (p.t <= 0) {
          p.t = 5;
          if (p.temper <= presence(env.hour, p.kind) && pd > 35) {
            p.body.place(p.home.x, p.home.z, p.body.heading);
            p.act = 'stroll';
            p.t = rnd.range(5, 15);
            p.target = this.spot(rnd);
          }
        }
        continue;
      }
      if (this.opts.cull) {
        const on = pd < this.opts.cull;
        p.model.root.visible = on;
        if (!on) continue;
      } else p.model.root.visible = true;
      // What they carry and wear: umbrellas in the rain, lanterns after dark, a sun hat at midday.
      if (p.act !== 'busk') {
        const want: Carry = wet && p.temper < 0.75 ? 'umbrella' : dark && p.temper > 0.55 ? 'lantern' : null;
        if (p.model.carry !== want) p.model.setCarry(want, UMBRELLAS[Math.floor(p.temper * 97) % UMBRELLAS.length]);
      }
      p.model.setSunHat(sunny && p.temper > 0.62);
      p.t -= dt;
      p.cool -= dt;
      const b = p.body;
      let mx = 0;
      let my = 0;
      let speed = this.pace;
      let jump = false;
      let face: { x: number; z: number } | null = null;
      let pose: HumanPose | null = null;
      const busy = p.act === 'chat' || p.act === 'jog' || p.act === 'dodge' || p.act === 'home' || p.act === 'busk' || p.act === 'hail';
      const near = pd < 5 && !busy && !(p.act === 'pause' && (p.still === 'clap' || p.still === 'cheer' || p.still === 'talk'));
      if (p.t <= 0) this.next(p);
      // A car coming fast: step out of its way (then point after it: slow down!).
      if (car && carSpeed > 9 && p.act !== 'dodge' && p.act !== 'busk' && p.act !== 'hail') {
        const rx = b.x - car.x;
        const rz = b.z - car.z;
        const along = (rx * car.vx + rz * car.vz) / carSpeed;
        const side = (rx * car.vz - rz * car.vx) / carSpeed;
        if (along > 0 && along < 10 && Math.abs(side) < 3.2) {
          this.leave(p);
          const s = side >= 0 ? 1 : -1;
          p.act = 'dodge';
          p.away = { x: (car.vz / carSpeed) * s, z: (-car.vx / carSpeed) * s };
          p.t = 0.8;
        }
      }
      // A car stopped nearby: someone may take a photo of it.
      if (car && this.carStill > 1 && this.carStill < 1.2 && pd < 11 && (p.act === 'stroll' || p.act === 'pause') && p.kind !== 'child' && rnd.chance(0.3)) {
        p.act = 'pause';
        p.still = 'photo';
        p.t = rnd.range(2.5, 4);
        p.away = { x: car.x, z: car.z };
      }

      switch (p.act) {
        case 'stroll':
        case 'jog':
        case 'play': {
          const dx = p.target.x - b.x;
          const dz = p.target.z - b.z;
          const d = Math.hypot(dx, dz);
          if (d < 1.2) p.target = this.spot(rnd);
          else if (!near) {
            mx = dx / d;
            my = -dz / d;
          }
          if (p.act === 'jog') speed = 0.85;
          if (p.act === 'play') {
            speed = 0.9;
            // Children hop and skip as they run about.
            p.beat -= dt;
            if (p.beat <= 0 && b.grounded) {
              jump = true;
              p.beat = rnd.range(0.8, 2.2);
            }
          }
          // Say hello to someone you pass.
          if (p.act === 'stroll' && p.cool <= 0) {
            p.cool = 2;
            const q = this.people.find((o) => o !== p && !o.other && o.act === 'stroll' && Math.hypot(o.body.x - b.x, o.body.z - b.z) < 3);
            if (q && rnd.chance(0.35)) {
              const greet = rnd.pick(this.greetings);
              for (const [a, o] of [[p, q], [q, p]] as const) {
                a.act = 'greet';
                a.other = o;
                a.still = greet;
                a.t = rnd.range(1.4, 2.2);
                a.cool = 20;
              }
            }
          }
          break;
        }
        case 'hail':
          // Arm up, waving down the player's car.
          pose = 'wave';
          if (car) face = car;
          if (p.t <= dt) p.t = 0;
          break;
        case 'dodge':
          mx = p.away.x;
          my = -p.away.z;
          speed = p.kind === 'elder' || p.kind === 'wheels' ? 0.5 : 0.9;
          if (p.t <= dt) {
            p.act = 'pause';
            p.still = p.kind === 'child' ? 'point' : rnd.pick(['point', 'idle'] as HumanPose[]);
            p.t = rnd.range(1.2, 2);
            p.away = car ? { x: car.x, z: car.z } : p.away;
          }
          break;
        case 'home': {
          // Walk home; once the player is far enough not to see, go inside.
          const dx = p.target.x - b.x;
          const dz = p.target.z - b.z;
          const d = Math.hypot(dx, dz);
          if (d > 1.5) {
            mx = dx / d;
            my = -dz / d;
          }
          if ((d < 1.5 || p.t < 1) && pd > 30) {
            p.act = 'away';
            p.t = 5;
            p.model.root.visible = false;
          } else if (p.t < 1) p.t = 10;
          break;
        }
        case 'busk': {
          const pitch = p.pitch!;
          // The first time: make sure the pitch is somewhere clear (not inside a wall or a tree).
          if (world.resolve({ x: pitch.x, z: pitch.z }, 0.6)) Object.assign(pitch, TownLife.clearSpot(world, pitch.x, pitch.z));
          const on = env.hour >= 9 && env.hour < 22 && !wet;
          p.model.root.visible = on && p.model.root.visible;
          if (!on) break;
          if (Math.hypot(b.x - pitch.x, b.z - pitch.z) > 0.3) b.place(pitch.x, pitch.z, pitch.heading);
          b.heading = pitch.heading;
          p.model.tempo = env.bpm;
          pose = p.instrument === 'drum' ? 'drum' : 'strum';
          break;
        }
        case 'chat': {
          const o = p.other;
          if (!o || o.other !== p) {
            p.t = 0;
            break;
          }
          if (!this.arrived(p)) {
            const dx = p.target.x - b.x;
            const dz = p.target.z - b.z;
            const d = Math.hypot(dx, dz);
            mx = dx / d;
            my = -dz / d;
            // Don't wait for ever if the way is blocked.
            if (p.t < 4) p.target = { x: b.x, z: b.z };
          } else {
            face = o.body;
            if (this.arrived(o)) {
              // Take turns talking; the listener nods and sometimes laughs.
              p.beat -= dt;
              if (p.speaking && p.beat <= 0) {
                p.speaking = false;
                o.speaking = true;
                o.beat = rnd.range(1.8, 4);
                o.still = 'talk';
                p.still = rnd.chance(0.2) ? 'laugh' : 'listen';
              }
              pose = p.speaking ? 'talk' : p.still === 'laugh' ? 'laugh' : 'listen';
              if (p.speaking && bubble < 8) this.showBubble(bubble++, p, time, player);
            }
          }
          break;
        }
        case 'greet':
          if (p.other) face = p.other.body;
          pose = p.still;
          if (p.t <= 0.05) p.other = null;
          break;
        case 'pause':
          pose = wet && (p.still === 'sitdown' || p.still === 'stretch' || p.still === 'dance') ? 'idle' : p.still;
          // Clapping, cheering and taking photos face what they're looking at.
          if (p.still === 'clap' || p.still === 'cheer' || p.still === 'photo' || p.still === 'point' || p.still === 'talk') face = p.away.x || p.away.z ? p.away : null;
          break;
      }
      // Caught in the rain without an umbrella: hurry (children splash about happily).
      if (wet && p.model.carry !== 'umbrella' && (p.act === 'stroll' || p.act === 'play') && p.kind !== 'elder' && p.kind !== 'wheels') speed = Math.max(speed, 0.8);
      // Step aside for each other, for the player and for the car.
      if (p.act !== 'busk' && p.act !== 'chat') {
        let px = 0;
        let pz = 0;
        for (const o of this.people) {
          if (o === p || o.act === 'away' || (!o.model.root.visible && this.opts.cull)) continue;
          const ox = b.x - o.body.x;
          const oz = b.z - o.body.z;
          const d2 = ox * ox + oz * oz;
          if (d2 < 0.81 && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            px += (ox / d) * (0.9 - d);
            pz += (oz / d) * (0.9 - d);
          }
        }
        // Walking toward someone: keep to the right, like on a pavement.
        const wx = mx;
        const wz = -my;
        const wl = Math.hypot(wx, wz);
        if (wl > 0.1) {
          for (const o of this.people) {
            if (o === p || o.act === 'away') continue;
            const ox = o.body.x - b.x;
            const oz = o.body.z - b.z;
            const ahead = (ox * wx + oz * wz) / wl;
            const lateral = (ox * wz - oz * wx) / wl;
            if (ahead > 0 && ahead < 2.5 && Math.abs(lateral) < 0.9) {
              // Right of the walking direction (wx, wz) is (−wz, wx) seen from above with −Z forward.
              const k = (1 - ahead / 2.5) * 0.9;
              px += (-wz / wl) * k;
              pz += (wx / wl) * k;
            }
          }
        }
        const keep = (x: number, z: number, r: number, k: number): void => {
          const ox = b.x - x;
          const oz = b.z - z;
          const d = Math.hypot(ox, oz);
          if (d < r && d > 1e-3) {
            px += (ox / d) * (r - d) * k;
            pz += (oz / d) * (r - d) * k;
          }
        };
        if (env.onFoot) keep(player.x, player.z, 1.1, 1);
        if (car) keep(car.x, car.z, 3.2, 1.5);
        if (px || pz) {
          mx += px * 1.6;
          my -= pz * 1.6;
          const l = Math.hypot(mx, my);
          if (l > 1) {
            mx /= l;
            my /= l;
          }
        }
      }

      // Everyone turns to wave at the player when they come close (in the local way).
      if (near && p.act !== 'greet' && p.act !== 'away') {
        face = player;
        pose = p.hello;
      }
      b.step(dt, { moveX: mx * speed, moveY: my * speed, cameraYaw: 0, sprint: false, walk: false, jump, faceCamera: false }, world);
      if (face) b.heading = Math.atan2(-(face.x - b.x), -(face.z - b.z));
      // Jogging and running children look like running, even below sprint speed.
      const moving = b.pose === 'walk' || b.pose === 'run';
      p.pose = !b.grounded ? 'air' : moving ? ((p.act === 'jog' || p.act === 'play') && b.speed > 2.5 ? 'run' : 'walk') : pose ?? 'idle';
      // Elders and wheelchair users never run or hop; sitting down is for those who can get up easily.
      if (p.kind === 'elder' || p.kind === 'wheels') {
        if (p.pose === 'run' || p.pose === 'air') p.pose = 'walk';
      }
      if (p.kind === 'wheels' && (p.pose === 'sitdown' || p.pose === 'stretch')) p.pose = 'idle';
      if (p.act === 'dodge' && p.kind === 'adult' && p.pose === 'walk') p.pose = 'run';
      p.model.root.position.set(b.x, b.y, b.z);
      p.model.root.rotation.y = b.heading;
      p.model.animate(dt, p.pose, b.speed, time);
    }
    for (let i = bubble; i < this.bubbles.length; i++) this.bubbles[i].visible = false;
  }

  /** A little "…" speech bubble over whoever is talking. */
  private showBubble(i: number, p: TownPerson, time: number, player: { x: number; z: number }): void {
    if (!this.bubbles[i]) this.group.add((this.bubbles[i] = speechBubble()));
    const m = this.bubbles[i];
    const h = p.model.root.scale.y * (p.kind === 'wheels' ? 1.85 : 2.4);
    m.visible = true;
    m.position.set(p.body.x, p.body.y + h + Math.sin(time * 3 + i) * 0.05, p.body.z);
    // Turned toward the player, so it reads as a bubble, not a sliver.
    m.rotation.y = Math.atan2(player.x - p.body.x, player.z - p.body.z);
  }
}

let bubbleGeo: THREE.BufferGeometry | null = null;
let bubbleMat: PaintMaterial | null = null;

/** A small white speech bubble with three dots (seen from both sides); shared geometry. */
export function speechBubble(): THREE.Mesh {
  if (!bubbleGeo) {
    const k = new ModelKit().blob(0.26, '#fbf8f0', { position: [0, 0, 0], scale: [1.35, 0.9, 0.5], detail: 1 });
    k.blob(0.08, '#fbf8f0', { position: [-0.18, -0.24, 0], detail: 0 });
    for (let d = -1; d <= 1; d++) for (const z of [-0.13, 0.13]) k.blob(0.045, '#2b2622', { position: [d * 0.13, 0, z], detail: 0 });
    bubbleGeo = k.build(0, 1);
    bubbleMat = new PaintMaterial({ vertexColors: true, emissive: 0.35 });
  }
  const m = new THREE.Mesh(bubbleGeo, bubbleMat!);
  m.name = 'speech-bubble';
  return m;
}
