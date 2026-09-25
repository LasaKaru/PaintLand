import * as THREE from 'three';
import { RoadPath, createFrame, type RoadFrame } from '../road/RoadPath';
import type { CameraBlocker } from '../world/Decorator';
import { clamp, damp, dampScalar, lerp } from '../core/MathUtil';

export type DriveCamera = 'chase' | 'low' | 'drone' | 'cinema' | 'cockpit';
export type FootCamera = 'third' | 'first';

export const DRIVE_CAMERAS: DriveCamera[] = ['chase', 'low', 'drone', 'cinema', 'cockpit'];
export const FOOT_CAMERAS: FootCamera[] = ['third', 'first'];

interface DriveProfile {
  back: number;
  up: number;
  side: number;
  lookAhead: number;
  lookUp: number;
  follow: number;
}

const PROFILES: Record<Exclude<DriveCamera, 'cockpit'>, DriveProfile> = {
  chase: { back: 7.5, up: 3.0, side: 0, lookAhead: 12, lookUp: 1.4, follow: 10 },
  low: { back: 4.6, up: 1.35, side: 0, lookAhead: 14, lookUp: 1.1, follow: 12 },
  drone: { back: 15, up: 11, side: 0, lookAhead: 16, lookUp: 0, follow: 6 },
  cinema: { back: 5.5, up: 1.1, side: 2.8, lookAhead: 6, lookUp: 1.5, follow: 4 },
};

/** Where the pawn is, in road coordinates, plus a few hints. */
export interface CameraTarget {
  s: number;
  x: number;
  h: number;
  /** Facing relative to the road tangent (on foot), or visual yaw (rover). */
  yaw: number;
  speed: number;
  boosting: boolean;
  /** World position of the eyes/head (first person / cockpit). */
  eye?: THREE.Vector3;
}

