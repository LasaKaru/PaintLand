import * as THREE from 'three';
import { RoadPath, createFrame } from '../road/RoadPath';
import { DISTRICTS, NOTE_COLOURS, PHRASE_LENGTH, degreeToMidi } from '../world/Districts';
import { PaintMaterial } from '../render/PaintMaterial';
import { Random, hashString } from '../core/Random';
import { buildBolt, buildBottle, buildCrate, buildMagnet, buildNoteGeometry, buildRamp, buildSpeedPad } from '../models/Props';
import { ModelKit } from '../models/ModelKit';

export type TonicId = 'magnet' | 'feather' | 'fizzy';

export interface Note {
  s: number;
  x: number;
  h: number;
  midi: number;
  district: number;
  step: number;
  phrase: number;
  collected: boolean;
  double: boolean;
  instance: number;
}

interface Item {
  kind: 'bolt' | 'magnet' | 'feather' | 'fizzy' | 'pad' | 'ramp' | 'crate';
  s: number;
  x: number;
  h: number;
  taken: boolean;
  mesh: THREE.InstancedMesh;
  instance: number;
  /** Crates: flight after being hit. */
  vel?: THREE.Vector3;
  pos?: THREE.Vector3;
  rot?: THREE.Euler;
  age?: number;
}

export interface Phrase {
  district: number;
  notes: Note[];
  sealed: boolean;
}

/** What touched what during one sim step (the game turns these into sound and juice). */
export interface PickupEvent {
  type: 'note' | 'sealed' | 'bolt' | 'tonic' | 'pad' | 'ramp' | 'crate';
  note?: Note;
  phrase?: Phrase;
  tonic?: TonicId;
  position: THREE.Vector3;
}

/** Collector shape in road coordinates. */
export interface Collector {
  s: number;
  x: number;
  h: number;
  radiusS: number;
  radiusX: number;
  magnet: boolean;
  driving: boolean;
}

/**
 * Notes, phrases, pickups and road furniture (docs/06 §2–3).
 * Notes are placed *from the melody*: pitch decides the sideways position,
 * so the note line draws the tune and marks a good racing line.
 */
