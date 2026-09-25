import { RoadPath, createFrame } from '../road/RoadPath';
import { walkableHalfWidth, KERB_HEIGHT } from '../road/RoadMesh';
import { clamp, wrapAngle } from '../core/MathUtil';
import type { HumanPose } from '../models/Human';

/** On-foot movement values (docs/05 §3.3). */
export const HUMAN_TUNING = {
  walk: 1.7,
  jog: 4.3,
  sprint: 7.2,
  accel: 30,
  decel: 40,
  airControl: 0.35,
  gravity: 20,
  jumpSpeed: 6.9,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
  turnRate: 12,
  radius: 0.35,
};

export interface HumanInput {
  /** Move axes relative to the camera: x = right, y = forward. */
  moveX: number;
  moveY: number;
  /** Camera yaw relative to the road tangent (radians, + toward road right). */
  cameraYaw: number;
  sprint: boolean;
  walk: boolean;
  jump: boolean;
  /** First person: body faces the camera instead of the movement. */
  faceCamera: boolean;
}

/**
 * The human on the ribbon. Same road-relative idea as the rover: position is
 * (s, x, h) and "up" is the road's up, so the character can walk up walls and
 * across ceilings (docs/05 §2–3). Velocity lives in the road's tangent plane.
 */
export class HumanController {
  s = 0;
  x = 0;
  h = 0;
  /** Velocity along the road tangent / right / up. */
  vT = 0;
  vR = 0;
  vh = 0;
  /** Facing, relative to the road tangent. */
  heading = 0;
  grounded = true;
  pose: HumanPose = 'idle';
  private coyote = 0;
  private jumpBuffered = 0;
  prevS = 0;
  prevX = 0;
  prevH = 0;
  prevHeading = 0;
  private readonly frame = createFrame();

  constructor(private readonly path: RoadPath) {}

  place(s: number, x: number, heading: number): void {
    this.s = this.prevS = s;
    this.x = this.prevX = x;
    this.h = this.prevH = this.groundAt(x);
    this.vT = this.vR = this.vh = 0;
    this.heading = this.prevHeading = heading;
    this.grounded = true;
  }

  get speed(): number {
    return Math.hypot(this.vT, this.vR);
  }

  private groundAt(x: number): number {
    const f = this.path.sample(this.s, this.frame);
    return Math.abs(x) > f.width / 2 ? KERB_HEIGHT : 0;
  }

  step(dt: number, input: HumanInput): void {
    const T = HUMAN_TUNING;
    this.prevS = this.s;
    this.prevX = this.x;
    this.prevH = this.h;
    this.prevHeading = this.heading;

    // Desired velocity from input, rotated by the camera yaw into the road plane.
    const len = Math.min(1, Math.hypot(input.moveX, input.moveY));
    const maxSpeed = input.walk ? T.walk : input.sprint ? T.sprint : T.jog;
    const cy = input.cameraYaw;
    const fwdT = Math.cos(cy);
    const fwdR = Math.sin(cy);
    const rightT = -Math.sin(cy);
    const rightR = Math.cos(cy);
    let dT = fwdT * input.moveY + rightT * input.moveX;
    let dR = fwdR * input.moveY + rightR * input.moveX;
    const dl = Math.hypot(dT, dR);
    if (dl > 0) {
      dT = (dT / dl) * len * maxSpeed;
      dR = (dR / dl) * len * maxSpeed;
    }

    const control = this.grounded ? 1 : T.airControl;
    const rate = (len > 0.05 ? T.accel : T.decel) * control * dt;
    this.vT = approach(this.vT, dT, rate);
    this.vR = approach(this.vR, dR, rate);

    this.s = clamp(this.s + this.vT * dt, 0.5, this.path.length - 0.5);
    this.x += this.vR * dt;
    const f = this.path.sample(this.s, this.frame);
    const limit = walkableHalfWidth(f.width, f.plaza) - T.radius;
    if (Math.abs(this.x) > limit) {
      this.x = Math.sign(this.x) * limit;
      this.vR = 0;
    }

    // Jumping with coyote time and a jump buffer.
    this.jumpBuffered = input.jump ? T.jumpBuffer : Math.max(0, this.jumpBuffered - dt);
    this.coyote = this.grounded ? T.coyoteTime : Math.max(0, this.coyote - dt);
    if (this.jumpBuffered > 0 && this.coyote > 0) {
      this.vh = T.jumpSpeed;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffered = 0;
    }

    const ground = this.groundAt(this.x);
    if (!this.grounded) {
      this.vh -= T.gravity * dt;
      this.h += this.vh * dt;
      if (this.h <= ground) {
        this.h = ground;
        this.vh = 0;
        this.grounded = true;
      }
    } else if (this.h < ground) {
      this.h = ground; // step up the kerb
    } else if (this.h > ground + 0.02) {
      this.grounded = false; // walked off the kerb
    }

    // Facing.
    const sp = this.speed;
    let targetHeading = this.heading;
    if (input.faceCamera) targetHeading = cy;
    else if (sp > 0.3) targetHeading = Math.atan2(this.vR, this.vT);
    const diff = wrapAngle(targetHeading - this.heading);
    this.heading = wrapAngle(this.heading + clamp(diff, -T.turnRate * dt, T.turnRate * dt));

    this.pose = !this.grounded ? 'air' : sp > 5.5 ? 'run' : sp > 0.4 ? 'walk' : 'idle';
  }

  lerpState(alpha: number): { s: number; x: number; h: number; heading: number } {
    return {
      s: this.prevS + (this.s - this.prevS) * alpha,
      x: this.prevX + (this.x - this.prevX) * alpha,
      h: this.prevH + (this.h - this.prevH) * alpha,
      heading: this.prevHeading + wrapAngle(this.heading - this.prevHeading) * alpha,
    };
  }
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(v + maxDelta, target);
  return Math.max(v - maxDelta, target);
}
