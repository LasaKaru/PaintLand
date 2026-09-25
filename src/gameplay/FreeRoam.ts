import { clamp, wrapAngle } from '../core/MathUtil';
import type { VehicleTuning } from './RoverController';
import { HUMAN_TUNING } from './HumanController';
import type { HumanPose } from '../models/Human';

/**
 * Free-roam movement for walkable hubs (docs/04 §3, docs/05 §4.2): a car and a
 * walker on open, flat ground with solid buildings — the "free driving" mode
 * that complements ribbon driving on routes. Heading 0 faces −Z; positive
 * heading turns left (counter-clockwise seen from above), like three.js yaw.
 */

export type Collider = { type: 'circle'; x: number; z: number; r: number } | { type: 'box'; x: number; z: number; hx: number; hz: number };

/** A boost pad on the ground: drive over it for a burst of speed. */
export interface Pad {
  x: number;
  z: number;
  r: number;
}

/** A ramp: approach roughly along `heading` to launch; `stunt` ramps are scored jumps. */
export interface Ramp {
  x: number;
  z: number;
  heading: number;
  halfWidth: number;
  halfLength: number;
  power: number;
  stunt: boolean;
}

export class FreeWorld {
  readonly colliders: Collider[] = [];
  readonly pads: Pad[] = [];
  readonly ramps: Ramp[] = [];
  constructor(
    readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    readonly groundY = 0,
  ) {}

  circle(x: number, z: number, r: number): void {
    this.colliders.push({ type: 'circle', x, z, r });
  }

  box(x: number, z: number, hx: number, hz: number): void {
    this.colliders.push({ type: 'box', x, z, hx, hz });
  }

  /**
   * Push a circle (x, z, radius) out of every collider and the bounds.
   * Returns the push normal of the deepest hit, or null when nothing was touched.
   */
  resolve(p: { x: number; z: number }, radius: number): { nx: number; nz: number } | null {
    let hit: { nx: number; nz: number; depth: number } | null = null;
    for (const c of this.colliders) {
      let nx = 0;
      let nz = 0;
      let depth = 0;
      if (c.type === 'circle') {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + radius;
        if (d >= min) continue;
        nx = d > 1e-6 ? dx / d : 1;
        nz = d > 1e-6 ? dz / d : 0;
        depth = min - d;
      } else {
        const cx = clamp(p.x, c.x - c.hx, c.x + c.hx);
        const cz = clamp(p.z, c.z - c.hz, c.z + c.hz);
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d >= radius) continue;
        if (d > 1e-6) {
          nx = dx / d;
          nz = dz / d;
          depth = radius - d;
        } else {
          // Centre inside the box: leave by the nearest face.
          const ex = c.hx - Math.abs(p.x - c.x);
          const ez = c.hz - Math.abs(p.z - c.z);
          if (ex < ez) {
            nx = Math.sign(p.x - c.x) || 1;
            depth = ex + radius;
          } else {
            nz = Math.sign(p.z - c.z) || 1;
            depth = ez + radius;
          }
        }
      }
      p.x += nx * depth;
      p.z += nz * depth;
      if (!hit || depth > hit.depth) hit = { nx, nz, depth };
    }
    const b = this.bounds;
    const bx = clamp(p.x, b.minX + radius, b.maxX - radius);
    const bz = clamp(p.z, b.minZ + radius, b.maxZ - radius);
    if (bx !== p.x || bz !== p.z) {
      const nx = Math.sign(bx - p.x);
      const nz = Math.sign(bz - p.z);
      p.x = bx;
      p.z = bz;
      if (!hit) hit = { nx, nz, depth: 0 };
    }
    return hit ? { nx: hit.nx, nz: hit.nz } : null;
  }
}

export interface FreeCarInput {
  throttle: number;
  brake: number;
  steer: number;
  hop: boolean;
  boost: boolean;
  drift?: boolean;
}

/** A car on flat ground: bicycle-model steering, a little slip, hops, bumps. */
export class FreeCar {
  x = 0;
  z = 0;
  y = 0;
  heading = 0;
  /** Forward speed (m/s, negative = reversing). */
  v = 0;
  /** Sideways slip speed (m/s). */
  slip = 0;
  vy = 0;
  grounded = true;
  boosting = false;
  braking = false;
  boostMeter = 0.5;
  prevX = 0;
  prevZ = 0;
  prevY = 0;
  prevHeading = 0;
  onBump: ((impact: number) => void) | null = null;
  /** Mini-turbo after a drift (charge 0..1), pad boosts, ramp launches, landings. */
  onMiniTurbo: ((charge: number) => void) | null = null;
  onPad: (() => void) | null = null;
  onRamp: ((ramp: Ramp) => void) | null = null;
  onLand: ((airTime: number) => void) | null = null;
  drifting = false;
  driftCharge = 0;
  airTime = 0;
  /** Seconds of pad/turbo boost left. */
  burst = 0;
  private padCooldown = 0;
  lastRamp: Ramp | null = null;
  readonly radius = 1.35;
  /** Hubs are slow places: a speed limit below the route top speed. */
  topSpeed = 26;