export class Collectibles {
  readonly group = new THREE.Group();
  readonly notes: Note[] = [];
  readonly phrases: Phrase[] = [];
  private readonly items: Item[] = [];
  private readonly noteMeshes: THREE.InstancedMesh[];
  private readonly burst: THREE.InstancedMesh;
  private readonly burstParts: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; spin: number }[] = [];
  private burstCursor = 0;
  private readonly frame = createFrame();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly basis = new THREE.Matrix4();
  private readonly tmp = new THREE.Vector3();
  private readonly hidden = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(private readonly path: RoadPath) {
    this.group.name = 'collectibles';
    const noteMat = new PaintMaterial({ emissive: 0.25 });
    const geos = [buildNoteGeometry(false), buildNoteGeometry(true)];

    // Build notes from every district melody.
    const perShape: Note[][] = [[], []];
    for (const span of path.spans) {
      const def = DISTRICTS[span.district];
      const start = span.start + 28;
      const end = span.end - 18;
      const count = def.melody.length;
      const spacing = (end - start) / count;
      def.melody.forEach((degree, step) => {
        const s = start + step * spacing;
        const f = path.sample(s, this.frame);
        const limit = f.width / 2 - 1.6;
        const x = Math.max(-limit, Math.min(limit, (degree - 3) * 1.35));
        const double = step % 8 === 7;
        const note: Note = {
          s,
          x,
          h: 1.5,
          midi: degreeToMidi(def, degree),
          district: span.district,
          step,
          phrase: 0,
          collected: false,
          double,
          instance: perShape[double ? 1 : 0].length,
        };
        perShape[double ? 1 : 0].push(note);
        this.notes.push(note);
      });
    }
    // Phrases of 8 notes.
    for (let i = 0; i < this.notes.length; i += PHRASE_LENGTH) {
      const notes = this.notes.slice(i, i + PHRASE_LENGTH);
      const phrase: Phrase = { district: notes[0].district, notes, sealed: false };
      for (const n of notes) n.phrase = this.phrases.length;
      this.phrases.push(phrase);
    }

    this.noteMeshes = geos.map((g, k) => {
      const mesh = new THREE.InstancedMesh(g, noteMat, Math.max(1, perShape[k].length));
      const c = new THREE.Color();
      perShape[k].forEach((n) => mesh.setColorAt(n.instance, c.set(NOTE_COLOURS[((n.midi % 12) + 12) % 12])));
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    });

    // Burst particles: small notes that spray when collected.
    this.burst = new THREE.InstancedMesh(geos[0], new PaintMaterial({ emissive: 0.4 }), 160);
    this.burst.frustumCulled = false;
    for (let i = 0; i < 160; i++) {
      this.burst.setMatrixAt(i, this.hidden);
      this.burst.setColorAt(i, new THREE.Color(NOTE_COLOURS[(i * 5) % 12]));
      this.burstParts.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, spin: 0 });
    }
    this.group.add(this.burst);

    this.placeItems();
  }

  private placeItems(): void {
    const kinds: Record<Item['kind'], { geo: THREE.BufferGeometry; mat: THREE.Material }> = {
      bolt: { geo: buildBolt(), mat: new PaintMaterial({ vertexColors: true, emissive: 0.3 }) },
      magnet: { geo: buildMagnet(), mat: new PaintMaterial({ vertexColors: true }) },
      feather: { geo: buildFeather(), mat: new PaintMaterial({ vertexColors: true }) },
      fizzy: { geo: buildBottle('#e8559a'), mat: new PaintMaterial({ vertexColors: true }) },
      pad: { geo: buildSpeedPad(), mat: new PaintMaterial({ vertexColors: true, emissive: 0.85 }) },
      ramp: { geo: buildRamp(5), mat: new PaintMaterial({ vertexColors: true, flat: true }) },
      crate: { geo: buildCrate(), mat: new PaintMaterial({ vertexColors: true, flat: true }) },
    };
    const plan: { kind: Item['kind']; s: number; x: number; h: number }[] = [];
    for (const span of this.path.spans) {
      const def = DISTRICTS[span.district];
      const rnd = new Random(hashString(def.id + ':items'));
      const len = span.end - span.start;
      const at = (t: number): number => span.start + len * t;
      const upright = (s: number): boolean => this.path.sample(s, this.frame).up.y > 0.85;
      const add = (kind: Item['kind'], s: number, x: number, h = 0): void => {
        plan.push({ kind, s, x, h });
      };
      const pads = { town: 3, tower: 2, ceiling: 2, arches: 1, chute: 3, bridge: 4, loop: 2, gate: 2 }[def.style];
      for (let i = 0; i < pads; i++) add('pad', at(rnd.range(0.15, 0.85)), rnd.pick([-3, 0, 3]));
      const pickups: Item['kind'][] = {
        town: ['bolt', 'magnet'],
        tower: ['bolt'],
        ceiling: ['feather', 'fizzy'],
        arches: ['bolt', 'magnet'],
        chute: ['bolt'],
        bridge: ['magnet', 'fizzy', 'bolt', 'feather'],
        loop: ['bolt'],
        gate: ['bolt', 'feather'],
      }[def.style] as Item['kind'][];
      pickups.forEach((k, i) => add(k, at((i + 1) / (pickups.length + 1) + rnd.jitter(0.05)), rnd.range(-3.5, 3.5), 1.6));
      if (def.style === 'town' || def.style === 'bridge' || def.style === 'gate') {
        for (let i = 0; i < 2; i++) {
          const s = at(rnd.range(0.2, 0.8));
          if (upright(s)) add('ramp', s, rnd.pick([-2.5, 2.5]));
        }
        for (let i = 0; i < 3; i++) {
          const s = at(rnd.range(0.1, 0.9));
          const x = rnd.pick([-4, 4]);
          add('crate', s, x);
          if (rnd.chance(0.5)) add('crate', s + 1.2, x + 1.2);
        }
      }
    }
    const counts = new Map<Item['kind'], number>();
    for (const p of plan) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
    const meshes = new Map<Item['kind'], THREE.InstancedMesh>();
    for (const [kind, n] of counts) {
      const mesh = new THREE.InstancedMesh(kinds[kind].geo, kinds[kind].mat, n);
      mesh.castShadow = kind !== 'pad';
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      meshes.set(kind, mesh);
    }
    const used = new Map<Item['kind'], number>();
    for (const p of plan) {
      const i = used.get(p.kind) ?? 0;
      used.set(p.kind, i + 1);
      this.items.push({ ...p, taken: false, mesh: meshes.get(p.kind)!, instance: i });
    }
    this.refreshStatic();
  }

  /** Road-frame matrix at (s, x, h) with a spin about the road up. */
  private roadMatrix(s: number, x: number, h: number, spin: number, scale = 1): THREE.Matrix4 {
    const f = this.path.sample(s, this.frame);
    this.basis.makeBasis(f.right, f.up, this.tmp.copy(f.tangent).negate());
    this.q.setFromRotationMatrix(this.basis);
    if (spin) this.q.multiply(_spin.setFromAxisAngle(_yAxis, spin));
    const pos = _pos.copy(f.position).addScaledVector(f.right, x).addScaledVector(f.up, h);
    return this.m.compose(pos, this.q, _scale.setScalar(scale));
  }

  private refreshStatic(): void {
    for (const it of this.items) {
      if (it.kind === 'crate' && it.pos) continue;
      it.mesh.setMatrixAt(it.instance, it.taken && it.kind !== 'pad' && it.kind !== 'ramp' ? this.hidden : this.roadMatrix(it.s, it.x, it.h + (it.kind === 'pad' ? 0.01 : 0), 0));
    }
    for (const mesh of new Set(this.items.map((i) => i.mesh))) mesh.instanceMatrix.needsUpdate = true;
  }

  /** New lap: everything comes back; the Songbook keeps what was sealed. */
  resetLap(): void {
    for (const n of this.notes) n.collected = false;
    for (const it of this.items) {
      it.taken = false;
      it.pos = undefined;
    }
    this.refreshStatic();
  }

  /** Check pickups for one sim step. */
  collect(c: Collector, out: PickupEvent[]): void {
    const magnetR = c.magnet ? 8 : 0;
    for (const n of this.notes) {
      if (n.collected) continue;
      const ds = Math.abs(n.s - c.s);
      if (ds > 12) continue;
      const hit = (ds < c.radiusS && Math.abs(n.x - c.x) < c.radiusX && Math.abs(n.h - c.h - 1) < 2.2) || (magnetR > 0 && Math.hypot(ds, n.x - c.x) < magnetR);
      if (!hit) continue;
      n.collected = true;
      const position = this.path.pointAt(n.s, n.x, n.h, new THREE.Vector3());
      out.push({ type: 'note', note: n, position });
      this.spray(position, 6);
      const phrase = this.phrases[n.phrase];
      if (!phrase.sealed && phrase.notes.every((p) => p.collected)) {
        phrase.sealed = true;
        out.push({ type: 'sealed', phrase, position });
        this.spray(position, 24);
      }
    }
    for (const it of this.items) {
      if (it.taken) continue;
      const ds = Math.abs(it.s - c.s);
      if (ds > 4) continue;
      const dx = Math.abs(it.x - c.x);
      const position = this.path.pointAt(it.s, it.x, it.h, new THREE.Vector3());
      switch (it.kind) {
        case 'pad':
          if (c.driving && ds < 1.5 && dx < 1.6 && c.h < 0.5) {
            it.taken = true;
            out.push({ type: 'pad', position });
          }
          break;
        case 'ramp':
          if (c.driving && ds < 1.2 && dx < 2.8 && c.h < 0.3) {
            it.taken = true;
            out.push({ type: 'ramp', position });
          }
          break;
        case 'crate':
          if (ds < 1.6 && dx < 1.9 && c.h < 1.2 && c.driving) {
            it.taken = true;
            it.pos = position.clone();
            const f = this.path.sample(it.s, this.frame);
            it.vel = f.tangent.clone().multiplyScalar(14).addScaledVector(f.up, 9).addScaledVector(f.right, Math.sign(it.x - c.x || 1) * 6);
            it.rot = new THREE.Euler();
            it.age = 0;
            out.push({ type: 'crate', position });
          }
          break;
        default:
          if (ds < c.radiusS + 0.4 && dx < c.radiusX + 0.6 && Math.abs(it.h - c.h - 1) < 2.4) {
            it.taken = true;
            it.mesh.setMatrixAt(it.instance, this.hidden);
            it.mesh.instanceMatrix.needsUpdate = true;
            this.spray(position, 10);
            if (it.kind === 'bolt') out.push({ type: 'bolt', position });
            else out.push({ type: 'tonic', tonic: it.kind as TonicId, position });
          }
      }
    }
  }

  /** Spray little notes from a point (collect feedback, docs/01 still 1). */
  spray(at: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.burstParts[this.burstCursor];
      this.burstCursor = (this.burstCursor + 1) % this.burstParts.length;
      p.pos.copy(at);
      p.vel.set(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 6);
      p.life = 0.9 + Math.random() * 0.5;
      p.spin = (Math.random() - 0.5) * 8;
    }
  }

  /** Per render frame: spin notes and pickups, fly bursts and crates. */
  update(dt: number, time: number, focusS: number, up: THREE.Vector3): void {
    const visibleRange = 400;
    for (const n of this.notes) {
      const mesh = this.noteMeshes[n.double ? 1 : 0];
      if (n.collected || Math.abs(n.s - focusS) > visibleRange) {
        mesh.setMatrixAt(n.instance, this.hidden);
        continue;
      }
      const bob = Math.sin(time * 2.4 + n.s * 0.3) * 0.18;
      mesh.setMatrixAt(n.instance, this.roadMatrix(n.s, n.x, n.h + bob, Math.sin(time * 1.5 + n.step) * 0.6, 1));
    }
    for (const mesh of this.noteMeshes) mesh.instanceMatrix.needsUpdate = true;

    const spinning = new Set<THREE.InstancedMesh>();
    for (const it of this.items) {
      if (it.kind === 'crate' && it.pos && it.vel && it.rot && it.age !== undefined) {
        it.age += dt;
        it.vel.y -= 25 * dt;
        it.pos.addScaledVector(it.vel, dt);
        it.rot.x += dt * 5;
        it.rot.z += dt * 3;
        const s = Math.max(0, 1 - it.age / 2.5);
        it.mesh.setMatrixAt(it.instance, this.m.compose(it.pos, this.q.setFromEuler(it.rot), _scale.setScalar(s)));
        spinning.add(it.mesh);
        continue;
      }
      if (it.taken || it.kind === 'pad' || it.kind === 'ramp' || it.kind === 'crate') continue;
      if (Math.abs(it.s - focusS) > visibleRange) continue;
      it.mesh.setMatrixAt(it.instance, this.roadMatrix(it.s, it.x, it.h + Math.sin(time * 2 + it.s) * 0.2, time * 1.8, 1.3));
      spinning.add(it.mesh);
    }
    for (const mesh of spinning) mesh.instanceMatrix.needsUpdate = true;

    let any = false;
    for (let i = 0; i < this.burstParts.length; i++) {
      const p = this.burstParts[i];
      if (p.life <= 0) continue;
      any = true;
      p.life -= dt;
      p.vel.addScaledVector(up, -9 * dt);
      p.pos.addScaledVector(p.vel, dt);
      const s = Math.max(0, Math.min(1, p.life * 2)) * 0.45;
      this.burst.setMatrixAt(i, p.life > 0 ? this.m.compose(p.pos, this.q.setFromAxisAngle(_yAxis, p.life * p.spin), _scale.setScalar(s)) : this.hidden);
    }
    if (any) this.burst.instanceMatrix.needsUpdate = true;
  }

  /** Songbook totals for the HUD. */
  totals(): { notes: number; noteTotal: number; sealed: number; phraseTotal: number } {
    return {
      notes: this.notes.filter((n) => n.collected).length,
      noteTotal: this.notes.length,
      sealed: this.phrases.filter((p) => p.sealed).length,
      phraseTotal: this.phrases.length,
    };
  }
}

const _spin = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

function buildFeather(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.9);
  s.quadraticCurveTo(0.45, -0.2, 0.1, 0.9);
  s.quadraticCurveTo(-0.4, 0.1, 0, -0.9);
  return new ModelKit()
    .add(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), '#f6f0e4')
    .box(0.04, 1.6, 0.08, '#9a8cc8', { position: [0.02, 0, 0.03], rotation: [0, 0, -0.15] })
    .build(0, 0);
}