/**
 * One camera for every pawn (docs/05 §5). It follows the *road*, not the
 * world: the chase camera sits on the ribbon behind the rover and looks
 * ahead along the spline, and its up vector blends toward the road's up, so
 * loops and ceilings feel natural. It never enters buildings or foliage
 * (sphere blockers) and never dips under the sea.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  driveMode: DriveCamera = 'chase';
  footMode: FootCamera = 'third';
  zoom = 1;
  baseFov = 72;
  /** 0 = world-up horizon, 1 = fully follows the road (settings: roll in loops). */
  rollFollow = 1;
  shake = 0.5;
  /** On-foot orbit angles relative to the road frame. */
  orbitYaw = 0;
  orbitPitch = 0.25;
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly eye = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly desiredEye = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly f: RoadFrame = createFrame();
  private readonly f2: RoadFrame = createFrame();
  private lateral = 0;
  private height = 0;
  private fovKick = 0;
  private shakeAmount = 0;
  private initialised = false;

  constructor(private readonly path: RoadPath, private readonly blockers: CameraBlocker[], aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.3, 5000);
  }

  cycleDrive(): DriveCamera {
    this.driveMode = DRIVE_CAMERAS[(DRIVE_CAMERAS.indexOf(this.driveMode) + 1) % DRIVE_CAMERAS.length];
    return this.driveMode;
  }

  cycleFoot(): FootCamera {
    this.footMode = this.footMode === 'third' ? 'first' : 'third';
    return this.footMode;
  }

  addShake(amount: number): void {
    this.shakeAmount = Math.max(this.shakeAmount, amount * this.shake);
  }

  /** A point on (or beyond the ends of) the road in road coordinates. */
  private roadPoint(s: number, x: number, h: number, out: THREE.Vector3, frame: RoadFrame): THREE.Vector3 {
    const clamped = clamp(s, 0, this.path.length);
    this.path.sample(clamped, frame);
    out.copy(frame.position).addScaledVector(frame.right, x).addScaledVector(frame.up, h);
    if (s !== clamped) out.addScaledVector(frame.tangent, s - clamped);
    return out;
  }

  snap(): void {
    this.initialised = false;
  }

  updateDrive(dt: number, t: CameraTarget): void {
    const mode = this.driveMode;
    const k = damp(8, dt);
    if (mode === 'cockpit' && t.eye) {
      this.path.sample(t.s, this.f);
      const yawQ = new THREE.Quaternion().setFromAxisAngle(this.f.up, -t.yaw);
      const fwd = this.f.tangent.clone().applyQuaternion(yawQ);
      this.desiredEye.copy(t.eye);
      this.desiredLook.copy(t.eye).addScaledVector(fwd, 20).addScaledVector(this.f.up, -1.2);
      this.eye.copy(this.desiredEye);
      this.look.lerp(this.desiredLook, this.initialised ? k : 1);
      this.up.lerp(this.f.up, this.initialised ? damp(10, dt) : 1).normalize();
      this.applyFov(dt, t);
      this.finish(dt, false);
      return;
    }
    const p = PROFILES[mode as Exclude<DriveCamera, 'cockpit'>];
    const back = p.back * this.zoom;
    const up = p.up * this.zoom;
    this.lateral = this.initialised ? dampScalar(this.lateral, t.x * 0.65, 5, dt) : t.x * 0.65;
    this.height = this.initialised ? dampScalar(this.height, t.h * 0.6, 5, dt) : t.h * 0.6;

    // Eye sits on the ribbon behind the rover; the look target leads along the spline.
    const lead = p.lookAhead + Math.min(t.speed, 60) * 0.18;
    this.roadPoint(t.s - back, this.lateral + p.side, up + this.height, this.desiredEye, this.f2);
    this.roadPoint(t.s + lead, t.x * 0.8, p.lookUp + t.h * 0.5, this.desiredLook, this.f);
    if (mode === 'drone') this.roadPoint(t.s + lead * 0.5, t.x, 0, this.desiredLook, this.f);

    const follow = damp(p.follow, dt);
    this.eye.lerp(this.desiredEye, this.initialised ? follow : 1);
    this.look.lerp(this.desiredLook, this.initialised ? damp(12, dt) : 1);

    // Up vector: blend toward the road's up; faster when the road is rolling a lot.
    this.path.sample(t.s, this.f);
    const targetUp = _v.set(0, 1, 0).lerp(this.f.up, this.rollFollow).normalize();
    if (targetUp.lengthSq() < 0.01) targetUp.copy(this.f.up);
    const upRate = 3 + (1 - Math.abs(this.f.up.y)) * 5;
    this.up.lerp(targetUp, this.initialised ? damp(upRate, dt) : 1).normalize();

    this.applyFov(dt, t);
    this.collide(this.roadPoint(t.s, t.x, t.h + 1.5, _origin, this.f2));
    this.finish(dt, true);
  }

  updateFoot(dt: number, t: CameraTarget): void {
    this.path.sample(t.s, this.f);
    const head = this.roadPoint(t.s, t.x, t.h + 1.45, _origin, this.f2);
    // Forward direction from orbit angles in the road frame.
    const cy = this.orbitYaw;
    const cp = this.orbitPitch;
    const fwd = _v
      .copy(this.f.tangent)
      .multiplyScalar(Math.cos(cp) * Math.cos(cy))
      .addScaledVector(this.f.right, Math.cos(cp) * Math.sin(cy))
      .addScaledVector(this.f.up, -Math.sin(cp));

    if (this.footMode === 'first' && t.eye) {
      this.eye.copy(t.eye);
      this.look.copy(t.eye).add(fwd);
    } else {
      const dist = 3.6 * this.zoom;
      const rightV = _r.crossVectors(fwd, this.f.up).normalize();
      this.desiredEye.copy(head).addScaledVector(fwd, -dist).addScaledVector(rightV, 0.45).addScaledVector(this.f.up, 0.25);
      this.desiredLook.copy(head).addScaledVector(fwd, 4).addScaledVector(rightV, 0.45);
      const k = this.initialised ? damp(18, dt) : 1;
      this.eye.lerp(this.desiredEye, k);
      this.look.lerp(this.desiredLook, this.initialised ? damp(24, dt) : 1);
      this.collide(head);
    }
    this.up.lerp(this.f.up, this.initialised ? damp(4, dt) : 1).normalize();
    this.applyFov(dt, t);
    this.finish(dt, this.footMode === 'third');
  }

  /** Slow orbit for the title screen. */
  updateOrbit(dt: number, time: number, s: number): void {
    this.path.sample(s, this.f);
    const a = time * 0.08;
    const target = _origin.copy(this.f.position).addScaledVector(this.f.up, 3);
    this.desiredEye.copy(target).add(_v.set(Math.sin(a) * 26, 9 + Math.sin(time * 0.2) * 2, Math.cos(a) * 26));
    this.eye.lerp(this.desiredEye, this.initialised ? damp(2, dt) : 1);
    this.look.lerp(target, this.initialised ? damp(3, dt) : 1);
    this.up.set(0, 1, 0);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.finish(dt, true);
  }

  private applyFov(dt: number, t: CameraTarget): void {
    const speedKick = clamp((t.speed - 25) / 35, 0, 1) * 6 + (t.boosting ? 8 : 0);
    this.fovKick = dampScalar(this.fovKick, speedKick, 3, dt);
    const fov = this.baseFov + this.fovKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Pull the camera in front of anything between it and the pawn (fixes reference bug P1). */
  private collide(origin: THREE.Vector3): void {
    const dir = _d.subVectors(this.eye, origin);
    const dist = dir.length();
    if (dist < 0.01) return;
    dir.divideScalar(dist);
    let nearest = dist;
    for (const b of this.blockers) {
      const oc = _oc.subVectors(origin, b.center);
      if (oc.lengthSq() > (dist + b.radius) * (dist + b.radius)) continue;
      const bb = oc.dot(dir);
      const c = oc.lengthSq() - b.radius * b.radius;
      if (c < 0) continue; // pawn is inside the blocker's sphere; ignore
      const disc = bb * bb - c;
      if (disc < 0) continue;
      const hit = -bb - Math.sqrt(disc);
      if (hit > 0 && hit < nearest) nearest = hit;
    }
    if (nearest < dist) this.eye.copy(origin).addScaledVector(dir, Math.max(1.2, nearest - 0.4));
  }

  private finish(dt: number, clampWater: boolean): void {
    // Never under the sea (fixes reference bug P2).
    if (clampWater && this.eye.y < 1.5) this.eye.y = lerp(this.eye.y, 1.5, 1);
    this.camera.position.copy(this.eye);
    if (this.shakeAmount > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmount;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = dampScalar(this.shakeAmount, 0, 8, dt);
    }
    this.camera.up.copy(this.up);
    this.camera.lookAt(this.look);
    this.camera.updateMatrixWorld();
    this.initialised = true;
  }
}

const _v = new THREE.Vector3();
const _r = new THREE.Vector3();
const _d = new THREE.Vector3();
const _oc = new THREE.Vector3();
const _origin = new THREE.Vector3();
