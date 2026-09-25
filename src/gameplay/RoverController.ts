import { RoadPath, createFrame } from '../road/RoadPath';
import { clamp, dampScalar } from '../core/MathUtil';

/** Tuning values (docs/05 §4.4). Units: metres, seconds. */
export const ROVER_TUNING = {
  topSpeed: 52.8, // 190 km/h
  boostSpeed: 63,
  cruiseFloor: 18.9, // 68 km/h — nobody gets stuck in a loop
  accel: 17,
  boostAccel: 30,
  brake: 30,
  coastDrag: 1.2,
  slopeFactor: 0.28,
  gravity: 22,
  hopSpeed: 9,
  steerLow: 10,
  steerHigh: 6.5,
  steerResponse: 7,
  halfWidth: 1.15,
  boostDrain: 1 / 4, // full meter lasts 4 s
};

export type VehicleTuning = typeof ROVER_TUNING;

export interface RoverInput {
  throttle: number;
  brake: number;
  steer: number;
  hop: boolean;
  boost: boolean;
  drift: boolean;
  shiftUp?: boolean;
  shiftDown?: boolean;
}

/** Gear tops as a fraction of top speed (realistic handling, 6 speeds). */
export const GEAR_TOPS = [0.2, 0.36, 0.52, 0.68, 0.84, 1.0];
export const IDLE_RPM = 900;
export const REDLINE_RPM = 7200;

/** Temporary buffs with drawbacks (docs/06 §3). */
export interface RoverModifiers {
  noBoost: boolean;
  noBrakes: boolean;
  highJumps: boolean;
  speedMul: number;
  wobbly: boolean;
}

export interface RoverEvents {
  onHop?: () => void;
  onLand?: (airTime: number) => void;
  onBump?: (side: number) => void;
  onLap?: () => void;
  onShift?: (gear: number) => void;
}

export type HandlingModel = 'arcade' | 'realistic';

/**
 * The rover on the ribbon (docs/05 §4.1). State is road-relative:
 * distance `s`, sideways `x`, height `h`. Gravity always points into the
 * road, so loops, walls and ceilings need no special cases — and the
 * whole state is a handful of numbers (cheap for ghosts and netcode).
 */
export class RoverController {
  s = 0;
  x = 0;
  h = 0;
  v = 0;
  vx = 0;
  vh = 0;
  grounded = true;
  airTime = 0;
  boostMeter = 0.4;
  boosting = false;
  drifting = false;
  braking = false;
  cruise = false;
  /** Visual yaw (radians) relative to the road, from steering and drift. */
  yaw = 0;
  /** Suspension compression, 0..1 — for body bounce. */
  squash = 0;
  wobbleTime = 0;

  /** Arcade (forgiving, cruise floor) or realistic (gears, grip, drag). */
  handling: HandlingModel = 'arcade';
  gearbox: 'auto' | 'manual' = 'auto';
  /** Hold a minimum speed on flat road once moving. Always on for walls and ceilings. */
  autoCruise = true;
  /** 1..6 in realistic handling. */
  gear = 1;
  rpm = IDLE_RPM;
  /** Longitudinal acceleration (m/s²), for body pitch. */
  longAccel = 0;
  /** Tyres past their grip (realistic): squeal and scrub. */
  sliding = false;
  private shiftTimer = 0;

  prevS = 0;
  prevX = 0;
  prevH = 0;
  prevYaw = 0;

  /** Handling values for the current vehicle (garage choice). */
  tuning: VehicleTuning = { ...ROVER_TUNING };
  readonly mods: RoverModifiers = { noBoost: false, noBrakes: false, highJumps: false, speedMul: 1, wobbly: false };
  private readonly frame = createFrame();

  constructor(private readonly path: RoadPath, private readonly events: RoverEvents = {}) {}

  reset(s: number): void {
    this.s = this.prevS = s;
    this.x = this.prevX = 0;
    this.h = this.prevH = 0;
    this.v = this.vx = this.vh = 0;
    this.yaw = this.prevYaw = 0;
    this.grounded = true;
    this.airTime = 0;
    this.cruise = false;
    this.gear = 1;
    this.rpm = IDLE_RPM;
    this.longAccel = 0;
  }

  get speedKmh(): number {
    return this.v * 3.6;
  }

