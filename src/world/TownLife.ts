import * as THREE from 'three';
import { FreeWalker, type FreeWorld } from '../gameplay/FreeRoam';
import type { HumanLook, HumanModel, HumanPose } from '../models/Human';
import { ModelKit } from '../models/ModelKit';
import { PaintMaterial } from '../render/PaintMaterial';
import type { Random } from '../core/Random';

/** What a townsperson is doing right now. */
export type Activity = 'stroll' | 'jog' | 'play' | 'chat' | 'pause' | 'greet';

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
}

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
    };
    this.people.push(p);
    return p;
  }

  /** Pick the next thing to do. */
  private next(p: TownPerson): void {
    const rnd = this.rnd;
    this.leave(p);
    const weights = WEIGHTS[p.kind];
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
    let bubble = 0;
    for (const p of this.people) {
      const pd = Math.hypot(player.x - p.body.x, player.z - p.body.z);
      if (this.opts.cull) {
        const on = pd < this.opts.cull;
        p.model.root.visible = on;
        if (!on) continue;
      }
      p.t -= dt;
      p.cool -= dt;
      const b = p.body;
      let mx = 0;
      let my = 0;
      let speed = this.pace;
      let jump = false;
      let face: { x: number; z: number } | null = null;
      let pose: HumanPose | null = null;
      const near = pd < 5 && p.act !== 'chat' && p.act !== 'jog';
      if (p.t <= 0) this.next(p);

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
          pose = p.still;
          break;
      }

      // Everyone turns to wave at the player when they come close (in the local way).
      if (near && p.act !== 'greet') {
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
