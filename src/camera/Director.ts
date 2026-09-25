import * as THREE from 'three';
import type { RoadPath } from '../road/RoadPath';
import { createFrame } from '../road/RoadPath';
import type { CameraBlocker, Landmark } from '../world/Decorator';
import { damp } from '../core/MathUtil';

export type ShotKind = 'chaseLow' | 'orbit' | 'flyby' | 'drone' | 'side' | 'landmark' | 'front';

export interface Shot {
  kind: ShotKind;
  duration: number;
  /** For landmark shots: which landmark (index into the list). */
  landmark?: number;
  /** Subtitle shown during the shot (intro). */
  line?: string;
}

/** What the director films: a road-riding subject. */
export interface Subject {
  s: number;
  x: number;
  h: number;
  position: THREE.Vector3;
}

/**
 * A cinematic camera for the menu background and the story intro (docs/10 §1):
 * it cuts between low tracking shots, orbits, roadside flybys, drone views and
 * slow crane moves around landmarks, like a gameplay trailer running behind the menu.
 */
export class Director {
  private shots: Shot[] = [];
  private index = 0;
  private t = 0;
  private scripted = false;
  private readonly frame = createFrame();
  private readonly eye = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private flybyPoint = new THREE.Vector3();
  private cut = true;
  onCut: ((shot: Shot) => void) | null = null;
  /** Showcase target (wardrobe / garage). */
  showcase: { target: THREE.Vector3; distance: number; height: number; up: THREE.Vector3 } | null = null;

  constructor(private readonly camera: THREE.PerspectiveCamera, private path: RoadPath, private landmarks: Landmark[], private blockers: CameraBlocker[] = []) {}

  setWorld(path: RoadPath, landmarks: Landmark[]): void {
    this.path = path;
    this.landmarks = landmarks;
    this.cut = true;
  }

  /** Endless trailer-style shot rotation. */
  attract(): void {
    this.scripted = false;
    const lm = this.landmarks.length;
    this.shots = [
      { kind: 'chaseLow', duration: 6 },
      { kind: 'flyby', duration: 5 },
      { kind: 'landmark', duration: 7, landmark: 0 },
      { kind: 'orbit', duration: 6 },
      { kind: 'drone', duration: 6 },
      { kind: 'side', duration: 5 },
      { kind: 'landmark', duration: 7, landmark: lm > 1 ? 1 : 0 },
      { kind: 'front', duration: 5 },
      { kind: 'landmark', duration: 7, landmark: lm > 2 ? 2 : 0 },
    ];
    this.index = 0;
    this.t = 0;
    this.cut = true;
  }

  /** A fixed sequence with subtitles; `done` when it ends. */
  script(shots: Shot[]): void {
    this.scripted = true;
    this.shots = shots;
    this.index = 0;
    this.t = 0;
    this.cut = true;
    this.onCut?.(shots[0]);
  }

  get done(): boolean {
    return this.scripted && this.index >= this.shots.length;
  }

  get currentLine(): string | undefined {
    return this.shots[this.index]?.line;
  }

  skip(): void {
    this.index = this.shots.length;
  }

