import * as THREE from 'three';
import { Random } from '../core/Random';
import { ModelKit } from '../models/ModelKit';
import { buildElephant } from '../models/LandmarksSriLanka';
import { HumanModel, randomLook } from '../models/Human';
import { PaintMaterial } from '../render/PaintMaterial';

/** A route point in area coordinates. */
export interface RoutePoint {
  x: number;
  z: number;
}

interface Member {
  root: THREE.Object3D;
  human?: HumanModel;
  /** Metres behind the head of the parade. */
  offset: number;
  /** Sideways offset from the route centre. */
  side: number;
  kind: 'elephant' | 'drummer' | 'dancer' | 'flag';
}

/**
 * The night perahera (docs/04 §5 "events"): a festival procession of lit
 * elephants, drummers, fire dancers and flag bearers that walks a loop of
 * streets after dark. It exists only at night and fades in at dusk.
 */
export class Perahera {
  readonly group = new THREE.Group();
  readonly members: Member[] = [];
  /** Distance of the head of the parade along the route. */
  s = 0;
  readonly length: number;
  private readonly seg: number[] = [];
  private readonly material = new PaintMaterial({ vertexColors: true, flat: true });
  private readonly v = new THREE.Vector3();
  active = false;
  static readonly SPEED = 1.8;

  constructor(readonly route: RoutePoint[]) {
    this.group.name = 'perahera';
    let len = 0;
    for (let i = 0; i < route.length; i++) {
      this.seg.push(len);
      const a = route[i];
      const b = route[(i + 1) % route.length];
      len += Math.hypot(b.x - a.x, b.z - a.z);
    }
    this.length = len;
    this.build();
    this.group.visible = false;
  }

  private build(): void {
    const rnd = new Random(1956);
    const elephantGeo = buildElephant();
    const cloth = (colour: string): THREE.BufferGeometry => {
      const k = new ModelKit();
      // Caparison: an embroidered cloth over the back and head, dotted with little lamps.
      k.box(2.9, 1.9, 4.4, colour, { position: [0, 2.7, 0.2] });
      k.box(1.6, 1.4, 0.3, colour, { position: [0, 2.9, -2.45] });
      for (let i = 0; i < 9; i++) for (const sx of [-1.47, 1.47]) k.box(0.06, 0.2, 0.2, '#ffe08a', { position: [sx, 2.1 + (i % 3) * 0.55, -1.6 + Math.floor(i / 3) * 1.4], nightGlow: 1 });
      for (let i = 0; i < 6; i++) k.box(0.2, 0.2, 0.06, '#ffe08a', { position: [-0.6 + (i % 3) * 0.6, 2.5 + Math.floor(i / 3) * 0.6, -2.62], nightGlow: 1 });
      // A howdah canopy with the casket on the lead elephant.
      k.box(1.6, 0.2, 1.8, '#f4d23b', { position: [0, 3.9, 0.3] });
      k.cylinder(0.05, 0.05, 1.4, 4, '#f6f0e4', { position: [0.7, 4.6, 1.1] });
      k.cylinder(0.05, 0.05, 1.4, 4, '#f6f0e4', { position: [-0.7, 4.6, -0.5] });
      k.cylinder(0.05, 1.2, 0.9, 8, '#d8463a', { position: [0, 5.6, 0.3] });
      k.box(0.3, 0.3, 0.3, '#ffe08a', { position: [0, 6.1, 0.3], nightGlow: 1 });
      return k.build(0.02, 3);
    };
    const colours = ['#b0243a', '#6c2fa0', '#1f6e8c'];
    const flagGeo = new ModelKit()
      .cylinder(0.04, 0.04, 3.4, 5, '#7a5a3a', { position: [0.35, 1.7, 0] })
      .box(0.05, 0.8, 1.1, '#f4a13b', { position: [0.35, 3, 0.55] })
      .box(0.06, 0.25, 1.1, '#d8463a', { position: [0.35, 3.2, 0.55] })
      .build(0, 1);
    let offset = 0;
    const addHuman = (kind: 'drummer' | 'dancer' | 'flag', side: number): void => {
      const look = randomLook(() => rnd.next());
      look.top = kind === 'flag' ? '#d8463a' : '#f6f0e4';
      look.hat = 'none';
      look.bottom = kind === 'dancer' ? '#d8463a' : '#f6f0e4';
      const human = new HumanModel(look);
      if (kind === 'flag') human.root.add(new THREE.Mesh(flagGeo, this.material));
      if (kind === 'drummer') {
        const drum = new THREE.Mesh(new ModelKit().cylinder(0.28, 0.28, 0.55, 10, '#b86b2e', { position: [0, 1.05, -0.3], rotation: [0, 0, Math.PI / 2] }).build(0, 1), this.material);
        human.root.add(drum);
      }
      this.group.add(human.root);
      this.members.push({ root: human.root, human, offset, side, kind });
    };
    for (let e = 0; e < 3; e++) {
      // Flags and whip-crackers lead; drummers and fire dancers walk between the elephants.
      addHuman('flag', -2);
      addHuman('flag', 2);
      offset += 3;
      for (let d = 0; d < 4; d++) addHuman('drummer', -3 + d * 2);
      offset += 3;
      for (let d = 0; d < 3; d++) addHuman('dancer', -2.5 + d * 2.5);
      offset += 5;
      const el = new THREE.Group();
      el.add(new THREE.Mesh(elephantGeo, this.material));
      el.add(new THREE.Mesh(cloth(colours[e]), this.material));
      el.scale.setScalar(e === 1 ? 1.25 : 1.05);
      for (const c of el.children) c.castShadow = true;
      this.group.add(el);
      this.members.push({ root: el, offset, side: 0, kind: 'elephant' });
      offset += 9;
    }
  }

