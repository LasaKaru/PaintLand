/**
 * The paper plane: a big folded-paper glider you ride over the free-roam
 * towns. It has no engine. Diving trades height for speed and pulling up
 * trades speed back for height. Warm air rising over a few spots (thermals)
 * lifts you, and a small "gust" meter (Shift) gives a push when you need one.
 *
 * Conventions match the free-roam car: +y is up, and heading 0 faces −z
 * (forward = (−sin h, 0, −cos h)), so a larger heading turns left.
 */
import { clamp } from '../core/MathUtil';

export interface GliderInput {
  /** −1 … 1: +1 pushes the nose down (dive), −1 pulls it up (climb). */
  pitch: number;
  /** −1 … 1: bank left / right. */
  roll: number;
  /** The gust (while the meter has charge). */
  gust: boolean;
}

/** Rising warm air: inside `r`, lifts at up to `lift` m/s (most at the middle). */
export interface Thermal {
  x: number;
  z: number;
  r: number;
  lift: number;
}

/** What the glider flies over: its bounds and obstacles, and the ground height at (x, z). */
export interface Airspace {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  resolve(p: { x: number; z: number }, radius: number): { nx: number; nz: number } | null;
  /** Ground height at (x, z), and whether it is water. */
  ground(x: number, z: number): { y: number; water: boolean };
  /** Below this height walls are in the way (default ROOF_HEIGHT; higher among towers). */
  roof?: number;
}

export type GliderEvent = 'bump' | 'edge' | 'stall' | 'landed' | 'crashed' | 'splash';

const G = 9.8;
const DRAG = 0.0035;
/** Below this the wings stop lifting and the nose drops. */
export const STALL_SPEED = 8;
export const MAX_SPEED = 42;
/** The highest you can climb (above the town; the relay accepts up to 80 m). */
export const CEILING = 75;
/** Below this, walls and roofs are in the way (the colliders have no heights). */
export const ROOF_HEIGHT = 8;
/** A touchdown slower than this (down, m/s), and not too fast, is a landing. */
export const SAFE_SINK = 4.5;
export const SAFE_SPEED = 22;
const GUST_THRUST = 11;
const GUST_DRAIN = 0.3;
const GUST_REFILL = 0.04;

export class Glider {
  x = 0;
  y = 0;
  z = 0;
  heading = 0;
  /** Radians; + is nose up. */
  pitch = 0;
  /** Radians; + is banked right. */
  roll = 0;
  speed = 16;
  /** Vertical speed last step (m/s, + up). */
  vy = 0;
  /** 0 … 1 */
  gust = 1;
  gusting = false;
  stalled = false;
  flying = false;
  airTime = 0;

  // Previous position (for passing through rings and smooth drawing).
  px = 0;
  py = 0;
  pz = 0;
  private prev = { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 };

  /** Start flying from (x, height, z), facing `heading`. */
  launch(x: number, y: number, z: number, heading: number, speed = 17): void {
    this.x = this.px = x;
    this.y = this.py = y;
    this.z = this.pz = z;
    this.heading = heading;
    this.pitch = -0.05;
    this.roll = 0;
    this.speed = speed;
    this.vy = 0;
    this.gust = 1;
    this.gusting = false;
    this.stalled = false;
    this.flying = true;
    this.airTime = 0;
    this.savePrev();
  }

  private savePrev(): void {
    const p = this.prev;
    p.x = this.x;
    p.y = this.y;
    p.z = this.z;
    p.heading = this.heading;
    p.pitch = this.pitch;
    p.roll = this.roll;
  }

  /** Pose between the last two steps, for drawing. */
  lerp(a: number): { x: number; y: number; z: number; heading: number; pitch: number; roll: number } {
    const p = this.prev;
    let dh = this.heading - p.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    return {
      x: p.x + (this.x - p.x) * a,
      y: p.y + (this.y - p.y) * a,
      z: p.z + (this.z - p.z) * a,
      heading: p.heading + dh * a,
      pitch: p.pitch + (this.pitch - p.pitch) * a,
      roll: p.roll + (this.roll - p.roll) * a,
    };
  }

  /** Height above whatever is below. */
  altitude(space: Airspace): number {
    return this.y - space.ground(this.x, this.z).y;
  }

