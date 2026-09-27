/**
 * Keeping the game running: small, testable pieces that Game.ts uses to
 * survive errors and bad states instead of freezing or crashing.
 *
 * - FrameGuard: an error in one frame skips that frame; errors that keep
 *   coming trigger a safe recovery (the player is put back somewhere safe);
 *   if even that doesn't help, the game stops drawing and offers a way out.
 * - SafePoint: remembers the last good position, to go back to if physics
 *   ever produces NaN or throws the player out of the world.
 * - StuckWatch: notices a player pushing against something without moving,
 *   first with a hint, then by lifting them free.
 * - freeSpot: the nearest open ground around a point.
 */

export type FrameAction = 'skip' | 'recover' | 'halt';

export class FrameGuard {
  private errors: number[] = [];
  private recoveredAt = -Infinity;
  halted = false;

  constructor(
    /** Seconds over which errors are counted. */
    readonly window = 3,
    /** This many errors within the window → safe recovery. */
    readonly recoverAfter = 3,
    /** This many errors within the window after a recovery → halt. */
    readonly haltAfter = 3,
  ) {}

  /** An error in a frame at `now` (seconds). What should happen? */
  fail(now: number): FrameAction {
    this.errors = this.errors.filter((t) => now - t < this.window);
    this.errors.push(now);
    const sinceRecovery = this.errors.filter((t) => t > this.recoveredAt).length;
    if (now - this.recoveredAt < this.window * 2 && sinceRecovery >= this.haltAfter) {
      this.halted = true;
      return 'halt';
    }
    if (this.errors.length >= this.recoverAfter) {
      this.recoveredAt = now;
      this.errors = [];
      return 'recover';
    }
    return 'skip';
  }

  /** Start again after the player chose "try again". */
  reset(): void {
    this.errors = [];
    this.recoveredAt = -Infinity;
    this.halted = false;
  }
}

/** Every value is a finite number. */
export function finite(...values: number[]): boolean {
  for (const v of values) if (!Number.isFinite(v)) return false;
  return true;
}

export interface Spot {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** The last known good position (sampled once a second). */
export class SafePoint {
  private spot: Spot | null = null;
  private timer = 0;

  /** Offer the current position; it is kept if it is sane and the player is grounded. */
  update(dt: number, p: Spot, ok: boolean): void {
    this.timer -= dt;
    if (this.timer > 0 || !ok || !finite(p.x, p.y, p.z, p.heading)) return;
    this.timer = 1;
    this.spot = { ...p };
  }

  get last(): Spot | null {
    return this.spot;
  }

  clear(): void {
    this.spot = null;
    this.timer = 0;
  }
}

export type StuckState = 'ok' | 'hint' | 'free';

/**
 * Pushing to move but going nowhere: after `hintAfter` seconds a hint, after
 * `freeAfter` seconds the game frees the player. Moving on resets it.
 */
export class StuckWatch {
  private ax = 0;
  private az = 0;
  private time = 0;
  private hinted = false;

  constructor(
    readonly hintAfter = 4,
    readonly freeAfter = 9,
    /** Metres that count as "moved". */
    readonly radius = 1.2,
  ) {}

  update(dt: number, x: number, z: number, wantsToMove: boolean): StuckState {
    if (!wantsToMove || Math.hypot(x - this.ax, z - this.az) > this.radius) {
      this.ax = x;
      this.az = z;
      this.time = 0;
      this.hinted = false;
      return 'ok';
    }
    this.time += dt;
    if (this.time >= this.freeAfter) {
      this.time = 0;
      this.hinted = false;
      return 'free';
    }
    if (this.time >= this.hintAfter && !this.hinted) {
      this.hinted = true;
      return 'hint';
    }
    return 'ok';
  }

  reset(x = 0, z = 0): void {
    this.ax = x;
    this.az = z;
    this.time = 0;
    this.hinted = false;
  }
}

/**
 * The nearest open spot to (x, z) for something of radius `r`: rings of
 * candidates further and further out. `isFree` says whether a point is clear.
 */
export function freeSpot(x: number, z: number, isFree: (x: number, z: number) => boolean, maxDistance = 40, step = 2): { x: number; z: number } | null {
  if (isFree(x, z)) return { x, z };
  for (let d = step; d <= maxDistance; d += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * d) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      if (isFree(px, pz)) return { x: px, z: pz };
    }
  }
  return null;
}