  constructor(public tuning: VehicleTuning) {}

  place(x: number, z: number, heading: number): void {
    this.x = this.prevX = x;
    this.z = this.prevZ = z;
    this.y = this.prevY = 0;
    this.heading = this.prevHeading = heading;
    this.v = this.slip = this.vy = 0;
    this.grounded = true;
    this.drifting = false;
    this.driftCharge = this.burst = 0;
  }

  step(dt: number, input: FreeCarInput, world: FreeWorld): void {
    const T = this.tuning;
    this.prevX = this.x;
    this.prevZ = this.z;
    this.prevY = this.y;
    this.prevHeading = this.heading;

    const top = Math.min(this.topSpeed, T.topSpeed);
    this.burst = Math.max(0, this.burst - dt);
    this.padCooldown = Math.max(0, this.padCooldown - dt);
    this.boosting = (input.boost && this.boostMeter > 0 && this.v > 2) || this.burst > 0;
    this.braking = input.brake > 0.05 && this.v > 0.5;
    if (this.boosting) {
      this.v = Math.min(top * (this.burst > 0 ? 1.55 : 1.35), this.v + T.boostAccel * (this.burst > 0 ? 1.2 : 0.7) * dt);
      if (this.burst <= 0) this.boostMeter = Math.max(0, this.boostMeter - T.boostDrain * dt);
    } else if (input.throttle > 0.05) {
      this.v += T.accel * 0.8 * input.throttle * Math.max(0, 1 - this.v / top) * dt;
    }
    if (input.brake > 0.05) {
      if (this.v > 0.3) this.v = Math.max(0, this.v - T.brake * input.brake * dt);
      else this.v = Math.max(-6, this.v - 6 * input.brake * dt); // reverse
    }
    if (input.throttle <= 0.05 && input.brake <= 0.05) {
      const drag = 3 * dt;
      this.v = Math.abs(this.v) < drag ? 0 : this.v - Math.sign(this.v) * drag;
    }
    if (this.v > top && !this.boosting) this.v = Math.max(top, this.v - 8 * dt);
    this.boostMeter = Math.min(1, this.boostMeter + 0.04 * dt);

    // Bicycle steering: yaw rate = v / wheelbase · tan(steer angle); the angle narrows with speed.
    const wheelbase = 2.6;
    const maxAngle = 0.62 / (1 + Math.abs(this.v) / 18);
    // Drift: hold the drift key while turning at speed to slide wide and charge a mini-turbo.
    const wantDrift = !!input.drift && this.grounded && this.v > 12 && Math.abs(input.steer) > 0.25;
    if (wantDrift) {
      this.drifting = true;
      this.driftCharge = Math.min(1, this.driftCharge + dt / 1.6);
    } else if (this.drifting) {
      this.drifting = false;
      if (this.driftCharge > 0.35) {
        this.burst = 0.4 + this.driftCharge * 0.8;
        this.onMiniTurbo?.(this.driftCharge);
      }
      this.driftCharge = 0;
    }
    const yawRate = (this.v / wheelbase) * Math.tan(clamp(input.steer, -1, 1) * maxAngle * (this.drifting ? 1.45 : 1)) * (this.grounded ? 1 : 0.3);
    this.heading = wrapAngle(this.heading - yawRate * dt);
    // Slip builds in fast turns and decays (a little drift; a lot while drifting).
    this.slip += (yawRate * this.v * (this.drifting ? 0.06 : 0.02) - this.slip * (this.drifting ? 1.2 : 3)) * dt;
    if (this.drifting) this.v -= 1.2 * dt;

    const fx = -Math.sin(this.heading);
    const fz = -Math.cos(this.heading);
    this.x += (fx * this.v + fz * this.slip) * dt;
    this.z += (fz * this.v - fx * this.slip) * dt;

    if (input.hop && this.grounded) {
      this.vy = T.hopSpeed * 0.9;
      this.grounded = false;
      this.airTime = 0;
    }
    // Boost pads and ramps.
    if (this.grounded && this.padCooldown <= 0) {
      for (const p of world.pads) {
        if (Math.hypot(this.x - p.x, this.z - p.z) < p.r) {
          this.burst = 1.2;
          this.padCooldown = 1;
          this.onPad?.();
          break;
        }
      }
    }
    if (this.grounded && this.v > 8) {
      for (const r of world.ramps) {
        const dx = this.x - r.x;
        const dz = this.z - r.z;
        // Ramp-local coordinates: along = distance along the ramp's heading.
        const along = -Math.sin(r.heading) * dx - Math.cos(r.heading) * dz;
        const across = Math.cos(r.heading) * dx - Math.sin(r.heading) * dz;
        if (Math.abs(along) < r.halfLength && Math.abs(across) < r.halfWidth && Math.cos(wrapAngle(this.heading - r.heading)) > 0.5) {
          this.vy = r.power + this.v * 0.18;
          this.grounded = false;
          this.airTime = 0;
          this.lastRamp = r;
          this.onRamp?.(r);
          break;
        }
      }
    }
    if (!this.grounded) {
      this.vy -= T.gravity * dt;
      this.y += this.vy * dt;
      this.airTime += dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.onLand?.(this.airTime);
        this.lastRamp = null;
      }
    }