  step(dt: number, input: RoverInput): void {
    const T = this.tuning;
    this.prevS = this.s;
    this.prevX = this.x;
    this.prevH = this.h;
    this.prevYaw = this.yaw;

    const f = this.path.sample(this.s, this.frame);
    const upright = f.up.y > 0.6;
    const top = T.topSpeed * this.mods.speedMul;
    const vBefore = this.v;
    const real = this.handling === 'realistic';

    // Throttle, brake, cruise.
    if (input.throttle > 0.05) this.cruise = true;
    const canBrake = !this.mods.noBrakes;
    this.braking = canBrake && input.brake > 0.05;
    this.boosting = input.boost && this.boostMeter > 0 && !this.mods.noBoost;

    if (this.boosting) {
      this.v += T.boostAccel * dt;
      this.v = Math.min(this.v, T.boostSpeed * this.mods.speedMul);
      this.boostMeter = Math.max(0, this.boostMeter - T.boostDrain * dt);
    } else if (input.throttle > 0.05) {
      if (real) this.v += this.engineForce(input.throttle, top) * dt;
      else this.v += T.accel * input.throttle * Math.max(0, 1 - this.v / top) * dt;
    } else if (this.v > 0) {
      // Coasting never reverses. Realistic: engine braking + rolling resistance.
      const drag = real ? T.coastDrag + 1.6 + (this.gear <= 2 ? 1.2 : 0) : T.coastDrag;
      this.v = Math.max(0, this.v - drag * dt);
    }
    if (real && this.v > 0) this.v = Math.max(0, this.v - 0.0004 * this.v * this.v * dt); // air drag
    if (real) this.updateGearbox(dt, input, top);
    if (this.v > top && !this.boosting) this.v = dampScalar(this.v, top, 1.5, dt);
    // Brakes only bite on upright road: on walls and ceilings the cruise floor wins,
    // so nobody can stall upside down (docs/05 §4.1).
    if (this.braking && upright) {
      if (this.v > 0.3) this.v = Math.max(0, this.v - T.brake * input.brake * dt);
      else this.v = Math.max(-4, this.v - 3 * input.brake * dt); // hold brake when stopped = slow reverse
      if (this.v < 1) this.cruise = false;
    } else if (this.v < 0) {
      this.v = Math.min(0, this.v + T.brake * dt * 0.3);
    }

    // Hills: uphill slows, downhill speeds up.
    this.v -= T.gravity * f.tangent.y * T.slopeFactor * dt;

    // Cruise floor: always on steep or inverted road, otherwise while cruising (if enabled).
    const floor = !upright || (this.autoCruise && this.cruise && !this.braking) ? T.cruiseFloor : 0;
    if (this.v < floor) this.v = dampScalar(this.v, floor, upright ? 4 : 6, dt);

    // Steering and drift.
    this.drifting = this.grounded && Math.abs(input.steer) > 0.3 && this.v > 22 && (input.drift || (input.brake > 0.2 && input.throttle > 0.2));
    const speedT = clamp(this.v / T.topSpeed, 0, 1);
    let steer = input.steer;
    if (this.mods.wobbly) {
      this.wobbleTime += dt;
      steer += Math.sin(this.wobbleTime * 5.3) * 0.35;
    }
    const steerSpeed = (T.steerLow + (T.steerHigh - T.steerLow) * speedT) * (this.drifting ? 1.45 : 1) * (this.grounded ? 1 : 0.5);
    let targetVx = steer * steerSpeed * Math.min(1, Math.abs(this.v) / 6 + 0.2);
    if (real) {
      // Less steering at speed, and a grip limit: ask for more than the tyres give and you slide.
      targetVx *= 1 / (1 + this.v / 45);
      const before = this.vx;
      this.vx = dampScalar(this.vx, targetVx, T.steerResponse * 0.65, dt);
      const latAccel = Math.abs(this.vx - before) / dt + Math.abs(this.vx) * Math.abs(this.v) * 0.02;
      const grip = 14 * (this.grounded ? 1 : 0.2);
      this.sliding = this.grounded && latAccel > grip && this.v > 15;
      if (this.sliding) {
        this.v -= (latAccel - grip) * 0.12 * dt;
        this.boostMeter = Math.min(1, this.boostMeter + 0.05 * dt);
      }
      this.v -= Math.abs(this.vx) * 0.05 * dt; // tyre scrub
    } else {
      this.sliding = false;
      this.vx = dampScalar(this.vx, targetVx, T.steerResponse, dt);
    }
    this.x += this.vx * dt;
    if (this.drifting) {
      this.v -= 1.5 * dt;
      this.boostMeter = Math.min(1, this.boostMeter + 0.12 * dt);
    }

    // Kerbs push the rover back in.
    const limit = f.width / 2 - T.halfWidth;
    if (Math.abs(this.x) > limit) {
      const side = Math.sign(this.x);
      this.x = side * limit;
      if (Math.sign(this.vx) === side && Math.abs(this.vx) > 2) {
        this.events.onBump?.(side);
        this.v *= 0.97;
      }
      this.vx = -this.vx * 0.3;
    }

    // Hop and air time. Gravity is along the road's up, so hops on a ceiling land back on the ceiling.
    if (input.hop && this.grounded) {
      this.vh = T.hopSpeed * (this.mods.highJumps ? 1.6 : 1);
      this.grounded = false;
      this.airTime = 0;
      this.events.onHop?.();
    }
    if (!this.grounded) {
      const g = T.gravity * (this.mods.highJumps ? 0.55 : 1);
      this.vh -= g * dt;
      this.h += this.vh * dt;
      this.airTime += dt;
      this.boostMeter = Math.min(1, this.boostMeter + 0.1 * dt);
      if (this.h <= 0) {
        this.h = 0;
        this.grounded = true;
        this.squash = clamp(-this.vh / 14, 0.2, 1);
        this.vh = 0;
        if (this.airTime > 0.6) this.v += 3; // clean landing boost
        this.events.onLand?.(this.airTime);
      }
    }
    this.squash = dampScalar(this.squash, 0, 6, dt);

    // Visual yaw: the body points where it is going, plus drift angle.
    const targetYaw = Math.atan2(this.vx, Math.max(Math.abs(this.v), 4)) + (this.drifting ? Math.sign(input.steer) * 0.4 : 0);
    this.yaw = dampScalar(this.yaw, targetYaw, 8, dt);

    this.longAccel = dampScalar(this.longAccel, (this.v - vBefore) / dt, 6, dt);
    this.s += this.v * dt;
    if (this.s < 0) {
      this.s = 0;
      this.v = 0;
    }
    if (this.s >= this.path.length - 0.5) this.events.onLap?.();
  }