  /** Point and heading on the route `s` metres along (wraps). */
  pointAt(s: number, out: { x: number; z: number; heading: number }): void {
    const L = this.length;
    s = ((s % L) + L) % L;
    let i = this.seg.length - 1;
    while (i > 0 && this.seg[i] > s) i--;
    const a = this.route[i];
    const b = this.route[(i + 1) % this.route.length];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = (s - this.seg[i]) / len;
    out.x = a.x + (b.x - a.x) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.heading = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  }

  /** Where the middle elephant is (for photos, compass and ambience). */
  centre(): { x: number; z: number } {
    const p = { x: 0, z: 0, heading: 0 };
    const mid = this.members.filter((m) => m.kind === 'elephant')[1];
    this.pointAt(this.s - (mid?.offset ?? 0), p);
    return p;
  }

  /** Distance from a point to the nearest parade member (Infinity when inactive). */
  distanceTo(x: number, z: number): number {
    if (!this.active) return Infinity;
    let best = Infinity;
    for (const m of this.members) best = Math.min(best, Math.hypot(m.root.position.x - x, m.root.position.z - z));
    return best;
  }

  /** Elephants are solid. */
  bodies(): { x: number; z: number; r: number }[] {
    if (!this.active) return [];
    return this.members.filter((m) => m.kind === 'elephant').map((m) => ({ x: m.root.position.x, z: m.root.position.z, r: 2.6 }));
  }

  /** Torch tips of the fire dancers (world space, area ground = 0), for flame particles. */
  torches(out: THREE.Vector3[]): number {
    let n = 0;
    for (const m of this.members) {
      if (m.kind !== 'dancer' || !m.human) continue;
      if (!out[n]) out[n] = new THREE.Vector3();
      out[n].set(0, 2.3, -0.4).applyMatrix4(m.root.matrixWorld);
      n++;
    }
    return n;
  }

  update(dt: number, time: number, night: number, player: { x: number; z: number }): void {
    const on = night > 0.45;
    if (on !== this.active) {
      this.active = on;
      this.group.visible = on;
    }
    if (!on) return;
    this.s += Perahera.SPEED * dt;
    const p = { x: 0, z: 0, heading: 0 };
    for (const m of this.members) {
      this.pointAt(this.s - m.offset, p);
      const sway = m.kind === 'dancer' ? Math.sin(time * 3 + m.side) * 0.8 : 0;
      m.root.position.set(p.x + Math.cos(p.heading) * (m.side + sway), 0, p.z - Math.sin(p.heading) * (m.side + sway));
      m.root.rotation.y = p.heading + (m.kind === 'dancer' ? Math.sin(time * 4 + m.side) * 0.9 : 0);
      if (m.kind === 'elephant') {
        // A slow, heavy sway.
        m.root.rotation.z = Math.sin(time * 1.6 + m.offset) * 0.03;
        m.root.position.y = Math.abs(Math.sin(time * 1.6 + m.offset)) * 0.06;
      }
      const near = Math.hypot(m.root.position.x - player.x, m.root.position.z - player.z) < 220;
      m.root.visible = near;
      if (near && m.human) m.human.animate(dt, m.kind === 'dancer' && Math.sin(time * 2 + m.offset) > 0.6 ? 'wave' : 'walk', Perahera.SPEED, time + m.offset);
    }
    this.v.set(0, 0, 0);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
