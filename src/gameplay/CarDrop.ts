/**
 * Calling your car: on foot anywhere in a town, your vehicle drops out of
 * the sky on a paper parachute, a few metres in front of you. The rules
 * (timing, where it may land) live here; Game.ts draws it.
 */

export const DROP = {
  /** Metres above the ground where it appears. */
  height: 45,
  /** Seconds from appearing to touching down. */
  seconds: 3.2,
  /** Seconds before you can call it again. */
  cooldown: 4,
  /** How far in front of you it lands. */
  ahead: 7,
};

export class CarDrop {
  x = 0;
  z = 0;
  heading = 0;
  t = 0;
  active = false;
  landedAt = -Infinity;

  start(x: number, z: number, heading: number): void {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.t = 0;
    this.active = true;
  }

  /** Advance; returns true on the step it touches down. */
  update(dt: number, now: number): boolean {
    if (!this.active) return false;
    this.t += dt;
    if (this.t >= DROP.seconds) {
      this.active = false;
      this.landedAt = now;
      return true;
    }
    return false;
  }

  /** Height above the ground now: fast at first, slowing as the chute fills. */
  get height(): number {
    if (!this.active) return 0;
    const k = Math.min(1, this.t / DROP.seconds);
    return DROP.height * Math.pow(1 - k, 1.6);
  }

  /** A gentle swing under the parachute (radians). */
  sway(time: number): number {
    return this.active ? Math.sin(time * 2.2) * 0.12 * (1 - this.t / DROP.seconds) : 0;
  }

  ready(now: number): boolean {
    return !this.active && now - this.landedAt >= DROP.cooldown;
  }
}

/** The point `ahead` metres in front of (x, z) facing `yaw` (forward = (−sin, −cos)). */
export function aheadOf(x: number, z: number, yaw: number, ahead = DROP.ahead): { x: number; z: number } {
  return { x: x - Math.sin(yaw) * ahead, z: z - Math.cos(yaw) * ahead };
}