  /** Drive force from a torque curve: strong mid-range, falling off at the redline; low gears pull harder. */
  private engineForce(throttle: number, top: number): number {
    if (this.shiftTimer > 0) return 0;
    const T = this.tuning;
    const n = (this.rpm - IDLE_RPM) / (REDLINE_RPM - IDLE_RPM);
    const torque = 0.65 + 0.45 * Math.sin(Math.PI * Math.min(1, n * 0.95 + 0.1));
    const gearPull = 1.35 - this.gear * 0.1;
    const gearTop = GEAR_TOPS[this.gear - 1] * top;
    if (this.v >= gearTop) return 0; // limiter
    return T.accel * throttle * torque * gearPull * Math.max(0.08, 1 - this.v / top);
  }

  private updateGearbox(dt: number, input: RoverInput, top: number): void {
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    const shift = (d: number): void => {
      const g = clamp(this.gear + d, 1, GEAR_TOPS.length);
      if (g === this.gear) return;
      this.gear = g;
      this.shiftTimer = d > 0 ? 0.16 : 0.08;
      this.events.onShift?.(g);
    };
    const gearTop = (g: number): number => GEAR_TOPS[g - 1] * top;
    if (this.gearbox === 'manual') {
      if (input.shiftUp) shift(1);
      if (input.shiftDown) shift(-1);
    } else if (this.shiftTimer <= 0) {
      const ratio = Math.abs(this.v) / gearTop(this.gear);
      if (ratio > 0.97 && input.throttle > 0.1) shift(1);
      else if (this.gear > 1 && Math.abs(this.v) < gearTop(this.gear - 1) * 0.72) shift(-1);
    }
    const target = IDLE_RPM + (REDLINE_RPM - IDLE_RPM) * clamp(Math.abs(this.v) / gearTop(this.gear), 0, 1.02);
    this.rpm = dampScalar(this.rpm, this.shiftTimer > 0 ? target * 0.85 : target, 14, dt);
  }

  /** Launch from a ramp panel. */
  launch(verticalSpeed: number): void {
    if (!this.grounded) return;
    this.vh = verticalSpeed;
    this.grounded = false;
    this.airTime = 0;
  }

  addBoost(amount: number): void {
    if (this.mods.noBoost) return;
    this.boostMeter = Math.min(1, this.boostMeter + amount);
  }

  /** Interpolated state for rendering between sim ticks. */
  lerpState(alpha: number): { s: number; x: number; h: number; yaw: number } {
    return {
      s: this.prevS + (this.s - this.prevS) * alpha,
      x: this.prevX + (this.x - this.prevX) * alpha,
      h: this.prevH + (this.h - this.prevH) * alpha,
      yaw: this.prevYaw + (this.yaw - this.prevYaw) * alpha,
    };
  }
}
