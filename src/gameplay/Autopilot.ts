import type { RoverController, RoverInput } from './RoverController';
import type { Note } from './Collectibles';
import { clamp } from '../core/MathUtil';

export interface AutopilotOptions {
  /** Target speed in m/s. */
  speed: number;
  /** Preferred lateral position when not chasing notes. */
  lane: number;
  /** Steer through the note line (demo driving) instead of holding a lane. */
  followNotes: boolean;
  /** Hop now and then for style (menu cinematic). */
  showOff: boolean;
}

/**
 * A simple driver for the menu cinematic, AI traffic and race rivals.
 * It looks a little way down the road, steers toward the next note (or its lane)
 * and holds a target speed.
 */
export class Autopilot {
  private hopTimer = 3;
  private weave = Math.random() * 10;

  constructor(public options: AutopilotOptions) {}

  drive(ctrl: RoverController, notes: readonly Note[], dt: number, obstacles: { s: number; x: number }[] = []): RoverInput {
    const o = this.options;
    this.weave += dt;
    let targetX = o.lane + Math.sin(this.weave * 0.35) * 0.8;
    if (o.followNotes) {
      const next = nextNote(notes, ctrl.s + 4);
      if (next && next.s - ctrl.s < 45) targetX = next.x;
    }
    // Swerve around anything just ahead in our lane.
    for (const ob of obstacles) {
      const ds = ob.s - ctrl.s;
      if (ds > 0 && ds < 18 && Math.abs(ob.x - targetX) < 2.6) targetX = ob.x > 0 ? ob.x - 3.2 : ob.x + 3.2;
    }
    const steer = clamp((targetX - ctrl.x) * 0.35 - ctrl.vx * 0.12, -1, 1);
    const throttle = ctrl.v < o.speed ? 1 : 0;
    const brake = ctrl.v > o.speed + 6 ? 0.4 : 0;
    let hop = false;
    if (o.showOff) {
      this.hopTimer -= dt;
      if (this.hopTimer <= 0) {
        hop = true;
        this.hopTimer = 4 + Math.random() * 6;
      }
    }
    return { throttle, brake, steer, hop, boost: o.showOff && ctrl.boostMeter > 0.8, drift: false };
  }
}

/** First uncollected note at or after distance s (notes are sorted by s). */
export function nextNote(notes: readonly Note[], s: number): Note | undefined {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (notes[mid].s < s) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < notes.length; i++) if (!notes[i].collected) return notes[i];
  return undefined;
}