  step(dt: number, input: GliderInput, space: Airspace, thermals: readonly Thermal[] = []): GliderEvent[] {
    const out: GliderEvent[] = [];
    if (!this.flying) return out;
    this.savePrev();
    this.px = this.x;
    this.py = this.y;
    this.pz = this.z;
    this.airTime += dt;

    // Bank toward the stick, then turn with the bank (a coordinated turn).
    const pitchIn = clamp(input.pitch, -1, 1);
    const rollIn = clamp(input.roll, -1, 1);
    this.roll += (rollIn * 0.85 - this.roll) * Math.min(1, dt * 3);
    this.heading -= ((G * Math.tan(this.roll)) / Math.max(this.speed, 9)) * dt;
    this.heading = Math.atan2(Math.sin(this.heading), Math.cos(this.heading));

    // Pitch: the stick moves the nose; let go and it settles to a gentle glide.
    if (pitchIn !== 0) this.pitch -= pitchIn * 1.1 * dt;
    else this.pitch += (-0.07 - this.pitch) * Math.min(1, dt * 0.8);
    const wasStalled = this.stalled;
    this.stalled = this.speed < STALL_SPEED;
    if (this.stalled) {
      // Too slow: the nose drops until there's speed again.
      this.pitch -= (1.4 + (STALL_SPEED - this.speed) * 0.2) * dt;
      if (!wasStalled) out.push('stall');
    }
    this.pitch = clamp(this.pitch, -0.95, 0.65);

    // Speed: gravity along the path, drag, and the gust.
    this.gusting = input.gust && this.gust > 0.02;
    let accel = -G * Math.sin(this.pitch) - DRAG * this.speed * this.speed;
    if (this.gusting) {
      accel += GUST_THRUST;
      this.gust = Math.max(0, this.gust - GUST_DRAIN * dt);
    } else this.gust = Math.min(1, this.gust + GUST_REFILL * dt);
    this.speed = clamp(this.speed + accel * dt, 3, MAX_SPEED);

    // Move along the nose, plus rising air, minus sinking when stalled.
    let vy = this.speed * Math.sin(this.pitch);
    for (const t of thermals) {
      const d = Math.hypot(this.x - t.x, this.z - t.z);
      if (d < t.r) vy += t.lift * (1 - (d / t.r) ** 2);
    }
    if (this.stalled) vy -= (STALL_SPEED - this.speed) * 0.9;
    const flat = this.speed * Math.cos(this.pitch);
    this.x += -Math.sin(this.heading) * flat * dt;
    this.z += -Math.cos(this.heading) * flat * dt;
    this.y += vy * dt;
    this.vy = vy;

    // A soft ceiling: the air gets thin and the nose goes down.
    const g0 = space.ground(this.x, this.z).y;
    if (this.y > g0 + CEILING) {
      this.y = g0 + CEILING;
      this.vy = Math.min(0, this.vy);
      this.pitch = Math.min(this.pitch, -0.1);
    }

    // The edge of the map turns you back toward the middle.
    const b = space.bounds;
    const m = 8;
    if (this.x < b.minX + m || this.x > b.maxX - m || this.z < b.minZ + m || this.z > b.maxZ - m) {
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const want = Math.atan2(-(cx - this.x), -(cz - this.z));
      const dh = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
      this.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
      this.x = clamp(this.x, b.minX + 2, b.maxX - 2);
      this.z = clamp(this.z, b.minZ + 2, b.maxZ - 2);
      out.push('edge');
    }

    // Low down, walls and roofs are in the way.
    const ground = space.ground(this.x, this.z);
    if (this.y - ground.y < (space.roof ?? ROOF_HEIGHT)) {
      const hit = space.resolve(this, 1.4);
      if (hit) {
        this.speed *= 0.55;
        // Glance off: turn along the wall.
        const along = Math.atan2(-hit.nx, -hit.nz);
        const dh = Math.atan2(Math.sin(along - this.heading), Math.cos(along - this.heading));
        this.heading += dh * 0.5;
        out.push('bump');
      }
    }

    // Touchdown.
    if (this.y <= ground.y + 0.4) {
      this.y = ground.y + 0.4;
      this.flying = false;
      if (ground.water) out.push('splash');
      else if (-this.vy <= SAFE_SINK && this.speed <= SAFE_SPEED) out.push('landed');
      else out.push('crashed');
    }
    return out;
  }
}