    const hit = world.resolve(this, this.radius);
    if (hit) {
      // Speed into the wall is lost; a hard hit bounces back a little.
      const into = -(fx * hit.nx + fz * hit.nz);
      if (into > 0.2 && Math.abs(this.v) > 2) {
        const impact = Math.abs(this.v) * into;
        this.v = -this.v * 0.25 * into + this.v * (1 - into);
        this.onBump?.(impact);
      }
      this.slip *= 0.5;
    }
  }

  get speedKmh(): number {
    return Math.abs(this.v) * 3.6;
  }

  lerp(alpha: number): { x: number; y: number; z: number; heading: number } {
    return {
      x: this.prevX + (this.x - this.prevX) * alpha,
      y: this.prevY + (this.y - this.prevY) * alpha,
      z: this.prevZ + (this.z - this.prevZ) * alpha,
      heading: this.prevHeading + wrapAngle(this.heading - this.prevHeading) * alpha,
    };
  }
}

export interface FreeWalkInput {
  moveX: number;
  moveY: number;
  /** Camera yaw in world space (0 = looking toward −Z). */
  cameraYaw: number;
  sprint: boolean;
  walk: boolean;
  jump: boolean;
  faceCamera: boolean;
}

/** On foot in a hub: camera-relative movement, jumps, solid walls. */
export class FreeWalker {
  x = 0;
  z = 0;
  y = 0;
  vx = 0;
  vz = 0;
  vy = 0;
  heading = 0;
  grounded = true;
  pose: HumanPose = 'idle';
  prevX = 0;
  prevZ = 0;
  prevY = 0;
  prevHeading = 0;

  place(x: number, z: number, heading: number): void {
    this.x = this.prevX = x;
    this.z = this.prevZ = z;
    this.y = this.prevY = 0;
    this.vx = this.vz = this.vy = 0;
    this.heading = this.prevHeading = heading;
    this.grounded = true;
  }

  get speed(): number {
    return Math.hypot(this.vx, this.vz);
  }

  step(dt: number, input: FreeWalkInput, world: FreeWorld): void {
    const T = HUMAN_TUNING;
    this.prevX = this.x;
    this.prevZ = this.z;
    this.prevY = this.y;
    this.prevHeading = this.heading;
    const len = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const max = input.walk ? T.walk : input.sprint ? T.sprint : T.jog;
    const cy = input.cameraYaw;
    // Camera forward (−sin, −cos) and right (cos, −sin).
    let dx = -Math.sin(cy) * input.moveY + Math.cos(cy) * input.moveX;
    let dz = -Math.cos(cy) * input.moveY - Math.sin(cy) * input.moveX;
    const dl = Math.hypot(dx, dz);
    if (dl > 0) {
      dx = (dx / dl) * len * max;
      dz = (dz / dl) * len * max;
    }
    const rate = (len > 0.05 ? T.accel : T.decel) * (this.grounded ? 1 : T.airControl) * dt;
    this.vx = approach(this.vx, dx, rate);
    this.vz = approach(this.vz, dz, rate);
    this.x += this.vx * dt;
    this.z += this.vz * dt;
    if (input.jump && this.grounded) {
      this.vy = T.jumpSpeed;
      this.grounded = false;
    }
    if (!this.grounded) {
      this.vy -= T.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
    const hit = world.resolve(this, T.radius);
    if (hit) {
      const into = this.vx * hit.nx + this.vz * hit.nz;
      if (into < 0) {
        this.vx -= into * hit.nx;
        this.vz -= into * hit.nz;
      }
    }
    const sp = this.speed;
    let target = this.heading;
    if (input.faceCamera) target = cy;
    else if (sp > 0.3) target = Math.atan2(-this.vx, -this.vz);
    const diff = wrapAngle(target - this.heading);
    this.heading = wrapAngle(this.heading + clamp(diff, -T.turnRate * dt, T.turnRate * dt));
    this.pose = !this.grounded ? 'air' : sp > 5.5 ? 'run' : sp > 0.4 ? 'walk' : 'idle';
  }

  lerp(alpha: number): { x: number; y: number; z: number; heading: number } {
    return {
      x: this.prevX + (this.x - this.prevX) * alpha,
      y: this.prevY + (this.y - this.prevY) * alpha,
      z: this.prevZ + (this.z - this.prevZ) * alpha,
      heading: this.prevHeading + wrapAngle(this.heading - this.prevHeading) * alpha,
    };
  }
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(v + maxDelta, target);
  return Math.max(v - maxDelta, target);
}