  update(dt: number, time: number, subject: Subject): void {
    if (this.showcase) {
      this.updateShowcase(dt, time);
      return;
    }
    const shot = this.shots[Math.min(this.index, this.shots.length - 1)];
    if (!shot) return;
    this.t += dt;
    if (this.t > shot.duration) {
      this.t = 0;
      this.index++;
      if (!this.scripted) this.index %= this.shots.length;
      this.cut = true;
      const next = this.shots[this.index];
      if (next) this.onCut?.(next);
      if (this.done) return;
    }
    const s = this.shots[this.index];
    if (!s) return;
    const u = this.t / s.duration;
    this.path.sample(subject.s, this.frame);
    const f = this.frame;
    const desiredEye = new THREE.Vector3();
    const desiredLook = subject.position.clone().addScaledVector(f.up, 1.2);
    let upTarget: THREE.Vector3 = f.up;
    let follow = 5;
    switch (s.kind) {
      case 'chaseLow': {
        const back = this.roadPoint(subject.s - 5.5, subject.x + 1.6, subject.h + 0.9);
        desiredEye.copy(back);
        desiredLook.copy(this.roadPoint(subject.s + 10, subject.x, subject.h + 1.3));
        follow = 9;
        break;
      }
      case 'side': {
        desiredEye.copy(this.roadPoint(subject.s + 1, subject.x - 7, subject.h + 1.8));
        follow = 7;
        break;
      }
      case 'front': {
        desiredEye.copy(this.roadPoint(subject.s + 9 - u * 2, subject.x + 1.5, subject.h + 1.4));
        follow = 7;
        break;
      }
      case 'orbit': {
        const a = time * 0.35;
        desiredEye.copy(subject.position).addScaledVector(f.right, Math.cos(a) * 11).addScaledVector(f.tangent, Math.sin(a) * 11).addScaledVector(f.up, 3.5);
        follow = 6;
        break;
      }
      case 'drone': {
        desiredEye.copy(this.roadPoint(subject.s - 16, subject.x, subject.h + 14));
        desiredLook.copy(this.roadPoint(subject.s + 20, subject.x, subject.h));
        follow = 4;
        break;
      }
      case 'flyby': {
        if (this.cut) {
          const side = Math.random() < 0.5 ? -1 : 1;
          this.flybyPoint = this.roadPoint(subject.s + 55, side * (f.width / 2 + 5), 2.2);
        }
        desiredEye.copy(this.flybyPoint);
        upTarget = _worldUp;
        follow = 100;
        break;
      }
      case 'landmark': {
        const lm = this.landmarks[s.landmark ?? 0];
        if (lm) {
          const a = time * 0.08 + (s.landmark ?? 0) * 2;
          const r = 110 - u * 30;
          desiredLook.copy(lm.position);
          desiredEye.set(lm.position.x + Math.cos(a) * r, lm.position.y + 14 + u * 36, lm.position.z + Math.sin(a) * r);
          upTarget = _worldUp;
          follow = 3;
        } else {
          desiredEye.copy(this.roadPoint(subject.s - 20, 0, 20));
        }
        break;
      }
    }
    // Keep the lens above the sea and outside solid landmarks.
    desiredEye.y = Math.max(desiredEye.y, 2);
    for (const b of this.blockers) {
      const d = desiredEye.distanceTo(b.center);
      if (d < b.radius + 2) desiredEye.sub(b.center).setLength(b.radius + 2).add(b.center);
    }
    const k = this.cut ? 1 : damp(follow, dt);
    this.eye.lerp(desiredEye, k);
    this.look.lerp(desiredLook, this.cut ? 1 : damp(8, dt));
    this.up.lerp(upTarget, this.cut ? 1 : damp(3, dt)).normalize();
    this.cut = false;
    this.apply();
  }

  private updateShowcase(dt: number, time: number): void {
    const sc = this.showcase!;
    const a = time * 0.25;
    const side = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const desired = sc.target.clone().addScaledVector(side, sc.distance).addScaledVector(sc.up, sc.height);
    this.eye.lerp(desired, this.cut ? 1 : damp(4, dt));
    this.look.lerp(sc.target, this.cut ? 1 : damp(6, dt));
    this.up.lerp(sc.up, this.cut ? 1 : damp(4, dt)).normalize();
    this.cut = false;
    this.apply();
  }

  /** Where the lens is looking (depth-of-field focus). */
  get focusPoint(): THREE.Vector3 {
    return this.look;
  }

  forceCut(): void {
    this.cut = true;
  }

  private apply(): void {
    this.camera.position.copy(this.eye);
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.look);
    this.camera.updateMatrixWorld();
  }

  private roadPoint(s: number, x: number, h: number): THREE.Vector3 {
    const clamped = Math.max(0, Math.min(this.path.length, s));
    const f = this.path.sample(clamped, createFrame());
    const p = f.position.clone().addScaledVector(f.right, x).addScaledVector(f.up, h);
    if (s !== clamped) p.addScaledVector(f.tangent, s - clamped);
    return p;
  }
}

const _worldUp = new THREE.Vector3(0, 1, 0);
