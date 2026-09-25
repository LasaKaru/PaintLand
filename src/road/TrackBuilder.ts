import * as THREE from 'three';
import { ROAD_STEP, RoadPath } from './RoadPath';
import { deg } from '../core/MathUtil';

/** One piece of road. Rotations are spread evenly over the length. */
export interface SegmentSpec {
  length: number;
  /** Turn left (+) / right (-) in degrees, about the road's own up. */
  yaw?: number;
  /** Turn left/right about the *world* vertical instead (flat banked curves). */
  yawWorld?: number;
  /** Nose up (+) / down (-) in degrees. */
  pitch?: number;
  /** Roll clockwise seen from behind (+), in degrees. */
  roll?: number;
  /** Sideways drift in metres (used so a loop's exit clears its entry). */
  shift?: number;
  /** Extra world-vertical climb in metres (helixes). */
  rise?: number;
  /** Road width at the end of the segment (blends from the current width). */
  width?: number;
  /** Plaza width at the end of the segment. */
  plaza?: number;
}

const SUBSTEP = 0.1;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/**
 * "Turtle" road builder. A route is written as a list of moves
 * (straight, turn, pitch, roll, loop) and the builder integrates an exact
 * frame (forward, up) along it. Because the up vector comes from the turtle,
 * loops, walls and ceilings never flip (docs/04 §2).
 */
export class TrackBuilder {
  private readonly pos = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly up = new THREE.Vector3();
  private width: number;
  private plaza = 0;
  private district = 0;
  private rails = 0;
  private travelled = 0;
  private nextSampleAt = 0;

  private readonly outPos: number[] = [];
  private readonly outUp: number[] = [];
  private readonly outWidth: number[] = [];
  private readonly outDistrict: number[] = [];
  private readonly outRails: number[] = [];
  private readonly outPlaza: number[] = [];

  constructor(start: THREE.Vector3, forward: THREE.Vector3, up: THREE.Vector3, width: number) {
    this.pos.copy(start);
    this.fwd.copy(forward).normalize();
    this.up.copy(up).normalize();
    this.width = width;
    this.record();
  }

  setDistrict(index: number): this {
    this.district = index;
    return this;
  }

  setRails(on: boolean): this {
    this.rails = on ? 1 : 0;
    return this;
  }

  straight(length: number, extra: Omit<SegmentSpec, 'length'> = {}): this {
    return this.segment({ length, ...extra });
  }

  turn(degrees: number, radius: number, extra: Omit<SegmentSpec, 'length' | 'yaw'> = {}): this {
    return this.segment({ length: Math.abs(deg(degrees)) * radius, yaw: degrees, ...extra });
  }

  pitch(degrees: number, radius: number, extra: Omit<SegmentSpec, 'length' | 'pitch'> = {}): this {
    return this.segment({ length: Math.abs(deg(degrees)) * radius, pitch: degrees, ...extra });
  }

  roll(degrees: number, length: number, extra: Omit<SegmentSpec, 'length' | 'roll'> = {}): this {
    return this.segment({ length, roll: degrees, ...extra });
  }

  /** A full vertical loop that drifts sideways by `shift` so the exit clears the entry. */
  loop(radius: number, shift: number): this {
    return this.segment({ length: Math.PI * 2 * radius, pitch: 360, shift });
  }

  segment(spec: SegmentSpec): this {
    const steps = Math.max(1, Math.round(spec.length / SUBSTEP));
    const ds = spec.length / steps;
    const yawStep = deg(spec.yaw ?? 0) / steps;
    const yawWorldStep = deg(spec.yawWorld ?? 0) / steps;
    const pitchStep = deg(spec.pitch ?? 0) / steps;
    const rollStep = deg(spec.roll ?? 0) / steps;
    const shiftStep = (spec.shift ?? 0) / steps;
    const riseStep = (spec.rise ?? 0) / steps;
    const width0 = this.width;
    const width1 = spec.width ?? this.width;
    const plaza0 = this.plaza;
    const plaza1 = spec.plaza ?? this.plaza;
    const right = new THREE.Vector3();
    const q = new THREE.Quaternion();

    for (let k = 1; k <= steps; k++) {
      right.crossVectors(this.fwd, this.up).normalize();
      if (yawStep) {
        q.setFromAxisAngle(this.up, yawStep);
        this.fwd.applyQuaternion(q);
      }
      if (yawWorldStep) {
        q.setFromAxisAngle(WORLD_UP, yawWorldStep);
        this.fwd.applyQuaternion(q);
        this.up.applyQuaternion(q);
      }
      if (pitchStep) {
        q.setFromAxisAngle(right, pitchStep);
        this.fwd.applyQuaternion(q);
        this.up.applyQuaternion(q);
      }
      if (rollStep) {
        q.setFromAxisAngle(this.fwd, rollStep);
        this.up.applyQuaternion(q);
      }
      // Keep the frame orthonormal against numerical drift.
      this.fwd.normalize();
      right.crossVectors(this.fwd, this.up).normalize();
      this.up.crossVectors(right, this.fwd).normalize();

      this.pos.addScaledVector(this.fwd, ds).addScaledVector(right, shiftStep);
      this.pos.y += riseStep;
      this.travelled += ds;
      const t = k / steps;
      this.width = width0 + (width1 - width0) * t;
      this.plaza = plaza0 + (plaza1 - plaza0) * t;
      while (this.travelled + 1e-6 >= this.nextSampleAt) this.record();
    }
    return this;
  }

  private record(): void {
    this.outPos.push(this.pos.x, this.pos.y, this.pos.z);
    this.outUp.push(this.up.x, this.up.y, this.up.z);
    this.outWidth.push(this.width);
    this.outDistrict.push(this.district);
    this.outRails.push(this.rails);
    this.outPlaza.push(this.plaza);
    this.nextSampleAt += ROAD_STEP;
  }

  /**
   * Finish the route. Tangents are recomputed from the sampled positions, so
   * sideways shifts and rises stay consistent with the direction of travel.
   */
  build(): RoadPath {
    const n = this.outWidth.length;
    const positions = new Float32Array(this.outPos);
    const ups = new Float32Array(this.outUp);
    const tangents = new Float32Array(n * 3);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const t = new THREE.Vector3();
    const u = new THREE.Vector3();
    const r = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      a.fromArray(positions, Math.max(0, i - 1) * 3);
      b.fromArray(positions, Math.min(n - 1, i + 1) * 3);
      t.subVectors(b, a).normalize();
      u.fromArray(ups, i * 3);
      r.crossVectors(t, u).normalize();
      u.crossVectors(r, t).normalize();
      t.toArray(tangents, i * 3);
      u.toArray(ups, i * 3);
    }
    return new RoadPath(
      positions,
      tangents,
      ups,
      new Float32Array(this.outWidth),
      new Uint8Array(this.outDistrict),
      new Uint8Array(this.outRails),
      new Float32Array(this.outPlaza),
    );
  }
}