/** A ring to fly through. It faces `heading` (the way you should fly). */
export interface Ring {
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Inner radius. */
  r: number;
}

/** A flight course for an area: rings in order and a few thermals. */
export interface Course {
  rings: Ring[];
  thermals: Thermal[];
}

const COURSE_RINGS = 10;

/**
 * The ring course over an area: a loop around the middle, rising and falling,
 * starting near the launch spot. The same area always gets the same course.
 */
export function makeCourse(bounds: Airspace['bounds'], start: { x: number; z: number }, seed = 0, base = 22): Course {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const rx = (bounds.maxX - bounds.minX) * 0.32;
  const rz = (bounds.maxZ - bounds.minZ) * 0.32;
  // Begin the loop at the angle closest to the launch spot.
  const a0 = Math.atan2((start.z - cz) / rz, (start.x - cx) / rx);
  const rings: Ring[] = [];
  for (let i = 0; i < COURSE_RINGS; i++) {
    const a = a0 + ((i + 1) / COURSE_RINGS) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx;
    const z = cz + Math.sin(a) * rz;
    // Tangent of the ellipse, as a heading (forward = (−sin h, −cos h)).
    const tx = -Math.sin(a) * rx;
    const tz = Math.cos(a) * rz;
    const heading = Math.atan2(-tx, -tz);
    const y = Math.max(14, base + Math.sin(i * 1.3 + seed) * 9);
    rings.push({ x, y, z, heading, r: 5.5 });
  }
  // Thermals between some rings, so a slow pilot can climb back up.
  const thermals: Thermal[] = [];
  for (const i of [2, 5, 8]) {
    const a = rings[i];
    const b = rings[i - 1];
    thermals.push({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, r: 14, lift: 7 });
  }
  thermals.push({ x: cx, z: cz, r: 18, lift: 6 });
  return { rings, thermals };
}

/**
 * Did the line from p0 to p1 pass through the ring (crossing its plane inside
 * the radius)? Crossing in either direction counts.
 */
export function throughRing(ring: Ring, p0: { x: number; y: number; z: number }, p1: { x: number; y: number; z: number }): boolean {
  const nx = -Math.sin(ring.heading);
  const nz = -Math.cos(ring.heading);
  const d0 = (p0.x - ring.x) * nx + (p0.z - ring.z) * nz;
  const d1 = (p1.x - ring.x) * nx + (p1.z - ring.z) * nz;
  if (d0 === d1 || Math.sign(d0) === Math.sign(d1)) return false;
  const t = d0 / (d0 - d1);
  const x = p0.x + (p1.x - p0.x) * t;
  const y = p0.y + (p1.y - p0.y) * t;
  const z = p0.z + (p1.z - p0.z) * t;
  return Math.hypot(x - ring.x, y - ring.y, z - ring.z) <= ring.r;
}

export type CourseEvent = { kind: 'ring'; index: number } | { kind: 'finish'; time: number };

/** Progress through a course: rings must be flown in order. */
export class CourseRun {
  next = 0;
  time = 0;
  running = false;
  finished = false;
  constructor(readonly course: Course) {}

  /** Call after each glider step. The clock starts at the first ring. */
  update(dt: number, g: Glider): CourseEvent[] {
    const out: CourseEvent[] = [];
    if (this.finished) return out;
    if (this.running) this.time += dt;
    const ring = this.course.rings[this.next];
    if (ring && throughRing(ring, { x: g.px, y: g.py, z: g.pz }, g)) {
      if (this.next === 0) this.running = true;
      out.push({ kind: 'ring', index: this.next });
      this.next++;
      if (this.next >= this.course.rings.length) {
        this.finished = true;
        this.running = false;
        out.push({ kind: 'finish', time: this.time });
      }
    }
    return out;
  }
}

/** Ink for finishing a course: more the first time, a little for a new best. */
export function courseInk(first: boolean, newBest: boolean): number {
  return first ? 150 : newBest ? 50 : 15;
}
